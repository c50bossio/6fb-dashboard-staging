#!/usr/bin/env python3
"""
Simple Knowledge Base Population for 6FB AI Agent System
Creates essential barbershop business knowledge
"""

import asyncio
import sys

# Add current directory to path for imports
sys.path.append('.')

from services.vector_knowledge_service import VectorKnowledgeService, KnowledgeDocument, BusinessKnowledgeType

async def populate_essential_knowledge():
    """Populate essential barbershop business knowledge"""
    print("🚀 Populating Essential 6FB Barbershop Knowledge Base...")
    
    service = VectorKnowledgeService()
    documents_added = 0
    
    # Essential knowledge documents
    knowledge_docs = [
        {
            "title": "Daily Barbershop Operations",
            "content": "Daily barbershop operations require systematic approach to ensure smooth service delivery. Start by opening 30 minutes early to prepare equipment and workstations. Sanitize all tools and equipment between clients. Maintain appointment schedules and handle walk-ins efficiently. Keep detailed records of services and payments. End day with proper cleaning and equipment storage.",
            "type": BusinessKnowledgeType.BARBERSHOP_OPERATIONS
        },
        {
            "title": "Customer Service Excellence",
            "content": "Provide exceptional customer service by greeting clients warmly within 30 seconds. Listen actively to their requests and provide professional recommendations. Maintain clean professional appearance and use proper communication. Handle complaints promptly and follow up to ensure satisfaction. Build relationships through personalized service and attention to detail.",
            "type": BusinessKnowledgeType.CUSTOMER_SERVICE
        },
        {
            "title": "Social Media Marketing for Barbershops",
            "content": "Use Instagram and Facebook to showcase work with before/after photos. Post consistently 3-5 times weekly during peak engagement hours. Use local hashtags and location tags. Engage with followers through comments and messages. Run targeted ads to local men aged 18-45. Share behind-the-scenes content and styling tips.",
            "type": BusinessKnowledgeType.MARKETING_STRATEGIES
        },
        {
            "title": "Financial Management Best Practices",
            "content": "Track daily revenue and expenses using point-of-sale systems. Monitor cash flow patterns and maintain reserves for slow periods. Analyze service profitability and adjust pricing accordingly. Implement inventory management to control product costs. Separate business and personal finances. Work with accountant for tax planning.",
            "type": BusinessKnowledgeType.FINANCIAL_MANAGEMENT
        },
        {
            "title": "Equipment and Technology Setup",
            "content": "Invest in professional-grade clippers, scissors, and styling tools. Implement appointment scheduling software with online booking. Use POS systems for payment processing and inventory tracking. Maintain equipment through regular cleaning and professional sharpening. Backup systems and data regularly for security.",
            "type": BusinessKnowledgeType.TECHNICAL_OPERATIONS
        },
        {
            "title": "Business Growth Strategy",
            "content": "Develop clear business goals and growth targets. Analyze local market and competitor positioning. Build strong brand identity and customer loyalty programs. Consider expansion opportunities and additional service offerings. Create partnerships with local businesses. Invest in staff training and development.",
            "type": BusinessKnowledgeType.BUSINESS_STRATEGY
        },
        {
            "title": "Health and Safety Standards",
            "content": "Follow state licensing requirements and health department regulations. Sanitize tools with hospital-grade disinfectants between clients. Use disposable items like neck strips and razor blades. Maintain clean facilities with proper ventilation. Display licenses and certifications prominently. Train staff on safety protocols.",
            "type": BusinessKnowledgeType.INDUSTRY_BEST_PRACTICES
        },
        {
            "title": "Licensing and Compliance",
            "content": "Obtain required barbershop establishment license and individual barber licenses. Renew licenses before expiration and complete continuing education. Follow employment laws for hiring and payroll. Maintain business registration and tax compliance. Implement data privacy protection for customer information.",
            "type": BusinessKnowledgeType.REGULATORY_COMPLIANCE
        },
        {
            "title": "Staff Management",
            "content": "Hire qualified licensed barbers through structured interview process. Provide comprehensive training and ongoing education opportunities. Set clear performance expectations and conduct regular reviews. Offer competitive compensation and advancement opportunities. Foster positive team culture and address conflicts promptly.",
            "type": BusinessKnowledgeType.STAFF_MANAGEMENT
        },
        {
            "title": "Product and Inventory Management",
            "content": "Select quality products and maintain optimal inventory levels. Use inventory management software to track usage and costs. Negotiate favorable terms with suppliers. Display products attractively to encourage sales. Train staff to recommend products during services. Monitor profit margins and adjust pricing.",
            "type": BusinessKnowledgeType.PRODUCT_INVENTORY
        },
        {
            "title": "Customer Retention Strategies",
            "content": "Build loyalty through consistent quality service and personal attention. Implement rewards programs and referral incentives. Send appointment reminders and follow-up communications. Address service issues quickly and fairly. Maintain detailed customer preference records. Create exclusive offers for repeat customers.",
            "type": BusinessKnowledgeType.CUSTOMER_SERVICE
        },
        {
            "title": "Local Marketing and Community Engagement",
            "content": "Partner with local businesses for cross-promotion opportunities. Sponsor community events and youth sports teams. Participate in local business associations. Host events in barbershop space. Support local schools and charities. Build relationships with wedding planners and photographers.",
            "type": BusinessKnowledgeType.MARKETING_STRATEGIES
        },
        {
            "title": "Revenue Optimization",
            "content": "Analyze service profitability and focus on high-margin offerings. Implement dynamic pricing for peak hours. Create service packages and bundles. Offer membership programs for recurring revenue. Upsell complementary services during appointments. Track average transaction value and customer lifetime value.",
            "type": BusinessKnowledgeType.FINANCIAL_MANAGEMENT
        },
        {
            "title": "Digital Presence and Online Booking",
            "content": "Maintain professional website with mobile optimization. Use online booking systems for customer convenience. Keep Google My Business profile updated. Encourage and respond to online reviews. Implement email marketing for customer communication. Use analytics to track website performance.",
            "type": BusinessKnowledgeType.TECHNICAL_OPERATIONS
        },
        {
            "title": "Seasonal Business Planning",
            "content": "Plan promotions around back-to-school, holidays, and special events. Adjust staffing levels for seasonal demand variations. Create gift certificate programs for holidays. Develop wedding season packages for grooms. Implement Father's Day and graduation promotions. Track seasonal trends for planning.",
            "type": BusinessKnowledgeType.BUSINESS_STRATEGY
        }
    ]
    
    # Add each document to the knowledge base
    for doc_data in knowledge_docs:
        doc_id = f"{doc_data['type'].value}_{len(doc_data['title'].split())}"
        
        document = KnowledgeDocument(
            id=doc_id,
            title=doc_data["title"],
            content=doc_data["content"],
            knowledge_type=doc_data["type"],
            source="6fb_essential_knowledge",
            metadata={"category": "essential", "verified": True}
        )
        
        success = await service.add_knowledge_document(document)
        if success:
            documents_added += 1
            print(f"✅ Added: {doc_data['title']}")
        else:
            print(f"❌ Failed: {doc_data['title']}")
    
    print(f"\n✅ Knowledge base population complete!")
    print(f"📊 Total documents added: {documents_added}")
    
    # Show final stats
    stats = await service.get_knowledge_stats()
    print(f"📈 Final knowledge base stats: {stats}")
    
    # Test search functionality
    print("\n🔍 Testing knowledge search...")
    search_results = await service.search_knowledge("customer service best practices")
    print(f"Search results for 'customer service best practices': {len(search_results)}")
    for result in search_results:
        print(f"  - {result.document.title} (relevance: {result.relevance_score:.3f})")

if __name__ == "__main__":
    asyncio.run(populate_essential_knowledge())