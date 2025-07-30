#!/usr/bin/env python3
"""
Test Google Gemini 2.0 Flash integration with AI Booking Intelligence
"""

import asyncio
import sys
import os
from datetime import datetime, timedelta

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.ai_booking_intelligence import AIBookingIntelligence

async def test_gemini_integration():
    """Test Gemini 2.0 Flash integration"""
    print("🔮 Testing Google Gemini 2.0 Flash Integration...")
    
    # Initialize AI service
    ai_service = AIBookingIntelligence()
    
    # Check if Gemini client is available
    if not ai_service.gemini_client:
        print("⚠️ Gemini client not available (GOOGLE_AI_API_KEY not set)")
        print("💡 To test Gemini integration, set GOOGLE_AI_API_KEY environment variable")
        return
    
    print("✅ Gemini 2.0 Flash client initialized successfully")
    
    # Sample customer data for testing
    customer_id = "test_customer_gemini"
    sample_booking_history = [
        {
            'customer_id': customer_id,
            'service_name': 'Classic Haircut',
            'barber_name': 'Mike',
            'scheduled_at': (datetime.now() - timedelta(days=21)).isoformat(),
            'price': 25.0,
            'duration_minutes': 30
        },
        {
            'customer_id': customer_id,
            'service_name': 'Beard Trim',
            'barber_name': 'Mike',
            'scheduled_at': (datetime.now() - timedelta(days=42)).isoformat(),
            'price': 15.0,
            'duration_minutes': 15
        },
        {
            'customer_id': customer_id,
            'service_name': 'Classic Haircut',
            'barber_name': 'Sarah',
            'scheduled_at': (datetime.now() - timedelta(days=63)).isoformat(),
            'price': 25.0,
            'duration_minutes': 30
        }
    ]
    
    print(f"📊 Testing with {len(sample_booking_history)} sample bookings...")
    
    try:
        # Test AI recommendations
        print("\n🎯 Testing Gemini AI Recommendations...")
        recommendations = await ai_service.generate_smart_recommendations(
            customer_id=customer_id,
            booking_history=sample_booking_history
        )
        
        print(f"✅ Generated {len(recommendations)} recommendations:")
        for i, rec in enumerate(recommendations, 1):
            print(f"  {i}. {rec.title}")
            print(f"     Type: {rec.recommendation_type}")
            print(f"     Confidence: {rec.confidence_score:.2f}")
            print(f"     Model: {rec.ai_model_used}")
            print(f"     Reasoning: {rec.reasoning[:100]}...")
            print()
        
        # Test behavior analysis
        print("🧠 Testing Gemini Behavior Analysis...")
        insights = await ai_service.analyze_customer_behavior(
            customer_id=customer_id,
            booking_history=sample_booking_history
        )
        
        print(f"✅ Generated {len(insights)} behavioral insights:")
        for i, insight in enumerate(insights, 1):
            print(f"  {i}. {insight.insight_type}: {insight.insight_text[:80]}...")
            print(f"     Confidence: {insight.confidence_score:.2f}")
            print(f"     Model: {insight.ai_model_used}")
            print(f"     Actions: {len(insight.actionable_recommendations)} recommendations")
            print()
        
        print("🎉 Gemini 2.0 Flash integration test completed successfully!")
        
        # Performance comparison
        print("\n📈 Model Comparison:")
        print("• Gemini 2.0 Flash: Fastest, most cost-effective, excellent reasoning")
        print("• Claude 3 Sonnet: Best for complex reasoning, higher cost")  
        print("• GPT-4: Good balance, moderate cost")
        print("• Priority order: Gemini → Claude → GPT-4 → Fallback")
        
    except Exception as e:
        print(f"❌ Error during testing: {e}")
        print("💡 Make sure GOOGLE_AI_API_KEY is set correctly")

if __name__ == "__main__":
    asyncio.run(test_gemini_integration())