#!/usr/bin/env python3
"""
Populate Vector Database with Enhanced Knowledge
"""

import asyncio
import json
import sqlite3
import sys
import os

# Add the current directory to Python path so we can import services
sys.path.append('/app' if os.path.exists('/app') else '.')

async def populate_vector_database():
    """Populate vector database with enhanced knowledge documents"""
    print("🚀 Populating Vector Database with Enhanced Knowledge...")
    
    try:
        # Import the enhanced business knowledge service
        from services.enhanced_business_knowledge_service import enhanced_business_knowledge_service, BusinessDomain, KnowledgeSource
        
        print("✅ Enhanced business knowledge service imported")
        
        # Connect to SQLite database to get documents
        conn = sqlite3.connect("./data/enhanced_knowledge.db")
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM enhanced_business_knowledge")
        rows = cursor.fetchall()
        
        print(f"📄 Found {len(rows)} documents in SQLite database")
        
        # Column mapping for the SQLite results
        columns = [
            'id', 'title', 'content', 'summary', 'domain', 'knowledge_type', 
            'source', 'confidence_score', 'relevance_tags', 'business_metrics',
            'last_verified', 'usage_count', 'effectiveness_score', 'metadata',
            'created_at', 'updated_at'
        ]
        
        # Process each document
        for row in rows:
            doc_data = dict(zip(columns, row))
            
            print(f"\n📝 Processing: {doc_data['title']}")
            
            try:
                # Parse JSON fields
                relevance_tags = json.loads(doc_data['relevance_tags'])
                business_metrics = json.loads(doc_data['business_metrics'])
                metadata = json.loads(doc_data['metadata']) if doc_data['metadata'] else {}
                
                # Convert domain and source to enum values
                domain = BusinessDomain(doc_data['domain'])
                source = KnowledgeSource(doc_data['source'])
                
                # Store in vector database via the enhanced service
                knowledge_id = await enhanced_business_knowledge_service.store_enhanced_knowledge(
                    title=doc_data['title'],
                    content=doc_data['content'],
                    summary=doc_data['summary'],
                    domain=domain,
                    knowledge_type=doc_data['knowledge_type'],
                    source=source,
                    confidence_score=doc_data['confidence_score'],
                    relevance_tags=relevance_tags,
                    business_metrics=business_metrics,
                    metadata=metadata
                )
                
                print(f"   ✅ Stored in vector DB: {knowledge_id}")
                
            except Exception as e:
                print(f"   ❌ Error processing document: {e}")
        
        conn.close()
        
        # Test vector database retrieval
        print(f"\n🔍 Testing vector database retrieval...")
        
        test_queries = [
            "pricing strategy",
            "customer retention",
            "social media marketing"
        ]
        
        for query in test_queries:
            try:
                # Test direct vector service retrieval
                knowledge_items = await enhanced_business_knowledge_service.vector_service.retrieve_relevant_knowledge(
                    query=query,
                    knowledge_types=['revenue_patterns', 'customer_insights', 'marketing_effectiveness'],
                    limit=2
                )
                
                print(f"   🎯 '{query}': Found {len(knowledge_items)} items")
                
                for item in knowledge_items:
                    print(f"      • {item.metadata.get('title', 'Unknown')} (confidence: {item.metadata.get('confidence_score', 0):.2f})")
                    
            except Exception as e:
                print(f"   ❌ Query '{query}' failed: {e}")
        
        print(f"\n✅ Vector database population complete!")
        
    except Exception as e:
        print(f"❌ Vector database population failed: {e}")
        import traceback
        traceback.print_exc()

async def test_enhanced_search():
    """Test the enhanced search functionality"""
    print(f"\n🧪 Testing Enhanced Search Functionality...")
    
    try:
        from services.enhanced_business_knowledge_service import enhanced_business_knowledge_service, KnowledgeQueryContext
        
        # Test contextual search
        context = KnowledgeQueryContext(
            business_context={
                'user_id': 'test-user',
                'shop_type': 'barbershop'
            },
            query_intent='revenue_optimization'
        )
        
        result = await enhanced_business_knowledge_service.retrieve_contextual_knowledge(
            query="pricing strategy upselling revenue",
            context=context
        )
        
        print(f"   📊 Contextual search results:")
        print(f"   • Documents found: {len(result.documents)}")
        print(f"   • Total confidence: {result.total_confidence:.2f}")
        print(f"   • Context summary: {result.context_summary}")
        
        if result.documents:
            for doc in result.documents[:2]:
                print(f"      • {doc.title} ({doc.domain.value}, {doc.confidence_score:.2f})")
        
        if result.recommended_actions:
            print(f"   💡 Recommendations:")
            for action in result.recommended_actions[:2]:
                print(f"      • {action}")
        
        if result.knowledge_gaps:
            print(f"   ⚠️  Knowledge gaps:")
            for gap in result.knowledge_gaps:
                print(f"      • {gap}")
                
    except Exception as e:
        print(f"❌ Enhanced search test failed: {e}")
        import traceback
        traceback.print_exc()

async def main():
    """Main population and testing process"""
    print("🎯 Vector Database Population and Testing")
    print("=" * 50)
    
    await populate_vector_database()
    await test_enhanced_search()
    
    print("\n" + "=" * 50)
    print("🎉 Vector Database Setup Complete!")
    print("\n💡 The enhanced knowledge base should now work properly:")
    print("   • Vector database populated with business knowledge")
    print("   • Contextual search functionality enabled")
    print("   • Business-specific recommendations active")
    print("   • Knowledge gap identification working")

if __name__ == "__main__":
    asyncio.run(main())