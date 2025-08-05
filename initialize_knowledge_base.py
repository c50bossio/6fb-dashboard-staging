#!/usr/bin/env python3
"""
Initialize the Enhanced Knowledge Base System
"""

import asyncio
import json
import sqlite3
import os
from datetime import datetime

async def initialize_knowledge_database():
    """Initialize the enhanced knowledge database"""
    print("🚀 Initializing Enhanced Knowledge Database...")
    
    try:
        # Create data directory
        os.makedirs("./data", exist_ok=True)
        
        # Connect to database
        conn = sqlite3.connect("./data/enhanced_knowledge.db")
        cursor = conn.cursor()
        
        # Create enhanced_business_knowledge table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS enhanced_business_knowledge (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                summary TEXT NOT NULL,
                domain TEXT NOT NULL,
                knowledge_type TEXT NOT NULL,
                source TEXT NOT NULL,
                confidence_score REAL,
                relevance_tags TEXT,
                business_metrics TEXT,
                last_verified TEXT,
                usage_count INTEGER DEFAULT 0,
                effectiveness_score REAL,
                metadata TEXT,
                created_at TEXT,
                updated_at TEXT
            )
        """)
        
        print("✅ Database table created successfully")
        
        # Populate with default knowledge
        default_knowledge = [
            {
                'id': 'barbershop_operations_20250805_001',
                'title': 'Optimal Barbershop Scheduling Patterns',
                'content': 'Peak hours are typically Tuesday-Saturday 10am-6pm. Monday mornings and Sunday evenings show lowest demand. Implementing 15-minute buffers between appointments reduces delays. Online booking reduces no-shows by 25%. Staff productivity increases by 18% with proper scheduling optimization.',
                'summary': 'Scheduling optimization strategies for barbershops with proven metrics',
                'domain': 'barbershop_operations',
                'knowledge_type': 'scheduling_analytics',
                'source': 'industry_research',
                'confidence_score': 0.85,
                'relevance_tags': ['scheduling', 'appointments', 'optimization', 'no-shows', 'productivity'],
                'business_metrics': {
                    'no_show_reduction': 25,
                    'efficiency_gain': 15,
                    'productivity_increase': 18
                }
            },
            {
                'id': 'customer_experience_20250805_002',
                'title': 'Customer Retention Strategies for Barbershops',
                'content': 'Loyalty programs increase repeat visits by 30%. Personal barber assignments improve satisfaction by 40%. Follow-up texts 48 hours after service boost rebooking by 22%. Quality consistency is the top retention factor. Customer satisfaction scores improve by 35% with personalized service.',
                'summary': 'Proven strategies for improving customer retention and satisfaction',
                'domain': 'customer_experience',
                'knowledge_type': 'customer_insights',
                'source': 'best_practices',
                'confidence_score': 0.90,
                'relevance_tags': ['retention', 'loyalty', 'customer_satisfaction', 'rebooking', 'personalized_service'],
                'business_metrics': {
                    'retention_improvement': 30,
                    'satisfaction_increase': 40,
                    'rebooking_rate': 22,
                    'satisfaction_score_improvement': 35
                }
            },
            {
                'id': 'revenue_optimization_20250805_003',
                'title': 'Premium Service Revenue Impact',
                'content': 'Premium services (beard treatments, styling consultations) have 60% higher margins. Upselling increases average ticket by $15-25. Training staff on consultative selling improves upsell rates by 45%. Premium service adoption increases customer lifetime value by 40%.',
                'summary': 'Revenue optimization through premium services and strategic upselling',
                'domain': 'revenue_optimization',
                'knowledge_type': 'revenue_patterns',
                'source': 'industry_research',
                'confidence_score': 0.88,
                'relevance_tags': ['premium_services', 'upselling', 'revenue', 'margins', 'consultative_selling'],
                'business_metrics': {
                    'margin_increase': 60,
                    'ticket_increase': 20,
                    'upsell_improvement': 45,
                    'lifetime_value_increase': 40
                }
            },
            {
                'id': 'marketing_strategies_20250805_004',
                'title': 'Social Media Marketing for Barbershops',
                'content': 'Instagram posts with before/after photos get 3x more engagement. Stories with polls and questions increase follower interaction by 55%. Consistent posting (3-4 times weekly) grows following by 25% monthly. Video content (cutting tutorials) increases reach by 80%.',
                'summary': 'Effective social media strategies for barbershop marketing',
                'domain': 'marketing_strategies',
                'knowledge_type': 'marketing_effectiveness',
                'source': 'best_practices',
                'confidence_score': 0.82,
                'relevance_tags': ['social_media', 'instagram', 'engagement', 'content', 'video_marketing'],
                'business_metrics': {
                    'engagement_increase': 300,
                    'follower_growth': 25,
                    'interaction_improvement': 55,
                    'reach_increase': 80
                }
            },
            {
                'id': 'staff_management_20250805_005',
                'title': 'Staff Productivity Optimization',
                'content': 'Cross-training barbers in multiple services increases flexibility by 35%. Performance incentives tied to customer satisfaction improve service quality by 28%. Regular skill workshops maintain cutting-edge techniques. Team communication tools improve coordination by 42%.',
                'summary': 'Strategies for maximizing staff productivity and satisfaction',
                'domain': 'staff_management',
                'knowledge_type': 'operational_best_practices',
                'source': 'expert_insights',
                'confidence_score': 0.87,
                'relevance_tags': ['staff_training', 'productivity', 'incentives', 'flexibility', 'team_communication'],
                'business_metrics': {
                    'flexibility_increase': 35,
                    'quality_improvement': 28,
                    'coordination_improvement': 42,
                    'skill_retention': 95
                }
            },
            {
                'id': 'customer_experience_20250805_006',
                'title': 'Digital Customer Experience Enhancement',
                'content': 'Mobile booking apps increase customer convenience and reduce phone calls by 70%. Automated appointment reminders reduce no-shows by 45%. Digital payment options improve checkout efficiency by 60%. Customer feedback collection via SMS increases response rates by 80%.',
                'summary': 'Digital solutions for enhanced customer experience',
                'domain': 'customer_experience',
                'knowledge_type': 'technology_integration',
                'source': 'system_analytics',
                'confidence_score': 0.91,
                'relevance_tags': ['mobile_booking', 'automation', 'digital_payments', 'customer_feedback', 'efficiency'],
                'business_metrics': {
                    'phone_call_reduction': 70,
                    'no_show_reduction': 45,
                    'checkout_efficiency': 60,
                    'feedback_response_rate': 80
                }
            },
            {
                'id': 'revenue_optimization_20250805_007',
                'title': 'Dynamic Pricing Strategies',
                'content': 'Peak hour pricing (10am-2pm, 5pm-7pm) can increase revenue by 15-20%. Off-peak discounts encourage bookings during slower periods. Package deals (3 cuts + beard trim) increase customer commitment by 50%. Seasonal promotions drive 30% revenue growth during slow months.',
                'summary': 'Strategic pricing approaches for revenue optimization',
                'domain': 'revenue_optimization',
                'knowledge_type': 'pricing_strategies',
                'source': 'industry_research',
                'confidence_score': 0.86,
                'relevance_tags': ['dynamic_pricing', 'peak_hours', 'package_deals', 'seasonal_promotions', 'revenue_growth'],
                'business_metrics': {
                    'peak_hour_revenue_increase': 18,
                    'package_commitment_increase': 50,
                    'seasonal_revenue_growth': 30,
                    'overall_revenue_improvement': 25
                }
            },
            {
                'id': 'marketing_strategies_20250805_008',
                'title': 'Local SEO and Online Presence',
                'content': 'Google My Business optimization increases local search visibility by 65%. Customer reviews boost credibility and attract 40% more bookings. Local directory listings improve online presence. Consistent NAP (Name, Address, Phone) across platforms increases search rankings by 25%.',
                'summary': 'Local SEO strategies for barbershop visibility',
                'domain': 'marketing_strategies',
                'knowledge_type': 'digital_marketing',
                'source': 'best_practices',
                'confidence_score': 0.84,
                'relevance_tags': ['local_seo', 'google_business', 'customer_reviews', 'online_presence', 'search_rankings'],
                'business_metrics': {
                    'search_visibility_increase': 65,
                    'booking_increase_from_reviews': 40,
                    'search_ranking_improvement': 25,
                    'online_inquiry_increase': 50
                }
            }
        ]
        
        # Insert default knowledge
        for knowledge in default_knowledge:
            current_time = datetime.now().isoformat()
            
            cursor.execute("""
                INSERT OR REPLACE INTO enhanced_business_knowledge 
                (id, title, content, summary, domain, knowledge_type, source, 
                 confidence_score, relevance_tags, business_metrics, last_verified,
                 usage_count, effectiveness_score, metadata, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                knowledge['id'],
                knowledge['title'],
                knowledge['content'],
                knowledge['summary'],
                knowledge['domain'],
                knowledge['knowledge_type'],
                knowledge['source'],
                knowledge['confidence_score'],
                json.dumps(knowledge['relevance_tags']),
                json.dumps(knowledge['business_metrics']),
                current_time,
                0,  # usage_count
                knowledge['confidence_score'],  # effectiveness_score
                json.dumps({}),  # metadata
                current_time,  # created_at
                current_time   # updated_at
            ))
        
        conn.commit()
        
        # Verify data insertion
        cursor.execute("SELECT COUNT(*) FROM enhanced_business_knowledge")
        count = cursor.fetchone()[0]
        print(f"✅ Inserted {count} knowledge documents")
        
        # Show domain distribution
        cursor.execute("SELECT domain, COUNT(*) FROM enhanced_business_knowledge GROUP BY domain")
        domain_counts = cursor.fetchall()
        print("📊 Domain distribution:")
        for domain, count in domain_counts:
            print(f"   - {domain.replace('_', ' ').title()}: {count} documents")
        
        conn.close()
        print("✅ Knowledge database initialization complete!")
        
    except Exception as e:
        print(f"❌ Database initialization failed: {e}")
        raise

