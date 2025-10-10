#!/usr/bin/env python3
"""
Load Knowledge Base Script - Populate vector knowledge service with business intelligence
Loads comprehensive barbershop business knowledge into the AI agent system
"""

import asyncio
import json
import logging
import os
import sys
from pathlib import Path
from typing import Dict, List, Any

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from services.vector_knowledge_service import VectorKnowledgeService, KnowledgeDocument, BusinessKnowledgeType

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class KnowledgeBaseLoader:
    """Load and populate knowledge base with business intelligence"""
    
    def __init__(self):
        self.knowledge_service = VectorKnowledgeService()
        self.knowledge_dir = Path(__file__).parent.parent / "data" / "knowledge"
        
    async def load_all_knowledge(self):
        """Load all knowledge documents into the vector database"""
        try:
            logger.info("🚀 Starting comprehensive knowledge base loading...")
            
            # Ensure knowledge directory exists
            self.knowledge_dir.mkdir(parents=True, exist_ok=True)
            
            # Load JSON knowledge files
            await self._load_json_knowledge()
            
            # Load core barbershop business knowledge
            await self._load_core_business_knowledge()
            
            # Load customer service knowledge
            await self._load_customer_service_knowledge()
            
            # Load marketing strategies
            await self._load_marketing_knowledge()
            
            # Load financial management knowledge
            await self._load_financial_knowledge()
            
            # Load technical operations knowledge
            await self._load_technical_knowledge()
            
            # Get final statistics
            stats = await self.knowledge_service.get_knowledge_stats()
            logger.info(f"✅ Knowledge base loading completed: {stats.get('total_documents', 0)} documents loaded")
            
            return stats
            
        except Exception as e:
            logger.error(f"❌ Knowledge base loading failed: {e}")
            raise
    
    async def _load_json_knowledge(self):
        """Load knowledge from JSON files in the knowledge directory"""
        try:
            json_files = list(self.knowledge_dir.glob("*.json"))
            logger.info(f"Found {len(json_files)} JSON knowledge files")
            
            for json_file in json_files:
                try:
                    with open(json_file, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                    
                    # Create knowledge document from JSON data
                    doc = KnowledgeDocument(
                        id=f"json_{json_file.stem}",
                        title=data.get("title", json_file.stem),
                        content=self._extract_content_from_json(data),
                        knowledge_type=BusinessKnowledgeType(data.get("knowledge_type", "business_strategy")),
                        source=data.get("source", f"file:{json_file.name}"),
                        metadata={"file_source": str(json_file), "sections": len(data.get("sections", []))}
                    )
                    
                    await self.knowledge_service.add_knowledge_document(doc)
                    logger.info(f"✅ Loaded {json_file.name}")
                    
                except Exception as e:
                    logger.warning(f"⚠️ Failed to load {json_file.name}: {e}")
                    
        except Exception as e:
            logger.error(f"JSON knowledge loading failed: {e}")
    
    def _extract_content_from_json(self, data: Dict[str, Any]) -> str:
        """Extract comprehensive content from JSON structure"""
        content_parts = []
        
        # Add title and main content
        if "title" in data:
            content_parts.append(f"Title: {data['title']}")
        
        # Process sections
        if "sections" in data:
            for section in data["sections"]:
                if isinstance(section, dict):
                    if "title" in section:
                        content_parts.append(f"\\n## {section['title']}")
                    if "content" in section:
                        content_parts.append(section["content"])
                    
                    # Add key concepts, strategies, etc.
                    for key in ["key_concepts", "strategies", "methods", "kpis", "metrics"]:
                        if key in section:
                            content_parts.append(f"\\n{key.replace('_', ' ').title()}:")
                            if isinstance(section[key], list):
                                for item in section[key]:
                                    if isinstance(item, str):
                                        content_parts.append(f"- {item}")
                                    elif isinstance(item, dict):
                                        content_parts.append(f"- {json.dumps(item, indent=2)}")
        
        # Add implementation guides
        if "implementation_roadmap" in data:
            content_parts.append("\\n## Implementation Roadmap")
            roadmap = data["implementation_roadmap"]
            for phase, details in roadmap.items():
                content_parts.append(f"\\n### {phase.replace('_', ' ').title()}")
                if isinstance(details, dict):
                    for key, value in details.items():
                        content_parts.append(f"{key.replace('_', ' ').title()}: {value}")
        
        # Add success factors
        if "success_factors" in data:
            content_parts.append("\\n## Success Factors")
            for factor in data["success_factors"]:
                content_parts.append(f"- {factor}")
        
        return "\\n".join(content_parts)
    
    async def _load_core_business_knowledge(self):
        """Load core barbershop business operational knowledge"""
        knowledge_items = [
            {
                "id": "barbershop_operations_basics",
                "title": "Barbershop Operations Fundamentals",
                "content": """
                Core barbershop operations encompass daily management, scheduling, inventory, and client service delivery.
                
                Key operational areas include:
                - Appointment scheduling and time management
                - Equipment maintenance and sanitation protocols
                - Product inventory and supplier relationships
                - Cash handling and payment processing
                - Staff scheduling and task management
                - Client record keeping and preferences tracking
                - Quality control and service standards
                - Facility maintenance and ambiance management
                
                Best practices:
                - Maintain detailed appointment books with client preferences
                - Implement consistent cleaning protocols between clients
                - Track product usage and maintain optimal inventory levels
                - Use point-of-sale systems for accurate transaction recording
                - Create standard operating procedures for all services
                - Regular equipment calibration and professional maintenance
                - Establish client communication protocols and follow-up systems
                """,
                "knowledge_type": BusinessKnowledgeType.BARBERSHOP_OPERATIONS
            },
            {
                "id": "service_excellence_standards",
                "title": "Service Excellence and Quality Standards",
                "content": """
                Establishing and maintaining high service standards is crucial for premium positioning and client satisfaction.
                
                Service excellence components:
                - Consultation and needs assessment protocols
                - Technical skill standards and continuous improvement
                - Client communication and education
                - Time management and punctuality
                - Attention to detail and finishing quality
                - Cleanliness and sanitation standards
                - Professional appearance and behavior
                - Problem resolution and client satisfaction
                
                Quality assurance measures:
                - Regular skills assessment and training updates
                - Client feedback collection and analysis
                - Mystery shopper evaluations
                - Peer review and mentoring systems
                - Industry certification maintenance
                - Continuing education and workshop attendance
                - Service delivery time standards
                - Client retention and satisfaction metrics
                """,
                "knowledge_type": BusinessKnowledgeType.BARBERSHOP_OPERATIONS
            }
        ]
        
        for item in knowledge_items:
            doc = KnowledgeDocument(
                id=item["id"],
                title=item["title"],
                content=item["content"],
                knowledge_type=item["knowledge_type"],
                source="core_business_knowledge",
                metadata={"category": "operations", "importance": "high"}
            )
            await self.knowledge_service.add_knowledge_document(doc)
            logger.info(f"✅ Loaded: {item['title']}")
    
    async def _load_customer_service_knowledge(self):
        """Load comprehensive customer service and relationship management knowledge"""
        knowledge_items = [
            {
                "id": "client_relationship_management",
                "title": "Client Relationship Management Excellence",
                "content": """
                Building strong, lasting relationships with clients is fundamental to barbershop success and premium pricing sustainability.
                
                Relationship building strategies:
                - Personal connection and genuine interest in clients
                - Remembering preferences, names, and important details
                - Consistent quality and reliable service delivery
                - Proactive communication and appointment reminders
                - Celebrating client achievements and special occasions
                - Handling complaints with empathy and swift resolution
                - Regular check-ins and satisfaction assessments
                - Creating memorable experiences beyond the service
                
                Client retention techniques:
                - Personalized service recommendations based on history
                - Loyalty programs and rewards for regular clients
                - Exclusive events and preview access to new services
                - Educational content about grooming and maintenance
                - Flexible scheduling to accommodate client needs
                - Follow-up communication with care and styling tips
                - Referral incentives and recognition programs
                - Continuous improvement based on client feedback
                """,
                "knowledge_type": BusinessKnowledgeType.CUSTOMER_SERVICE
            },
            {
                "id": "client_communication_mastery",
                "title": "Effective Client Communication Strategies",
                "content": """
                Professional communication skills are essential for building trust, managing expectations, and delivering exceptional service experiences.
                
                Communication fundamentals:
                - Active listening and empathy in client interactions
                - Clear explanation of services and expected outcomes
                - Professional language and positive tone
                - Non-verbal communication awareness and body language
                - Cultural sensitivity and inclusive communication
                - Conflict resolution and de-escalation techniques
                - Educational communication about grooming and care
                - Follow-up communication for satisfaction and retention
                
                Consultation best practices:
                - Thorough needs assessment and preference understanding
                - Visual references and style communication tools
                - Realistic expectation setting and timeline communication
                - Cost transparency and value explanation
                - Maintenance and care instruction delivery
                - Upselling and cross-selling through education
                - Feedback collection and continuous improvement
                - Professional boundary maintenance while building rapport
                """,
                "knowledge_type": BusinessKnowledgeType.CUSTOMER_SERVICE
            }
        ]
        
        for item in knowledge_items:
            doc = KnowledgeDocument(
                id=item["id"],
                title=item["title"],
                content=item["content"],
                knowledge_type=item["knowledge_type"],
                source="customer_service_knowledge",
                metadata={"category": "client_relations", "importance": "high"}
            )
            await self.knowledge_service.add_knowledge_document(doc)
            logger.info(f"✅ Loaded: {item['title']}")
    
    async def _load_marketing_knowledge(self):
        """Load comprehensive marketing and promotion strategies"""
        knowledge_items = [
            {
                "id": "digital_marketing_strategies",
                "title": "Digital Marketing for Barbershops",
                "content": """
                Modern barbershops must leverage digital marketing to attract quality clients and build brand awareness in competitive markets.
                
                Social media marketing:
                - Instagram portfolio showcasing before/after transformations
                - TikTok educational content and behind-the-scenes videos
                - Facebook community building and client testimonials
                - LinkedIn professional networking and business connections
                - YouTube tutorials and expertise demonstrations
                - Consistent posting schedule and engagement strategies
                - User-generated content encouragement and sharing
                - Influencer partnerships and collaborative content
                
                Local SEO optimization:
                - Google Business Profile optimization with photos and reviews
                - Local keyword targeting and content creation
                - Online directory listings and citation consistency
                - Review management and response strategies
                - Local community involvement and event participation
                - Partnership with complementary local businesses
                - Mobile-friendly website with online booking capabilities
                - Location-based advertising and geo-targeting campaigns
                """,
                "knowledge_type": BusinessKnowledgeType.MARKETING_STRATEGIES
            },
            {
                "id": "referral_and_retention_marketing",
                "title": "Referral Programs and Client Retention",
                "content": """
                Word-of-mouth marketing and client retention are the most cost-effective growth strategies for premium barbershops.
                
                Referral program design:
                - Incentive structure for both referrer and new client
                - Easy referral process and tracking systems
                - Recognition and rewards for top referrers
                - Seasonal promotions and special referral events
                - Digital tools for easy sharing and tracking
                - Partner business cross-referral programs
                - Community involvement and networking referrals
                - Employee referral programs and incentives
                
                Retention strategies:
                - Loyalty programs with tiered benefits and rewards
                - Personalized communication and special offers
                - Birthday and anniversary recognition programs
                - Exclusive access to new services and products
                - Regular satisfaction surveys and improvement implementation
                - Membership programs with guaranteed availability
                - Educational content delivery and grooming tips
                - Community building through events and workshops
                """,
                "knowledge_type": BusinessKnowledgeType.MARKETING_STRATEGIES
            }
        ]
        
        for item in knowledge_items:
            doc = KnowledgeDocument(
                id=item["id"],
                title=item["title"],
                content=item["content"],
                knowledge_type=item["knowledge_type"],
                source="marketing_knowledge",
                metadata={"category": "marketing", "importance": "high"}
            )
            await self.knowledge_service.add_knowledge_document(doc)
            logger.info(f"✅ Loaded: {item['title']}")
    
    async def _load_financial_knowledge(self):
        """Load financial management and profit optimization knowledge"""
        knowledge_items = [
            {
                "id": "profit_optimization_strategies",
                "title": "Profit Optimization and Financial Management",
                "content": """
                Effective financial management is crucial for achieving six-figure barbershop success through strategic pricing, cost control, and revenue optimization.
                
                Revenue optimization:
                - Value-based pricing strategies and implementation
                - Service upselling and cross-selling techniques
                - Retail product integration and margin optimization
                - Package deals and membership program development
                - Peak hour pricing and demand management
                - Service bundling for increased average tickets
                - Seasonal promotions and strategic discounting
                - Premium service tier development and positioning
                
                Cost management:
                - Fixed and variable cost analysis and optimization
                - Inventory management and supplier negotiation
                - Staff productivity and compensation optimization
                - Facility cost reduction and efficiency improvements
                - Equipment investment ROI analysis and planning
                - Marketing spend optimization and measurement
                - Technology investment evaluation and selection
                - Waste reduction and sustainability initiatives
                """,
                "knowledge_type": BusinessKnowledgeType.FINANCIAL_MANAGEMENT
            },
            {
                "id": "financial_metrics_kpis",
                "title": "Key Financial Metrics and Performance Indicators",
                "content": """
                Tracking the right financial metrics is essential for making informed business decisions and achieving sustainable profitability.
                
                Essential financial KPIs:
                - Gross profit margin and net profit margin analysis
                - Average transaction value and client lifetime value
                - Cost per acquisition and return on marketing investment
                - Monthly recurring revenue and revenue growth rate
                - Cash flow analysis and working capital management
                - Break-even analysis and profitability thresholds
                - Service profitability and contribution margins
                - Equipment and facility utilization rates
                
                Financial reporting and analysis:
                - Daily sales tracking and trend analysis
                - Weekly financial performance reviews
                - Monthly profit and loss statement analysis
                - Quarterly business health assessments
                - Annual strategic planning and budget development
                - Tax planning and compliance management
                - Investment planning and capital allocation
                - Risk management and financial protection strategies
                """,
                "knowledge_type": BusinessKnowledgeType.FINANCIAL_MANAGEMENT
            }
        ]
        
        for item in knowledge_items:
            doc = KnowledgeDocument(
                id=item["id"],
                title=item["title"],
                content=item["content"],
                knowledge_type=item["knowledge_type"],
                source="financial_knowledge",
                metadata={"category": "finance", "importance": "high"}
            )
            await self.knowledge_service.add_knowledge_document(doc)
            logger.info(f"✅ Loaded: {item['title']}")
    
    async def _load_technical_knowledge(self):
        """Load technical operations and system optimization knowledge"""
        knowledge_items = [
            {
                "id": "booking_system_optimization",
                "title": "Booking System and Schedule Optimization",
                "content": """
                Efficient booking systems and schedule optimization are critical for maximizing revenue and client satisfaction.
                
                Booking system features:
                - Online booking platform with real-time availability
                - Mobile-responsive design and user-friendly interface
                - Automated confirmation and reminder systems
                - Client preference tracking and service history
                - Staff scheduling and availability management
                - Waitlist management and cancellation policies
                - Integration with payment processing systems
                - Analytics and reporting for performance tracking
                
                Schedule optimization strategies:
                - Peak hour identification and premium pricing
                - Service duration standardization and buffer time
                - Staff utilization maximization and efficiency
                - Client flow management and wait time reduction
                - Appointment spacing for quality service delivery
                - Emergency appointment slots for urgent needs
                - Double booking prevention and conflict resolution
                - Seasonal demand planning and staff adjustment
                """,
                "knowledge_type": BusinessKnowledgeType.TECHNICAL_OPERATIONS
            },
            {
                "id": "technology_integration",
                "title": "Technology Integration for Barbershop Operations",
                "content": """
                Strategic technology adoption can significantly improve operational efficiency, client experience, and business profitability.
                
                Essential technology systems:
                - Point-of-sale systems with inventory tracking
                - Customer relationship management (CRM) platforms
                - Social media management and scheduling tools
                - Email marketing and automation platforms
                - Online review management and monitoring tools
                - Video conferencing for virtual consultations
                - Digital payment processing and mobile payments
                - Security systems and surveillance monitoring
                
                Implementation best practices:
                - Staff training and technology adoption support
                - Data backup and security protocol establishment
                - Integration testing and system compatibility
                - Performance monitoring and optimization
                - User experience testing and improvement
                - Cost-benefit analysis and ROI measurement
                - Vendor relationship management and support
                - Continuous system updates and maintenance
                """,
                "knowledge_type": BusinessKnowledgeType.TECHNICAL_OPERATIONS
            }
        ]
        
        for item in knowledge_items:
            doc = KnowledgeDocument(
                id=item["id"],
                title=item["title"],
                content=item["content"],
                knowledge_type=item["knowledge_type"],
                source="technical_knowledge",
                metadata={"category": "technology", "importance": "medium"}
            )
            await self.knowledge_service.add_knowledge_document(doc)
            logger.info(f"✅ Loaded: {item['title']}")

async def main():
    """Main function to run the knowledge base loading"""
    try:
        loader = KnowledgeBaseLoader()
        stats = await loader.load_all_knowledge()
        
        print(f"""
        
🎉 Knowledge Base Loading Complete!
        
📊 Final Statistics:
• Total Documents: {stats.get('total_documents', 0)}
• Knowledge Types: {len(stats.get('knowledge_types', {}))}
• Total Embeddings: {stats.get('total_embeddings', 0)}
        
Knowledge Categories Loaded:
""")
        
        for knowledge_type, count in stats.get('knowledge_types', {}).items():
            print(f"• {knowledge_type.replace('_', ' ').title()}: {count} documents")
        
        print("\\n✅ The AI agents now have comprehensive business intelligence!")
        
    except Exception as e:
        logger.error(f"❌ Knowledge base loading failed: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    exit(exit_code)