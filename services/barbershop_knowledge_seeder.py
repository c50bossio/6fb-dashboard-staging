"""
Barbershop Knowledge Seeder
Populates RAG system with 6-figure barbershop mentorship content and industry best practices
"""

import asyncio
import json
import logging
from datetime import datetime
from typing import Dict, List, Any

from .vector_knowledge_service import VectorKnowledgeService, BusinessKnowledgeType
from .enhanced_business_knowledge_service import BusinessDomain, KnowledgeSource

logger = logging.getLogger(__name__)

class BarbershopKnowledgeSeeder:
    """Seeds the RAG system with comprehensive 6-figure barbershop knowledge"""
    
    def __init__(self):
        self.vector_service = VectorKnowledgeService()
        self.knowledge_categories = {
            "revenue_strategies": BusinessKnowledgeType.REVENUE_PATTERNS,
            "customer_retention": BusinessKnowledgeType.CUSTOMER_INSIGHTS,
            "service_optimization": BusinessKnowledgeType.SERVICE_PERFORMANCE,
            "pricing_psychology": BusinessKnowledgeType.BUSINESS_METRICS,
            "staff_management": BusinessKnowledgeType.OPERATIONAL_BEST_PRACTICES,
            "marketing_mastery": BusinessKnowledgeType.MARKETING_EFFECTIVENESS,
        }
        
    async def seed_all_knowledge(self) -> Dict[str, int]:
        """Seed all barbershop knowledge categories"""
        results = {}
        
        logger.info("🌱 Starting comprehensive barbershop knowledge seeding...")
        
        # Seed each category
        results["revenue_strategies"] = await self.seed_revenue_strategies()
        results["customer_retention"] = await self.seed_customer_retention_knowledge()
        results["service_optimization"] = await self.seed_service_optimization()
        results["pricing_psychology"] = await self.seed_pricing_psychology()
        results["staff_management"] = await self.seed_staff_management()
        results["marketing_mastery"] = await self.seed_marketing_mastery()
        results["industry_benchmarks"] = await self.seed_industry_benchmarks()
        results["operational_excellence"] = await self.seed_operational_excellence()
        
        total_items = sum(results.values())
        logger.info(f"✅ Knowledge seeding complete! Added {total_items} knowledge items")
        
        return results
    
    async def seed_revenue_strategies(self) -> int:
        """Seed 6-figure barbershop revenue strategies"""
        revenue_knowledge = [
            {
                "title": "Premium Service Positioning Strategy",
                "content": "Position yourself as the premium barbershop in your area by focusing on exceptional service quality, luxury amenities, and high-end products. Premium positioning allows 30-50% higher pricing while maintaining strong customer loyalty. Key elements: luxury chair setup, premium product lines, personalized consultation, attention to detail, and creating an experience rather than just a service.",
                "knowledge_type": BusinessKnowledgeType.REVENUE_PATTERNS,
                "source": "six_figure_barber_mentorship",
                "domain": BusinessDomain.REVENUE_OPTIMIZATION,
                "tags": ["premium_positioning", "luxury_service", "high_pricing"]
            },
            {
                "title": "Service Menu Optimization for Maximum Revenue",
                "content": "Design your service menu to maximize average ticket value through strategic bundling and upselling. High-revenue services include: precision cuts ($45-75), beard sculpting ($25-40), hot towel treatments ($15-25), styling consultation ($35-50), and premium packages ($85-150). Focus on services with high profit margins and create natural upsell opportunities.",
                "knowledge_type": BusinessKnowledgeType.SERVICE_PERFORMANCE,
                "source": "industry_best_practices",
                "domain": BusinessDomain.REVENUE_OPTIMIZATION,
                "tags": ["service_menu", "pricing_strategy", "upselling", "bundling"]
            },
            {
                "title": "Membership and Recurring Revenue Model",
                "content": "Implement a membership model to create predictable recurring revenue. Successful models include: Premium Monthly Membership ($75-125/month for 2-3 services), VIP Annual Membership ($800-1200/year with additional perks), and Corporate Packages ($200-400/month per executive). Memberships should offer 10-15% savings while guaranteeing consistent revenue.",
                "knowledge_type": BusinessKnowledgeType.REVENUE_PATTERNS,
                "source": "six_figure_barber_mentorship",
                "domain": BusinessDomain.REVENUE_OPTIMIZATION,
                "tags": ["membership_model", "recurring_revenue", "predictable_income"]
            },
            {
                "title": "Peak Hour Revenue Maximization",
                "content": "Optimize scheduling during peak hours (11am-2pm, 5pm-7pm weekdays, 9am-4pm Saturdays) to maximize revenue. Strategies: premium pricing during peak times (+15-20%), advance booking incentives, double-booking coordination, and express service options. Peak hour optimization can increase daily revenue by 25-40%.",
                "knowledge_type": BusinessKnowledgeType.OPERATIONAL_BEST_PRACTICES,
                "source": "analytics_data",
                "domain": BusinessDomain.BARBERSHOP_OPERATIONS,
                "tags": ["peak_hours", "scheduling_optimization", "revenue_maximization"]
            },
            {
                "title": "Product Sales Integration Strategy",
                "content": "Integrate product sales seamlessly into the service experience. High-margin products include: premium pomades ($25-45), beard oils ($18-35), styling tools ($35-85), and grooming kits ($65-150). Train staff to make natural product recommendations based on service performed. Product sales should target 20-30% of service revenue.",
                "knowledge_type": BusinessKnowledgeType.SERVICE_PERFORMANCE,
                "source": "six_figure_barber_mentorship",
                "domain": BusinessDomain.REVENUE_OPTIMIZATION,
                "tags": ["product_sales", "retail_integration", "profit_margins"]
            }
        ]
        
        count = 0
        for knowledge in revenue_knowledge:
            try:
                await self.vector_service.store_knowledge(
                    content=f"{knowledge['title']}: {knowledge['content']}",
                    knowledge_type=knowledge["knowledge_type"],
                    source=knowledge["source"],
                    metadata={
                        "domain": knowledge["domain"].value,
                        "tags": knowledge["tags"],
                        "title": knowledge["title"],
                        "category": "revenue_strategies"
                    }
                )
                count += 1
            except Exception as e:
                logger.error(f"Error storing revenue knowledge: {e}")
        
        logger.info(f"✅ Seeded {count} revenue strategy knowledge items")
        return count
    
    async def seed_customer_retention_knowledge(self) -> int:
        """Seed customer retention and loyalty strategies"""
        retention_knowledge = [
            {
                "title": "VIP Customer Experience System",
                "content": "Create a systematic VIP experience for high-value customers (spending $100+/month). Include: personalized greeting by name, preferred barber booking, complimentary beverages, priority scheduling, birthday discounts, and exclusive event invitations. VIP customers have 85% higher retention and 60% higher lifetime value.",
                "knowledge_type": BusinessKnowledgeType.CUSTOMER_INSIGHTS,
                "source": "six_figure_barber_mentorship",
                "domain": BusinessDomain.CUSTOMER_EXPERIENCE,
                "tags": ["vip_program", "customer_loyalty", "retention_strategy"]
            },
            {
                "title": "Automated Follow-up Communication System",
                "content": "Implement systematic follow-up communication: Thank you message within 24 hours of service, satisfaction survey after 3 days, rebooking reminder after 3 weeks, and win-back campaign after 45 days without visit. Automated follow-up increases rebooking rates by 35% and identifies at-risk customers early.",
                "knowledge_type": BusinessKnowledgeType.CUSTOMER_INSIGHTS,
                "source": "marketing_automation",
                "domain": BusinessDomain.CUSTOMER_EXPERIENCE,
                "tags": ["automated_followup", "communication_system", "rebooking_optimization"]
            },
            {
                "title": "Referral Reward Program Design",
                "content": "Design a compelling referral program: $15 credit for both referrer and new customer, bonus rewards at 3 and 5 referrals, and special recognition for top referrers. Track referral sources and reward accordingly. Effective referral programs generate 25-35% of new customers while strengthening existing relationships.",
                "knowledge_type": BusinessKnowledgeType.CUSTOMER_INSIGHTS,
                "source": "six_figure_barber_mentorship",
                "domain": BusinessDomain.MARKETING_STRATEGIES,
                "tags": ["referral_program", "customer_acquisition", "loyalty_rewards"]
            }
        ]
        
        count = 0
        for knowledge in retention_knowledge:
            try:
                await self.vector_service.store_knowledge(
                    content=f"{knowledge['title']}: {knowledge['content']}",
                    knowledge_type=knowledge["knowledge_type"],
                    source=knowledge["source"],
                    metadata={
                        "domain": knowledge["domain"].value,
                        "tags": knowledge["tags"],
                        "title": knowledge["title"],
                        "category": "customer_retention"
                    }
                )
                count += 1
            except Exception as e:
                logger.error(f"Error storing retention knowledge: {e}")
        
        logger.info(f"✅ Seeded {count} customer retention knowledge items")
        return count
    
    async def seed_service_optimization(self) -> int:
        """Seed service optimization and efficiency knowledge"""
        service_knowledge = [
            {
                "title": "Service Time Optimization Framework",
                "content": "Optimize service times for maximum efficiency and quality: Standard cuts (25-35 minutes), Premium cuts with styling (45-55 minutes), Beard services (15-25 minutes), Combined services (50-70 minutes). Use timers, checklists, and continuous improvement to maintain consistency while maximizing bookings per day.",
                "knowledge_type": BusinessKnowledgeType.OPERATIONAL_BEST_PRACTICES,
                "source": "operations_optimization",
                "domain": BusinessDomain.BARBERSHOP_OPERATIONS,
                "tags": ["service_timing", "efficiency", "quality_control"]
            },
            {
                "title": "Multi-Service Upselling Techniques",
                "content": "Master natural upselling during service delivery: Suggest beard trim during haircut consultation, recommend hot towel treatment for relaxation, offer styling products for hair type, and present maintenance packages. Successful upselling increases average ticket by 40-60% while enhancing customer satisfaction.",
                "knowledge_type": BusinessKnowledgeType.SERVICE_PERFORMANCE,
                "source": "six_figure_barber_mentorship",
                "domain": BusinessDomain.REVENUE_OPTIMIZATION,
                "tags": ["upselling", "service_bundling", "sales_techniques"]
            }
        ]
        
        count = 0
        for knowledge in service_knowledge:
            try:
                await self.vector_service.store_knowledge(
                    content=f"{knowledge['title']}: {knowledge['content']}",
                    knowledge_type=knowledge["knowledge_type"],
                    source=knowledge["source"],
                    metadata={
                        "domain": knowledge["domain"].value,
                        "tags": knowledge["tags"],
                        "title": knowledge["title"],
                        "category": "service_optimization"
                    }
                )
                count += 1
            except Exception as e:
                logger.error(f"Error storing service knowledge: {e}")
        
        logger.info(f"✅ Seeded {count} service optimization knowledge items")
        return count
    
    async def seed_pricing_psychology(self) -> int:
        """Seed pricing psychology and strategic pricing knowledge"""
        pricing_knowledge = [
            {
                "title": "Premium Pricing Psychology Principles",
                "content": "Apply premium pricing psychology: Price anchoring with premium options first, charm pricing ($49 vs $50), value-based pricing communication, scarcity messaging for popular time slots, and confidence in pricing presentation. Psychological pricing can increase perceived value by 25-40% and reduce price resistance.",
                "knowledge_type": BusinessKnowledgeType.BUSINESS_METRICS,
                "source": "pricing_psychology_research",
                "domain": BusinessDomain.REVENUE_OPTIMIZATION,
                "tags": ["pricing_psychology", "premium_pricing", "value_perception"]
            },
            {
                "title": "Strategic Price Increase Implementation",
                "content": "Implement strategic price increases systematically: Analyze 60+ days of performance data, ensure 85%+ booking rate, communicate value improvements to customers, increase prices by 5-10% maximum, wait 90+ days between increases. Strategic pricing based on sustained performance reduces customer churn during increases.",
                "knowledge_type": BusinessKnowledgeType.BUSINESS_METRICS,
                "source": "strategic_pricing_analysis",
                "domain": BusinessDomain.REVENUE_OPTIMIZATION,
                "tags": ["strategic_pricing", "price_increases", "performance_based_pricing"]
            }
        ]
        
        count = 0
        for knowledge in pricing_knowledge:
            try:
                await self.vector_service.store_knowledge(
                    content=f"{knowledge['title']}: {knowledge['content']}",
                    knowledge_type=knowledge["knowledge_type"],
                    source=knowledge["source"],
                    metadata={
                        "domain": knowledge["domain"].value,
                        "tags": knowledge["tags"],
                        "title": knowledge["title"],
                        "category": "pricing_psychology"
                    }
                )
                count += 1
            except Exception as e:
                logger.error(f"Error storing pricing knowledge: {e}")
        
        logger.info(f"✅ Seeded {count} pricing psychology knowledge items")
        return count
    
    async def seed_staff_management(self) -> int:
        """Seed staff management and team optimization knowledge"""
        staff_knowledge = [
            {
                "title": "Performance-Based Compensation Model",
                "content": "Implement performance-based compensation: Base salary plus commission structure (40-60% of service revenue), performance bonuses for customer retention, product sales incentives (10-15% commission), and recognition programs. Performance-based pay increases staff productivity by 30-50% and reduces turnover.",
                "knowledge_type": BusinessKnowledgeType.OPERATIONAL_BEST_PRACTICES,
                "source": "hr_best_practices",
                "domain": BusinessDomain.STAFF_MANAGEMENT,
                "tags": ["compensation", "performance_incentives", "staff_retention"]
            },
            {
                "title": "Continuous Education and Skill Development",
                "content": "Invest in continuous staff education: Monthly technique workshops, industry trend training, customer service excellence programs, and product knowledge sessions. Staff education increases service quality, enables premium pricing, and improves job satisfaction. Budget 2-3% of revenue for staff development.",
                "knowledge_type": BusinessKnowledgeType.OPERATIONAL_BEST_PRACTICES,
                "source": "six_figure_barber_mentorship",
                "domain": BusinessDomain.STAFF_MANAGEMENT,
                "tags": ["staff_training", "skill_development", "quality_improvement"]
            }
        ]
        
        count = 0
        for knowledge in staff_knowledge:
            try:
                await self.vector_service.store_knowledge(
                    content=f"{knowledge['title']}: {knowledge['content']}",
                    knowledge_type=knowledge["knowledge_type"],
                    source=knowledge["source"],
                    metadata={
                        "domain": knowledge["domain"].value,
                        "tags": knowledge["tags"],
                        "title": knowledge["title"],
                        "category": "staff_management"
                    }
                )
                count += 1
            except Exception as e:
                logger.error(f"Error storing staff knowledge: {e}")
        
        logger.info(f"✅ Seeded {count} staff management knowledge items")
        return count
    
    async def seed_marketing_mastery(self) -> int:
        """Seed marketing strategies and customer acquisition knowledge"""
        marketing_knowledge = [
            {
                "title": "Social Media Content Strategy for Barbershops",
                "content": "Develop systematic social media content: Before/after transformations (40% of content), behind-the-scenes process videos (20%), customer testimonials and reviews (15%), styling tips and tutorials (15%), and shop culture/team highlights (10%). Consistent content posting increases local visibility by 60% and drives 25% of new bookings.",
                "knowledge_type": BusinessKnowledgeType.MARKETING_EFFECTIVENESS,
                "source": "digital_marketing_strategy",
                "domain": BusinessDomain.MARKETING_STRATEGIES,
                "tags": ["social_media", "content_strategy", "customer_acquisition"]
            },
            {
                "title": "Local SEO Optimization for Barbershops",
                "content": "Optimize local search presence: Google My Business optimization with regular posts and photos, local keyword targeting, customer review management, local directory listings, and location-based content. Strong local SEO generates 35-50% of new customer inquiries and establishes market authority.",
                "knowledge_type": BusinessKnowledgeType.MARKETING_EFFECTIVENESS,
                "source": "local_seo_best_practices",
                "domain": BusinessDomain.MARKETING_STRATEGIES,
                "tags": ["local_seo", "google_my_business", "online_visibility"]
            },
            {
                "title": "Customer Review Generation System",
                "content": "Systematically generate positive reviews: Request reviews immediately after excellent service, provide easy review links via text message, follow up with satisfied customers, respond professionally to all reviews, and showcase positive reviews in marketing. Active review management increases online ratings and drives 20-30% more bookings.",
                "knowledge_type": BusinessKnowledgeType.CUSTOMER_INSIGHTS,
                "source": "reputation_management",
                "domain": BusinessDomain.MARKETING_STRATEGIES,
                "tags": ["review_management", "online_reputation", "customer_feedback"]
            }
        ]
        
        count = 0
        for knowledge in marketing_knowledge:
            try:
                await self.vector_service.store_knowledge(
                    content=f"{knowledge['title']}: {knowledge['content']}",
                    knowledge_type=knowledge["knowledge_type"],
                    source=knowledge["source"],
                    metadata={
                        "domain": knowledge["domain"].value,
                        "tags": knowledge["tags"],
                        "title": knowledge["title"],
                        "category": "marketing_mastery"
                    }
                )
                count += 1
            except Exception as e:
                logger.error(f"Error storing marketing knowledge: {e}")
        
        logger.info(f"✅ Seeded {count} marketing mastery knowledge items")
        return count
    
    async def seed_industry_benchmarks(self) -> int:
        """Seed industry benchmarks and performance standards"""
        benchmark_knowledge = [
            {
                "title": "6-Figure Barbershop Performance Benchmarks",
                "content": "Key performance indicators for 6-figure barbershops: Monthly revenue $12,000-25,000+, Average ticket value $45-85, Customer retention rate 75%+, Booking utilization 80%+, Product sales 20-30% of service revenue, Customer acquisition cost <$25, Lifetime customer value $800-1,500+. Use these benchmarks to measure and improve performance.",
                "knowledge_type": BusinessKnowledgeType.BUSINESS_METRICS,
                "source": "industry_research",
                "domain": BusinessDomain.INDUSTRY_BENCHMARKS,
                "tags": ["performance_benchmarks", "kpi_targets", "six_figure_metrics"]
            },
            {
                "title": "Service Pricing Industry Standards",
                "content": "Industry pricing standards by market type: Premium markets - Cuts $45-75, Beards $25-40; Mid-market - Cuts $28-45, Beards $15-25; Budget markets - Cuts $18-28, Beards $10-18. Adjust pricing based on local market conditions, competition analysis, and service quality positioning.",
                "knowledge_type": BusinessKnowledgeType.BUSINESS_METRICS,
                "source": "pricing_market_research",
                "domain": BusinessDomain.INDUSTRY_BENCHMARKS,
                "tags": ["pricing_standards", "market_positioning", "competitive_analysis"]
            }
        ]
        
        count = 0
        for knowledge in benchmark_knowledge:
            try:
                await self.vector_service.store_knowledge(
                    content=f"{knowledge['title']}: {knowledge['content']}",
                    knowledge_type=knowledge["knowledge_type"],
                    source=knowledge["source"],
                    metadata={
                        "domain": knowledge["domain"].value,
                        "tags": knowledge["tags"],
                        "title": knowledge["title"],
                        "category": "industry_benchmarks"
                    }
                )
                count += 1
            except Exception as e:
                logger.error(f"Error storing benchmark knowledge: {e}")
        
        logger.info(f"✅ Seeded {count} industry benchmark knowledge items")
        return count
    
    async def seed_operational_excellence(self) -> int:
        """Seed operational excellence and best practices"""
        operations_knowledge = [
            {
                "title": "Appointment Scheduling Optimization",
                "content": "Optimize appointment scheduling for maximum efficiency: 15-minute buffers between appointments, double-booking strategies for no-shows, waitlist management, peak hour premium slots, online booking integration, and automated reminders. Optimized scheduling increases daily capacity by 20-30% while reducing stress.",
                "knowledge_type": BusinessKnowledgeType.OPERATIONAL_BEST_PRACTICES,
                "source": "operations_optimization",
                "domain": BusinessDomain.BARBERSHOP_OPERATIONS,
                "tags": ["scheduling_optimization", "appointment_management", "capacity_planning"]
            },
            {
                "title": "Customer Experience Journey Mapping",
                "content": "Map and optimize the complete customer journey: Pre-arrival communication, arrival and check-in experience, consultation and service delivery, post-service satisfaction, follow-up communication, and rebooking process. Each touchpoint should reinforce premium positioning and encourage loyalty.",
                "knowledge_type": BusinessKnowledgeType.CUSTOMER_INSIGHTS,
                "source": "customer_experience_design",
                "domain": BusinessDomain.CUSTOMER_EXPERIENCE,
                "tags": ["customer_journey", "experience_design", "touchpoint_optimization"]
            }
        ]
        
        count = 0
        for knowledge in operations_knowledge:
            try:
                await self.vector_service.store_knowledge(
                    content=f"{knowledge['title']}: {knowledge['content']}",
                    knowledge_type=knowledge["knowledge_type"],
                    source=knowledge["source"],
                    metadata={
                        "domain": knowledge["domain"].value,
                        "tags": knowledge["tags"],
                        "title": knowledge["title"],
                        "category": "operational_excellence"
                    }
                )
                count += 1
            except Exception as e:
                logger.error(f"Error storing operations knowledge: {e}")
        
        logger.info(f"✅ Seeded {count} operational excellence knowledge items")
        return count

# Global seeder instance
barbershop_knowledge_seeder = BarbershopKnowledgeSeeder()