async def test_knowledge_retrieval():
    """Test knowledge retrieval functionality"""
    print("\n🔍 Testing Knowledge Retrieval...")
    
    try:
        # Test database connection
        conn = sqlite3.connect("./data/enhanced_knowledge.db")
        cursor = conn.cursor()
        
        # Test queries
        test_queries = [
            ("pricing", "revenue_optimization"),
            ("customer", "customer_experience"),
            ("social media", "marketing_strategies"),
            ("scheduling", "barbershop_operations"),
            ("staff", "staff_management")
        ]
        
        for keyword, expected_domain in test_queries:
            cursor.execute("""
                SELECT title, domain, confidence_score 
                FROM enhanced_business_knowledge 
                WHERE content LIKE ? OR title LIKE ? OR relevance_tags LIKE ?
                ORDER BY confidence_score DESC
                LIMIT 2
            """, (f'%{keyword}%', f'%{keyword}%', f'%{keyword}%'))
            
            results = cursor.fetchall()
            if results:
                print(f"✅ Query '{keyword}' found {len(results)} results:")
                for title, domain, confidence in results:
                    print(f"   - {title} ({domain}, {confidence:.2f})")
            else:
                print(f"⚠️  Query '{keyword}' found no results")
        
        conn.close()
        
    except Exception as e:
        print(f"❌ Knowledge retrieval test failed: {e}")

async def main():
    """Main initialization process"""
    print("🎯 Enhanced RAG Knowledge Base Initialization")
    print("=" * 50)
    
    await initialize_knowledge_database()
    await test_knowledge_retrieval()
    
    print("\n" + "=" * 50)
    print("🎉 Knowledge Base Ready for Testing!")
    print("\n💡 Next Steps:")
    print("   1. Visit http://localhost:9999/knowledge-base")
    print("   2. Test search functionality with queries like:")
    print("      - 'pricing strategy'")
    print("      - 'customer retention'")
    print("      - 'social media marketing'")
    print("      - 'staff productivity'") 
    print("   3. Explore domain filtering and document details")
    print("   4. Check business metrics and recommendations")

if __name__ == "__main__":
    asyncio.run(main())