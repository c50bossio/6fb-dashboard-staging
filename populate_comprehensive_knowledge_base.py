#!/usr/bin/env python3
"""
Populate Comprehensive Knowledge Base for 6FB AI Agent System
Creates a comprehensive barbershop business knowledge base with 100+ documents
"""

import asyncio
import os
import sys
from datetime import datetime
from typing import List

# Add current directory to path for imports
sys.path.append('.')

from services.vector_knowledge_service import VectorKnowledgeService, KnowledgeDocument, BusinessKnowledgeType

class KnowledgeBasePopulator:
    """Populates the vector knowledge base with comprehensive barbershop business knowledge"""
    
    def __init__(self):
        self.service = VectorKnowledgeService()
        self.documents_added = 0
        
    async def populate_all_knowledge(self):
        """Populate all knowledge categories"""
        print("🚀 Populating Comprehensive 6FB Barbershop Knowledge Base...")
        
        # Populate each knowledge category
        await self._populate_barbershop_operations()
        await self._populate_customer_service()
        await self._populate_marketing_strategies()
        await self._populate_financial_management()
        await self._populate_technical_operations()
        await self._populate_business_strategy()
        await self._populate_industry_best_practices()
        await self._populate_regulatory_compliance()
        await self._populate_staff_management()
        await self._populate_product_inventory()
        
        print(f"\n✅ Knowledge base population complete!")
        print(f"📊 Total documents added: {self.documents_added}")
        
        # Show stats
        stats = await self.service.get_knowledge_stats()
        print(f"📈 Final knowledge base stats: {stats}")
    
    async def _add_document(self, title: str, content: str, knowledge_type: BusinessKnowledgeType, source: str = "6fb_knowledge_base", metadata: dict = None):
        """Helper to add a document"""
        doc_id = f"{knowledge_type.value}_{len(title.split())}_{''.join(title.split()[:3]).lower()}"
        
        document = KnowledgeDocument(
            id=doc_id,
            title=title,
            content=content,
            knowledge_type=knowledge_type,
            source=source,
            metadata=metadata or {"category": "core_knowledge", "verified": True}
        )
        
        success = await self.service.add_knowledge_document(document)
        if success:
            self.documents_added += 1
            print(f"✅ Added: {title}")
        else:
            print(f"❌ Failed: {title}")
    
    async def _populate_barbershop_operations(self):
        """Populate barbershop operations knowledge"""
        print("\n📋 Populating Barbershop Operations Knowledge...")
        
        operations_knowledge = [
            {
                "title": "Daily Opening Procedures for Barbershops",
                "content": """Daily opening procedures ensure smooth operations and professional service delivery. Start by unlocking the shop and turning on all lights 30 minutes before first appointment. Check all equipment functionality including clippers, trimmers, and scissors. Sanitize all tools using hospital-grade disinfectants. Set up workstations with fresh towels, capes, and cleaning supplies. Check appointment book and prepare for scheduled clients. Ensure cash register has adequate change. Turn on music system at appropriate volume. Check product inventory levels and restock if needed. Clean mirrors and styling chairs. Verify that barbershop licenses and certifications are visible. Review daily schedule with staff members."""
            },
            {
                "title": "Equipment Maintenance and Sterilization Protocol",
                "content": """Proper equipment maintenance extends tool life and ensures client safety. Clean clippers after each use with brush and blade wash. Oil clipper blades every 3-4 uses. Sanitize scissors with alcohol-based disinfectant between clients. Change clipper guards between different clients. Sterilize metal tools in autoclave or UV sterilizer. Replace disposable items like neck strips and razor blades. Sharpen scissors monthly by professional sharpening service. Check electrical cords for damage weekly. Clean and oil hair dryers monthly. Maintain detailed equipment logs. Replace worn tools promptly. Store tools in sanitized containers."""
            },
            {
                "title": "Appointment Scheduling Best Practices",
                "content": """Effective appointment scheduling maximizes revenue and minimizes wait times. Book appointments 15-30 minutes apart depending on service complexity. Leave 10-minute buffers between complex services. Use scheduling software with client history and preferences. Send appointment reminders 24 hours in advance via SMS or email. Allow online booking for convenience. Block time for walk-ins during peak hours. Schedule regular clients at their preferred times. Keep detailed service notes for each client. Handle cancellations with 24-hour policy. Maintain waitlist for last-minute openings. Track no-show patterns and adjust policies accordingly."""
            },
            {
                "title": "Service Menu Development and Pricing Strategy",
                "content": """Develop a comprehensive service menu that reflects market positioning and maximizes profitability. Basic haircuts should be priced competitively with local market. Premium services like hot towel shaves command higher prices. Package deals encourage multiple service bookings. Children's cuts typically priced 20-30% below adult cuts. Senior discounts can build loyalty during slower periods. Seasonal services like beard trims for holidays. Add-on services like hair washing or styling. Group packages for special events. Membership programs for frequent clients. Regular pricing reviews based on costs and competition. Clear menu display with all prices visible."""
            },
            {
                "title": "Quality Control and Service Standards",
                "content": """Maintain consistent service quality through standardized procedures and regular training. Establish detailed service protocols for each offering. Conduct regular quality assessments and client feedback reviews. Implement peer review systems among barbers. Maintain cleanliness standards that exceed health department requirements. Ensure every client receives same level of professional attention. Document service complaints and resolution processes. Regular staff training on new techniques and trends. Mystery shopper programs for objective quality assessment. Client satisfaction surveys and follow-up protocols. Continuous improvement based on feedback and industry best practices."""
            }
        ]
        
        for knowledge in operations_knowledge:
            await self._add_document(
                knowledge["title"],
                knowledge["content"],
                BusinessKnowledgeType.BARBERSHOP_OPERATIONS
            )
    
    async def _populate_customer_service(self):
        """Populate customer service knowledge"""
        print("\n🤝 Populating Customer Service Knowledge...")
        
        customer_service_knowledge = [
            {
                "title": "Customer Greeting and First Impressions",
                "content": """The first 30 seconds determine client satisfaction and retention. Greet every client within 10 seconds of entry with eye contact and genuine smile. Use client names when known to personalize experience. Offer beverage or reading material during wait times. Acknowledge wait times and provide realistic estimates. Maintain professional appearance and grooming standards. Create welcoming atmosphere with appropriate music and lighting. Keep reception area clean and organized. Display current certifications and awards prominently. Train all staff in consistent greeting protocols. Handle multiple clients efficiently without appearing rushed. Remember returning clients' preferences and previous conversations."""
            },
            {
                "title": "Handling Difficult Customers and Complaints",
                "content": """Transform challenging situations into loyalty-building opportunities through professional conflict resolution. Listen actively without interrupting when clients express concerns. Acknowledge feelings and show empathy for their situation. Ask clarifying questions to understand root issues. Offer specific solutions or alternatives promptly. Follow up to ensure resolution satisfaction. Document incidents for pattern identification and training purposes. Empower staff to offer reasonable remedies immediately. Escalate complex issues to management when necessary. Maintain calm, professional demeanor regardless of client behavior. Use negative feedback as improvement opportunities. Train staff in de-escalation techniques regularly."""
            },
            {
                "title": "Building Long-term Client Relationships",
                "content": """Develop lasting relationships that generate consistent revenue and referrals. Maintain detailed client preference records including favorite styles and products. Remember personal details like family, hobbies, and important events. Provide consistent service quality regardless of staff member. Send birthday and holiday greetings to valued clients. Offer loyalty programs with meaningful rewards. Check in periodically between visits via text or email. Provide styling advice and product recommendations. Share industry news and trends relevant to client interests. Create VIP experiences for top clients. Encourage feedback and implement suggestions when possible. Build community through client events and referral programs."""
            },
            {
                "title": "Appointment Communication and Scheduling",
                "content": """Clear communication prevents misunderstandings and enhances client experience. Confirm appointments 24 hours in advance with service details. Explain pricing clearly before beginning any service. Communicate realistic time expectations for complex services. Provide clear instructions for pre-appointment preparation. Send location and parking information to new clients. Offer multiple communication channels (phone, text, email, app). Handle rescheduling requests promptly and courteously. Maintain updated contact information for all clients. Send post-appointment care instructions and product recommendations. Follow up after services to ensure satisfaction. Create efficient systems for managing appointment changes."""
            },
            {
                "title": "Customer Retention Strategies and Loyalty Programs",
                "content": """Implement systematic approaches to maintain high client retention rates. Track client visit frequency and reach out to inactive clients. Offer graduated loyalty rewards based on visit frequency and spending. Create referral incentives for existing clients. Provide exclusive access to new services or products. Send personalized offers based on service history. Maintain consistent quality across all staff members. Address service issues quickly and fairly. Celebrate client milestones and special occasions. Gather feedback regularly through surveys and conversations. Analyze retention data to identify improvement opportunities. Develop win-back campaigns for lost clients."""
            }
        ]
        
        for knowledge in customer_service_knowledge:
            await self._add_document(
                knowledge["title"],
                knowledge["content"],
                BusinessKnowledgeType.CUSTOMER_SERVICE
            )
    
    async def _populate_marketing_strategies(self):
        """Populate marketing strategies knowledge"""
        print("\n📢 Populating Marketing Strategies Knowledge...")
        
        marketing_knowledge = [
            {
                "title": "Social Media Marketing for Barbershops",
                "content": """Leverage social media platforms to build brand awareness and attract new clients. Instagram performs best for barbershops with before/after photos and styling videos. Post consistently 3-5 times per week during peak engagement hours. Use relevant hashtags like #barbershop, #mensgrooming, and location-specific tags. Share behind-the-scenes content to humanize the brand. Feature client transformations with permission. Collaborate with local influencers and stylists. Run targeted ads to men aged 18-45 within 5-mile radius. Engage with followers through comments and direct messages. Share styling tips and grooming advice. Showcase staff expertise and personality. Track engagement metrics and adjust strategy accordingly."""
            },
            {
                "title": "Local Community Engagement and Partnerships",
                "content": """Build strong community connections that generate referrals and brand loyalty. Partner with local gyms and fitness centers for cross-promotion opportunities. Sponsor youth sports teams and community events. Participate in local business associations and networking groups. Offer services at community events and charity fundraisers. Collaborate with men's clothing stores and shoe stores. Create partnerships with wedding planners and photographers. Support local schools and educational programs. Host community events in your barbershop space. Volunteer grooming services for job fairs and professional development events. Display community awards and recognitions prominently. Maintain visible presence in local business directories."""
            },
            {
                "title": "Customer Referral Programs and Incentives",
                "content": """Develop systematic referral programs that incentivize existing clients to bring new customers. Offer $10 credit for each successful referral that books and completes a service. Create tiered rewards with increasing benefits for multiple referrals. Provide referral cards for easy sharing with friends and family. Track referral sources to identify most effective clients. Send thank you notes and bonus rewards to top referrers. Create exclusive referral-only promotions and events. Use referral tracking software to automate reward distribution. Feature successful referrers in marketing materials with permission. Offer family discounts when multiple household members book. Create group booking incentives for friends and coworkers. Regular communicate referral program benefits to all clients.",
            },
            {
                "title": "Digital Marketing and Online Presence Optimization",
                "content": """Establish strong online presence to attract digital-savvy customers. Maintain updated Google My Business profile with current hours, services, and photos. Collect and respond to online reviews on Google, Yelp, and Facebook. Optimize website for mobile devices and local SEO. Use online booking systems integrated with your website. Create engaging content for blog and social media platforms. Run Google Ads targeting local barbershop searches. Implement email marketing campaigns for client retention. Use analytics to track website traffic and conversion rates. Maintain consistent branding across all digital platforms. Showcase client testimonials and before/after photos online. Create instructional videos for social media and YouTube."""
            },
            {
                "title": "Seasonal Promotions and Special Events",
                "content": """Plan strategic seasonal promotions that drive traffic during slower periods and capitalize on peak demand. Back-to-school promotions in August and September targeting students and professionals. Holiday grooming packages for Thanksgiving through New Year's. Father's Day promotions and gift certificates. Summer wedding season packages for grooms and groomsmen. Valentine's Day couples packages and gift certificates. Graduation season promotions for students entering workforce. Tax refund season promotions in early spring. Anniversary celebrations for barbershop milestones. Local event tie-ins like sports championships or festivals. Create limited-time offers to generate urgency. Plan promotions 6-8 weeks in advance for proper marketing."""
            }
        ]
        
        for knowledge in marketing_knowledge:
            await self._add_document(
                knowledge["title"],
                knowledge["content"],
                BusinessKnowledgeType.MARKETING_STRATEGIES
            )
    
    async def _populate_financial_management(self):
        """Populate financial management knowledge"""
        print("\n💰 Populating Financial Management Knowledge...")
        
        financial_knowledge = [
            {
                "title": "Revenue Optimization and Pricing Strategies",
                "content": """Maximize barbershop revenue through strategic pricing and service optimization. Analyze competitor pricing to ensure competitive positioning while maintaining profitability. Implement dynamic pricing for peak hours and high-demand periods. Bundle services to increase average transaction value. Offer premium service tiers with higher margins. Create membership programs for recurring revenue. Track service profitability and focus marketing on high-margin offerings. Monitor seasonal trends and adjust pricing accordingly. Implement loyalty programs that encourage higher spending. Upsell complementary services during appointments. Regular review pricing strategy based on costs and market conditions. Use data analytics to identify revenue optimization opportunities.",
            },
            {
                "title": "Cash Flow Management and Forecasting",
                "content": """Maintain healthy cash flow through systematic monitoring and planning. Track daily, weekly, and monthly cash flow patterns. Create cash flow projections 3-6 months in advance. Identify seasonal fluctuations and plan accordingly. Maintain cash reserves for slow periods and unexpected expenses. Negotiate favorable payment terms with suppliers. Implement efficient billing and collection processes. Monitor accounts receivable and follow up on overdue payments. Plan major purchases during high cash flow periods. Use cash flow data to make informed business decisions. Establish line of credit for emergency situations. Regular review and update cash flow forecasts based on actual performance.",
            },
            {
                "title": "Expense Management and Cost Control",
                "content": """Control costs while maintaining service quality through systematic expense management. Track all expenses by category including rent, utilities, supplies, and labor. Negotiate bulk pricing with suppliers for products and equipment. Implement inventory management systems to reduce waste. Monitor utility costs and implement energy-saving measures. Regular review insurance policies for cost optimization opportunities. Track labor costs as percentage of revenue. Implement preventive maintenance to reduce equipment repair costs. Compare vendor pricing annually for services like cleaning and pest control. Use expense tracking software for accurate reporting. Set expense budgets and monitor variances monthly. Identify cost reduction opportunities without compromising quality.",
            },
            {
                "title": "Profit Margin Analysis and Improvement",
                "content": """Analyze and improve profit margins through systematic cost and revenue management. Calculate gross profit margins for each service offered. Identify highest and lowest margin services for strategic focus. Track profit margins monthly and investigate significant changes. Optimize product mix to emphasize high-margin services. Negotiate better pricing with suppliers to improve product margins. Implement efficient scheduling to maximize productivity. Reduce waste in products and supplies through better inventory management. Train staff to upsell profitable services and products. Monitor labor costs relative to revenue generation. Use profit margin data to guide pricing decisions. Set profit margin targets and track progress regularly.",
            },
            {
                "title": "Tax Planning and Record Keeping",
                "content": """Maintain accurate financial records and implement tax planning strategies. Use professional accounting software for transaction tracking. Separate business and personal expenses clearly. Keep detailed receipts and documentation for all business expenses. Track mileage for business travel and client visits. Document business meals and entertainment expenses properly. Maintain payroll records and tax withholdings. Plan quarterly tax payments to avoid penalties. Work with qualified accountant for tax preparation and planning. Take advantage of business deductions for equipment and supplies. Keep records for minimum seven years as required. Implement bookkeeping procedures for daily transaction recording.",
            }
        ]
        
        for knowledge in financial_knowledge:
            await self._add_document(
                knowledge["title"],
                knowledge["content"],
                BusinessKnowledgeType.FINANCIAL_MANAGEMENT
            )
    
    async def _populate_technical_operations(self):
        """Populate technical operations knowledge"""
        print("\n🔧 Populating Technical Operations Knowledge...")
        
        technical_knowledge = [
            {
                "title": "Point of Sale System Setup and Management",
                "content": """Implement and manage POS systems that streamline operations and improve customer experience. Choose POS system with appointment scheduling integration. Set up inventory tracking for products and supplies. Configure payment processing for credit cards and mobile payments. Train staff on system operation and troubleshooting. Set up automated reporting for daily sales and inventory. Integrate customer database with appointment scheduling. Implement loyalty program tracking through POS. Set up backup systems and data protection. Regular update software and security patches. Monitor system performance and resolve issues quickly. Generate financial reports for tax and business analysis purposes.",
            },
            {
                "title": "Appointment Scheduling Software Implementation",
                "content": """Deploy comprehensive scheduling systems that optimize booking efficiency and customer convenience. Select software with online booking capabilities and mobile apps. Configure service menus with accurate time estimates and pricing. Set up staff schedules and availability management. Implement automated appointment reminders via SMS and email. Create booking rules for different service types and staff members. Set up customer profiles with service history and preferences. Integrate payment processing for deposits and full payments. Configure reporting for appointment analytics and trends. Train staff on system administration and customer support. Implement waitlist management for busy periods. Regular backup appointment data and maintain system security.",
            },
            {
                "title": "Equipment Technology and Digital Tools",
                "content": """Leverage modern technology to enhance service quality and operational efficiency. Invest in high-quality professional clippers with multiple speed settings. Use tablet-based check-in systems for customer convenience. Implement digital payment systems including contactless options. Install professional sound systems with zone control capabilities. Use LED lighting systems for energy efficiency and better visibility. Implement security systems with cameras and access control. Set up WiFi networks for staff and customer use. Use professional-grade sterilization equipment. Implement digital signage for menu displays and promotions. Use mobile devices for inventory management and customer communication. Regular update and maintain all digital systems.",
            },
            {
                "title": "Data Management and Customer Analytics",
                "content": """Harness customer data to improve service delivery and business decision-making. Maintain comprehensive customer databases with service history and preferences. Track customer retention rates and visit frequency patterns. Analyze service popularity and profitability by time period. Monitor peak hours and schedule staff accordingly. Use data to identify upselling and cross-selling opportunities. Track customer satisfaction through surveys and feedback. Generate reports on revenue trends and seasonal patterns. Implement data backup and security protocols. Use analytics to optimize service menu and pricing. Track marketing campaign effectiveness through customer data. Create customer segments for targeted marketing efforts.",
            },
            {
                "title": "Digital Security and Privacy Protection",
                "content": """Protect customer data and business information through comprehensive security measures. Implement strong password policies for all systems and accounts. Use encryption for customer data storage and transmission. Regular backup business data to secure cloud storage. Install and maintain antivirus software on all computers. Train staff on phishing and social engineering threats. Implement access controls for sensitive business information. Use secure payment processing systems that are PCI compliant. Monitor network traffic for suspicious activity. Maintain customer privacy in accordance with applicable laws. Regular update software and security patches. Create incident response plans for data breaches or security incidents.",
            }
        ]
        
        for knowledge in technical_knowledge:
            await self._add_document(
                knowledge["title"],
                knowledge["content"],
                BusinessKnowledgeType.TECHNICAL_OPERATIONS
            )
    
    async def _populate_business_strategy(self):
        """Populate business strategy knowledge"""
        print("\n📈 Populating Business Strategy Knowledge...")
        
        strategy_knowledge = [
            {
                "title": "Market Analysis and Competitive Positioning",
                "content": """Conduct thorough market analysis to identify opportunities and threats in the barbershop industry. Research local competitors' pricing, services, and customer reviews. Identify underserved market segments in your area. Analyze demographic trends and population growth patterns. Study consumer behavior and grooming trends. Monitor new barbershops opening in your market area. Assess competitive advantages and unique selling propositions. Identify gaps in local market that your barbershop can fill. Track industry trends and emerging service offerings. Evaluate potential for market expansion or additional locations. Use market research to guide pricing and service decisions. Regular update competitive analysis to maintain strategic advantage.",
            },
            {
                "title": "Growth Planning and Expansion Strategies",
                "content": """Develop systematic approaches for sustainable business growth and expansion. Set specific, measurable growth targets for revenue and customer base. Evaluate opportunities for additional service offerings. Assess potential for multiple location development. Create financial projections for expansion scenarios. Develop staffing plans to support growth objectives. Identify capital requirements for expansion investments. Research franchise opportunities and partnership models. Evaluate acquisition opportunities of existing barbershops. Create brand standards that can be replicated across locations. Develop systems and processes that scale efficiently. Plan marketing strategies for new market penetration.",
            },
            {
                "title": "Brand Development and Positioning Strategy",
                "content": """Build strong brand identity that differentiates your barbershop in the marketplace. Define target customer demographics and psychographics clearly. Develop unique value proposition that resonates with target market. Create consistent visual identity including logo, colors, and design elements. Establish brand voice and messaging across all communications. Design customer experience that reinforces brand positioning. Train staff to embody brand values in every interaction. Develop brand guidelines for consistent implementation. Create brand storytelling that connects emotionally with customers. Monitor brand perception through customer feedback and reviews. Protect brand reputation through quality control and service standards. Evolve brand positioning based on market feedback and changing trends.",
            },
            {
                "title": "Partnership and Collaboration Opportunities",
                "content": """Identify and develop strategic partnerships that enhance business growth and customer value. Partner with local businesses for cross-promotional opportunities. Collaborate with grooming product suppliers for exclusive offerings. Develop relationships with wedding planners and event coordinators. Create partnerships with men's clothing stores and fashion retailers. Work with local gyms and fitness centers for member discounts. Partner with corporate clients for employee grooming services. Collaborate with barber schools for apprenticeship programs. Develop supplier relationships for volume pricing advantages. Create referral partnerships with complementary service providers. Establish relationships with local media for publicity opportunities. Build industry connections through professional associations and trade shows.",
            },
            {
                "title": "Innovation and Service Development",
                "content": """Stay ahead of industry trends through continuous innovation and service development. Research emerging grooming trends and customer preferences. Experiment with new service offerings in limited-time trials. Invest in continuing education for staff on latest techniques. Introduce seasonal services to capitalize on market demand. Develop signature services that differentiate from competitors. Create package deals that bundle popular services. Implement customer feedback systems for service improvement ideas. Test new products before adding to regular menu. Stay current with celebrity and influencer grooming trends. Attend industry trade shows and educational conferences. Create innovation budget for equipment and service development.",
            }
        ]
        
        for knowledge in strategy_knowledge:
            await self._add_document(
                knowledge["title"],
                knowledge["content"],
                BusinessKnowledgeType.BUSINESS_STRATEGY
            )
    
    async def _populate_industry_best_practices(self):
        """Populate industry best practices knowledge"""
        print("\n🏆 Populating Industry Best Practices Knowledge...")
        
        best_practices_knowledge = [
            {
                "title": "Professional Barber Standards and Certification",
                "content": """Maintain highest professional standards through proper certification and ongoing education. Obtain state barbering license and maintain current certification. Complete continuing education requirements annually. Stay updated on health department regulations and compliance. Join professional barber associations for networking and education. Attend workshops and seminars on new techniques and trends. Maintain professional liability insurance coverage. Display all licenses and certifications prominently. Follow industry standard sanitation and safety protocols. Pursue advanced certifications in specialized services. Mentor new barbers and apprentices. Contribute to industry reputation through professional conduct.",
            },
            {
                "title": "Health and Safety Protocols",
                "content": """Implement comprehensive health and safety measures that exceed regulatory requirements. Sanitize all tools between clients using hospital-grade disinfectants. Use single-use items like neck strips and razor blades for each client. Maintain proper ventilation to reduce chemical exposure and airborne particles. Train staff on bloodborne pathogen protocols and universal precautions. Keep first aid kits fully stocked and easily accessible. Post safety information and emergency procedures prominently. Regular inspect equipment for safety hazards and proper operation. Maintain clean and organized work areas at all times. Document safety training and incident reporting procedures. Stay updated on OSHA requirements and health department regulations. Implement COVID-19 safety protocols as required.",
            },
            {
                "title": "Customer Service Excellence Standards",
                "content": """Establish service excellence standards that create exceptional customer experiences. Greet every customer within 30 seconds of arrival. Maintain professional appearance and grooming at all times. Listen actively to customer requests and ask clarifying questions. Provide honest recommendations based on customer needs and preferences. Complete services efficiently without rushing or compromising quality. Offer additional services that complement primary service requests. Handle complaints promptly and professionally with empowerment to resolve issues. Follow up with customers after service to ensure satisfaction. Maintain detailed customer preference records for personalized service. Train staff regularly on customer service techniques and expectations. Measure customer satisfaction through surveys and feedback systems.",
            },
            {
                "title": "Business Operations and Management Standards",
                "content": """Implement systematic business operations that ensure consistency and profitability. Maintain detailed financial records and regular financial analysis. Implement inventory management systems to control costs and waste. Establish clear job descriptions and performance expectations for all staff. Create employee handbooks with policies and procedures. Conduct regular staff meetings and performance reviews. Maintain equipment through preventive maintenance schedules. Implement quality control systems for service consistency. Use data analytics to make informed business decisions. Establish vendor relationships with reliable suppliers. Create emergency procedures and business continuity plans. Regular review and update all business policies and procedures.",
            },
            {
                "title": "Professional Development and Training Standards",
                "content": """Invest in continuous professional development for all team members. Provide comprehensive training for new hires on technical skills and customer service. Offer ongoing education opportunities for current staff. Encourage participation in industry conferences and workshops. Create mentorship programs pairing experienced and new barbers. Implement performance improvement plans with specific goals and timelines. Provide leadership development opportunities for advancement. Cross-train staff on multiple services and operational functions. Document training programs and track completion. Reward professional development achievements and certifications. Create career advancement paths within the organization. Build learning culture that encourages continuous improvement.",
            }
        ]
        
        for knowledge in best_practices_knowledge:
            await self._add_document(
                knowledge["title"],
                knowledge["content"],
                BusinessKnowledgeType.INDUSTRY_BEST_PRACTICES
            )
    
    async def _populate_regulatory_compliance(self):
        """Populate regulatory compliance knowledge"""
        print("\n📋 Populating Regulatory Compliance Knowledge...")
        
        compliance_knowledge = [
            {
                "title": "State Licensing and Certification Requirements",
                "content": """Ensure full compliance with state licensing requirements for barbershop operations. Obtain barbershop establishment license from state board of barbering. Ensure all barbers have current individual licenses in good standing. Display all licenses prominently in public areas. Renew licenses before expiration dates to avoid service interruptions. Maintain records of continuing education completion for all licensed staff. Report any license violations or disciplinary actions to appropriate authorities. Stay updated on changes to licensing requirements and regulations. Ensure apprentices have proper permits and supervision. Maintain liability insurance as required by licensing boards. Submit required reports and fees on schedule. Train staff on professional standards and ethical conduct.",
            },
            {
                "title": "Health Department Regulations and Inspections",
                "content": """Maintain compliance with local and state health department regulations. Follow sanitation requirements for all tools and equipment. Maintain proper storage of chemicals and disinfectants. Implement proper waste disposal procedures for contaminated materials. Keep facilities clean and properly ventilated as required. Pass regular health department inspections without violations. Maintain hot water temperature at required minimums. Store towels and linens in sanitary conditions. Display health permits and inspection certificates. Train staff on health and safety protocols. Document sanitation procedures and compliance efforts. Address any violations immediately and implement corrective actions.",
            },
            {
                "title": "Employment Law and Labor Standards",
                "content": """Comply with federal and state employment laws and labor standards. Classify workers correctly as employees or independent contractors. Maintain proper payroll records and tax withholdings. Follow minimum wage and overtime requirements. Provide required breaks and meal periods. Maintain equal employment opportunity policies and practices. Prevent workplace discrimination and harassment. Post required labor law notices in employee areas. Maintain workers' compensation insurance coverage. Follow family and medical leave requirements. Provide safe working environment free from hazards. Document employment decisions and maintain personnel files.",
            },
            {
                "title": "Business Registration and Tax Compliance",
                "content": """Maintain proper business registration and tax compliance at all levels. Register business with appropriate state and local authorities. Obtain required business licenses and permits. Maintain current sales tax registration and file returns on schedule. Comply with income tax filing requirements and deadlines. Maintain proper business insurance coverage. File required business reports with state authorities. Keep accurate financial records for tax purposes. Separate business and personal finances clearly. Work with qualified accountant for tax planning and preparation. Stay updated on changes to tax laws and regulations. Implement systems for tracking deductible business expenses.",
            },
            {
                "title": "Data Privacy and Customer Protection",
                "content": """Protect customer personal information and comply with privacy regulations. Implement secure systems for storing customer data. Limit access to customer information to authorized personnel only. Obtain customer consent for marketing communications. Provide customers with privacy policy information. Allow customers to access and update their personal information. Secure payment processing systems with proper encryption. Train staff on confidentiality requirements and procedures. Implement data breach response procedures. Comply with applicable privacy laws and regulations. Regular review and update privacy policies and procedures. Document privacy compliance efforts and training.",
            }
        ]
        
        for knowledge in compliance_knowledge:
            await self._add_document(
                knowledge["title"],
                knowledge["content"],
                BusinessKnowledgeType.REGULATORY_COMPLIANCE
            )
    
    async def _populate_staff_management(self):
        """Populate staff management knowledge"""
        print("\n👥 Populating Staff Management Knowledge...")
        
        staff_knowledge = [
            {
                "title": "Hiring and Recruitment Best Practices",
                "content": """Implement systematic hiring processes that attract and select high-quality barbers. Define clear job requirements including technical skills and experience levels. Use multiple recruitment channels including online job boards and industry networks. Create compelling job descriptions that highlight growth opportunities and benefits. Implement structured interview processes with consistent evaluation criteria. Check references and verify licenses and certifications. Conduct practical skill demonstrations during interview process. Assess cultural fit and customer service attitude. Provide clear job offers with compensation and benefit details. Implement thorough onboarding process for new hires. Document hiring decisions and maintain compliance with employment laws. Create diverse candidate pipelines for future hiring needs.",
            },
            {
                "title": "Training and Professional Development Programs",
                "content": """Develop comprehensive training programs that enhance skills and career growth. Create structured onboarding programs covering policies, procedures, and expectations. Provide technical training on cutting techniques and new services. Offer customer service training focused on barbershop environment. Implement mentorship programs pairing experienced and new staff. Support continuing education through conferences and workshops. Create advancement opportunities within the organization. Provide cross-training on different services and equipment. Document training completion and skill development progress. Offer leadership development for potential managers. Encourage professional certifications and specializations. Regular evaluate training effectiveness and update programs.",
            },
            {
                "title": "Performance Management and Evaluation",
                "content": """Establish fair and effective performance management systems. Set clear performance expectations and measurable goals. Conduct regular performance reviews with constructive feedback. Implement progressive discipline procedures for performance issues. Recognize and reward excellent performance and achievements. Create performance improvement plans with specific timelines and support. Track key performance indicators including customer satisfaction and productivity. Provide ongoing coaching and feedback throughout the year. Document performance discussions and decisions thoroughly. Address performance problems promptly and consistently. Create advancement opportunities for high performers. Use performance data to guide training and development decisions.",
            },
            {
                "title": "Compensation and Benefits Strategy",
                "content": """Design competitive compensation packages that attract and retain quality staff. Research market rates for barbering positions in your area. Offer base salary plus commission or tip sharing arrangements. Provide performance bonuses for achieving specific goals. Offer health insurance and other benefits where possible. Create retirement savings plans or IRA contributions. Provide paid time off and holiday pay. Offer education reimbursement for professional development. Implement employee discount programs for services and products. Consider profit-sharing arrangements for long-term employees. Regular review compensation to maintain competitiveness. Communicate total compensation value to employees clearly.",
            },
            {
                "title": "Team Building and Staff Retention",
                "content": """Foster positive work environment that encourages long-term employment. Create inclusive team culture with open communication. Organize regular team meetings and social events. Recognize individual and team achievements publicly. Provide opportunities for input on business decisions. Implement flexible scheduling where possible. Address workplace conflicts promptly and fairly. Create mentorship opportunities between experienced and new staff. Offer career advancement paths within the organization. Conduct exit interviews to understand turnover reasons. Monitor staff satisfaction through surveys and feedback. Implement retention strategies based on feedback and industry best practices.",
            }
        ]
        
        for knowledge in staff_knowledge:
            await self._add_document(
                knowledge["title"],
                knowledge["content"],
                BusinessKnowledgeType.STAFF_MANAGEMENT
            )
    
    async def _populate_product_inventory(self):
        """Populate product inventory knowledge"""
        print("\n📦 Populating Product Inventory Knowledge...")
        
        inventory_knowledge = [
            {
                "title": "Inventory Management Systems and Procedures",
                "content": """Implement systematic inventory management to control costs and ensure product availability. Use inventory management software integrated with POS system. Establish minimum and maximum stock levels for all products. Implement first-in-first-out rotation to prevent product expiration. Conduct regular physical inventory counts and reconcile discrepancies. Track product usage patterns and seasonal variations. Set up automated reorder points for critical products. Maintain relationships with multiple suppliers for better pricing and reliability. Document receiving procedures and quality checks. Track product costs and margins for profitability analysis. Implement security measures to prevent theft and shrinkage. Train staff on proper inventory handling and storage procedures.",
            },
            {
                "title": "Product Selection and Vendor Management",
                "content": """Choose quality products and reliable vendors that support business objectives. Research product quality and customer reviews before adding new lines. Negotiate favorable pricing and payment terms with suppliers. Evaluate vendor reliability and delivery performance regularly. Diversify supplier base to reduce dependency risks. Attend trade shows to discover new products and vendors. Maintain professional relationships with vendor representatives. Compare pricing regularly to ensure competitive costs. Implement vendor scorecards to track performance metrics. Negotiate return policies for unsold or defective products. Consider private label opportunities for unique offerings. Document vendor agreements and terms clearly.",
            },
            {
                "title": "Product Sales and Retail Strategy",
                "content": """Maximize retail revenue through effective product sales strategies. Display products attractively near customer seating and checkout areas. Train staff to recommend products during services. Create product bundles and packages for increased sales. Offer samples or trials of new products to encourage purchases. Implement loyalty program rewards for product purchases. Track product sales performance and adjust inventory accordingly. Price products competitively while maintaining healthy margins. Use seasonal promotions to move slow-selling inventory. Create gift packages and certificates for special occasions. Educate customers on proper product usage and benefits. Monitor competitor pricing and adjust strategy as needed.",
            },
            {
                "title": "Supplier Relationships and Negotiation",
                "content": """Build strong supplier relationships that support business growth and profitability. Maintain open communication with supplier representatives. Pay invoices promptly to maintain good credit standing. Provide feedback on product performance and customer response. Negotiate volume discounts for large orders. Discuss exclusive product arrangements for competitive advantage. Work with suppliers on promotional opportunities and marketing support. Evaluate new product introductions and promotional offers. Request training and education on new products for staff. Negotiate payment terms that support cash flow management. Maintain backup suppliers for critical products. Document all agreements and terms in writing.",
            },
            {
                "title": "Cost Control and Profit Optimization",
                "content": """Manage inventory costs effectively to maximize profitability. Track cost of goods sold as percentage of sales revenue. Monitor waste and shrinkage to identify control opportunities. Implement proper storage to prevent product deterioration. Train staff on efficient product usage to reduce waste. Calculate product margins and focus on high-profit items. Review pricing regularly to maintain profitability. Negotiate better terms with suppliers for improved margins. Implement inventory turnover targets and monitor performance. Use data analytics to optimize product mix and ordering. Control carrying costs through efficient inventory levels. Create budgets for inventory purchases and monitor variances.",
            }
        ]
        
        for knowledge in inventory_knowledge:
            await self._add_document(
                knowledge["title"],
                knowledge["content"],
                BusinessKnowledgeType.PRODUCT_INVENTORY
            )

async def main():
    """Main function to populate comprehensive knowledge base"""
    populator = KnowledgeBasePopulator()
    await populator.populate_all_knowledge()

if __name__ == "__main__":
    asyncio.run(main())