"""
Marketing Expert Agent  
Specialized AI agent for digital marketing, social media, and customer acquisition strategies
"""

import asyncio
import json
import logging
import random
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple

from .base_agent import BaseAgent, AgentPersonality, MessageDomain, AgentResponse

logger = logging.getLogger(__name__)

class MarketingExpertAgent(BaseAgent):
    """
    Specialized agent focused on marketing strategy, social media, and customer acquisition
    """
    
    def __init__(self):
        super().__init__(
            personality=AgentPersonality.MARKETING_EXPERT,
            name="Sophia",
            description="Digital Marketing Strategist specializing in local business growth and social media marketing"
        )
    
    def _initialize_personality(self):
        """Initialize Marketing Expert personality traits and expertise"""
        self.expertise_areas = [
            "Social Media Marketing",
            "Local SEO & Google My Business",
            "Customer Acquisition",
            "Brand Development", 
            "Content Marketing",
            "Influencer Partnerships",
            "Review Management",
            "Email Marketing",
            "Referral Programs",
            "Community Engagement"
        ]
        
        self.personality_traits = {
            "communication_style": "Creative, enthusiastic, and trend-aware",
            "approach": "Data-driven creativity with authentic storytelling",
            "tone": "Energetic but professional, uses marketing terminology",
            "decision_making": "Audience-first with conversion focus",
            "priorities": ["Brand authenticity", "Customer engagement", "Measurable growth"],
            "catchphrases": [
                "Your brand tells a story - let's make it compelling",
                "Authentic engagement beats flashy advertising",
                "Every customer interaction is a marketing opportunity"
            ]
        }
        
        self.response_templates = {
            "social_media": "Your social presence needs {improvement}. Here's my strategy...",
            "customer_acquisition": "To attract {target_customers}, we should focus on...",
            "brand_development": "Your brand identity should emphasize {unique_value}...",
            "local_marketing": "Local marketing is about {community_connection}..."
        }
    
    async def analyze_message(self, message: str, context: Dict[str, Any]) -> Tuple[bool, float]:
        """Analyze if this message requires marketing expertise"""
        
        marketing_keywords = [
            # Social Media & Digital
            'social media', 'instagram', 'facebook', 'tiktok', 'youtube', 'twitter',
            'content', 'post', 'hashtag', 'viral', 'engagement', 'followers',
            # Marketing Strategy
            'marketing', 'advertising', 'promotion', 'campaign', 'brand', 'branding',
            'customer acquisition', 'lead generation', 'referral', 'word of mouth',
            # Local Marketing
            'google my business', 'reviews', 'local seo', 'google reviews',
            'community', 'local marketing', 'neighborhood',
            # Customer Experience
            'attract customers', 'new customers', 'customer retention',
            'customer experience', 'loyalty program', 'referrals'
        ]
        
        message_lower = message.lower()
        keyword_matches = sum(1 for keyword in marketing_keywords if keyword in message_lower)
        
        # High confidence for direct marketing questions
        if keyword_matches >= 2:
            confidence = min(0.95, 0.75 + (keyword_matches * 0.04))
            return True, confidence
        
        # Medium confidence for single marketing keyword  
        elif keyword_matches == 1:
            confidence = 0.80
            return True, confidence
        
        # Check for indirect marketing context
        indirect_marketing = [
            'get more customers', 'grow my business', 'increase visibility',
            'improve reputation', 'build brand', 'marketing help'
        ]
        
        for phrase in indirect_marketing:
            if phrase in message_lower:
                return True, 0.75
        
        return False, 0.0
    
    async def generate_response(self, message: str, context: Dict[str, Any]) -> AgentResponse:
        """Generate marketing strategy response"""
        
        try:
            # Extract business context
            business_name = context.get('business_name', 'Your Barbershop')
            customer_count = context.get('customer_count', 120)
            monthly_revenue = context.get('monthly_revenue', 4500)
            location = context.get('location', 'your local area')
            
            # Analyze the specific marketing topic
            marketing_topic = self._identify_marketing_topic(message)
            
            # Generate specialized response based on topic
            if marketing_topic == "social_media":
                response_text, recommendations = await self._generate_social_media_advice(
                    message, business_name, customer_count
                )
            elif marketing_topic == "customer_acquisition":
                response_text, recommendations = await self._generate_acquisition_advice(
                    message, customer_count, location
                )
            elif marketing_topic == "brand_development":
                response_text, recommendations = await self._generate_branding_advice(
                    message, business_name, context
                )
            elif marketing_topic == "local_marketing":
                response_text, recommendations = await self._generate_local_marketing_advice(
                    message, business_name, location
                )
            elif marketing_topic == "review_management":
                response_text, recommendations = await self._generate_review_advice(
                    message, business_name
                )
            else:
                response_text, recommendations = await self._generate_general_marketing_advice(
                    message, context
                )
            
            # Add conversation to history
            self.add_to_conversation_history(message, response_text)
            
            # Format and return response
            return self.format_response(
                response_text=response_text,
                recommendations=recommendations,
                context=context,
                confidence=0.87
            )
            
        except Exception as e:
            logger.error(f"Marketing Expert error: {e}")
            return self._generate_fallback_response(message, context)
    
    def _identify_marketing_topic(self, message: str) -> str:
        """Identify the specific marketing topic being discussed"""
        message_lower = message.lower()
        
        if any(word in message_lower for word in ['social', 'instagram', 'facebook', 'tiktok', 'content']):
            return "social_media"
        elif any(word in message_lower for word in ['customers', 'attract', 'acquisition', 'new clients']):
            return "customer_acquisition"
        elif any(word in message_lower for word in ['brand', 'branding', 'identity', 'logo']):
            return "brand_development"
        elif any(word in message_lower for word in ['local', 'community', 'neighborhood', 'google my business']):
            return "local_marketing"
        elif any(word in message_lower for word in ['review', 'reviews', 'rating', 'reputation']):
            return "review_management"
        else:
            return "general_marketing"
    
    async def _generate_social_media_advice(self, message: str, business_name: str, 
                                          customer_count: int) -> Tuple[str, List[str]]:
        """Generate social media marketing advice"""
        
        target_followers = customer_count * 3  # Target 3x customer count in followers
        posting_frequency = "3-4 times per week"
        
        response = f"""**Social Media Strategy for {business_name}**

Your social media is your digital storefront and word-of-mouth amplifier. With {customer_count} customers, you should aim for {target_followers}+ engaged followers across platforms.

**The Barbershop Content Formula:**
• 40% - Before/after transformations (your best content!)
• 30% - Behind-the-scenes (your personality and process)
• 20% - Educational content (grooming tips, style trends)
• 10% - Community/lifestyle content (local events, team)

**Platform Priority:**
1. **Instagram** - Perfect for visual transformations
2. **TikTok** - Great for process videos and younger demographics  
3. **Facebook** - Local community engagement and reviews
4. **Google My Business** - Critical for local discovery

Post {posting_frequency} consistently rather than sporadically. Quality and authenticity beat quantity every time."""
        
        recommendations = [
            "Create a content calendar with before/after photos scheduled 3-4x weekly",
            "Use local hashtags: #[YourCity]Barber #[YourCity]Haircuts #LocalBarber",
            "Partner with 2-3 local influencers for authentic content collaboration",
            "Set up Instagram/Facebook business accounts with proper local business info",
            "Create signature hashtag for your barbershop brand (#[BusinessName]Fresh)"
        ]
        
        return response, recommendations
    
    async def _generate_acquisition_advice(self, message: str, customer_count: int, 
                                         location: str) -> Tuple[str, List[str]]:
        """Generate customer acquisition advice"""
        
        monthly_target = max(15, int(customer_count * 0.15))  # 15% monthly growth target
        
        response = f"""**Customer Acquisition Strategy**

Current customer base: {customer_count}
Monthly new customer target: {monthly_target}

**The 3-Pillar Acquisition System:**

**1. Referral Amplification (40% of new customers)**
Your best customers are your best marketers. Make it easy and rewarding for them to refer friends.

**2. Local Visibility (35% of new customers)**  
Dominate local search and be visible where your customers spend time.

**3. Social Proof (25% of new customers)**
Let your work speak for itself through reviews and social content.

**The key insight:** People choose barbers based on trust and results. Focus on showcasing both through authentic customer experiences."""
        
        recommendations = [
            f"Launch referral program: Give ${15} credit for each new customer referred",
            "Optimize Google My Business with daily posts, photos, and quick responses",
            "Partner with 3 local businesses for cross-promotion (gym, clothing store, coffee shop)",
            "Create 'New Customer Special' for first-time visits with social media follow incentive",
            "Host monthly community events (grooming workshops, charity drives) for visibility"
        ]
        
        return response, recommendations
    
    async def _generate_branding_advice(self, message: str, business_name: str, 
                                      context: Dict[str, Any]) -> Tuple[str, List[str]]:
        """Generate brand development advice"""
        
        response = f"""**Brand Development Strategy for {business_name}**

Your brand is the emotional connection customers have with your business. It's not just your logo - it's every interaction, every experience, every story told about you.

**Brand Foundation Elements:**

**1. Brand Promise:** What transformation do you deliver?
*Example: "From good hair to confidence that shows"*

**2. Brand Personality:** How do you want to be perceived?
*Professional yet approachable? Classic yet modern? Trendy yet timeless?*

**3. Brand Voice:** How do you communicate?
*Friendly expert? Knowledgeable guide? Creative artist?*

**4. Visual Identity:** What's your look and feel?
*Colors, fonts, imagery style that reflects your personality*

**The strongest barbershop brands combine exceptional skill with memorable personality. What makes {business_name} uniquely valuable?**"""
        
        recommendations = [
            "Define your unique brand promise in one clear sentence",
            "Create consistent visual branding across all touchpoints (signage, social, business cards)",
            "Develop signature services or techniques that become part of your brand story",
            "Train staff to embody brand personality in every customer interaction",
            "Document brand guidelines for consistent marketing materials"
        ]
        
        return response, recommendations
    
    async def _generate_local_marketing_advice(self, message: str, business_name: str, 
                                             location: str) -> Tuple[str, List[str]]:
        """Generate local marketing advice"""
        
        response = f"""**Local Marketing Mastery for {business_name}**

Local marketing is about becoming part of the community fabric. You're not just a business in {location} - you're a neighbor, a community contributor, a local institution.

**The Local Dominance Strategy:**

**1. Google My Business Optimization**
This is your most important local marketing tool. 70% of local searches lead to action within 24 hours.

**2. Community Integration**
Become known as the barbershop that cares about the community, not just haircuts.

**3. Local Partnerships**
Collaborate with complementary businesses to expand your reach organically.

**4. Hyperlocal Content**
Create content that's specifically relevant to your neighborhood and community."""
        
        recommendations = [
            "Post daily updates on Google My Business with photos and business updates",
            "Sponsor local sports teams or community events for visibility and goodwill",
            "Create partnerships with local gyms, men's clothing stores, and professional services",
            "Develop 'Neighborhood Appreciation' promotions for nearby residents",
            "Host monthly 'Community Cuts' events for local causes or charities"
        ]
        
        return response, recommendations
    
    async def _generate_review_advice(self, message: str, business_name: str) -> Tuple[str, List[str]]:
        """Generate review management advice"""
        
        response = f"""**Review Management Strategy for {business_name}**

Reviews are your digital word-of-mouth. They influence 95% of purchasing decisions and directly impact your Google rankings.

**The Review Generation System:**

**1. Proactive Review Requests**
Don't leave reviews to chance. Make asking for reviews part of your service process.

**2. Multi-Platform Strategy**
Focus on Google Reviews (most important for local search), but also maintain presence on Facebook, Yelp, and industry-specific platforms.

**3. Response Management**
Every review response is a public conversation that future customers will read.

**4. Review Recovery**
Turn negative experiences into positive outcomes through thoughtful, professional responses.

**Goal:** Maintain 4.7+ stars with 50+ reviews across platforms."""
        
        recommendations = [
            "Create review request cards to give customers after great experiences",
            "Set up automated follow-up texts/emails asking for reviews 24 hours after service",
            "Respond to ALL reviews within 24 hours with personalized, professional messages",
            "Create a review recovery process for addressing negative feedback",
            "Display positive reviews prominently in your physical location and website"
        ]
        
        return response, recommendations
    
    async def _generate_general_marketing_advice(self, message: str, 
                                               context: Dict[str, Any]) -> Tuple[str, List[str]]:
        """Generate general marketing guidance"""
        
        response = f"""**Marketing Strategy Foundation**

Great marketing for barbershops isn't about tricks or gimmicks - it's about consistently showcasing your skills and building authentic relationships.

**The Marketing Hierarchy (in order of importance):**

1. **Exceptional Service** - Your marketing starts with the haircut
2. **Customer Experience** - How customers feel before, during, and after
3. **Social Proof** - Reviews, testimonials, before/after photos
4. **Local Presence** - Being known and visible in your community  
5. **Digital Marketing** - Social media, online presence, content creation

**Remember:** The best marketing is a great haircut that makes someone feel confident. Everything else amplifies that core value."""
        
        recommendations = [
            "Focus on perfecting customer experience before scaling marketing efforts",
            "Document before/after transformations with customer permission",
            "Create a simple marketing calendar for consistent presence",
            "Invest in professional photography of your work and space",
            "Build genuine relationships in your local business community"
        ]
        
        return response, recommendations
    
    def calculate_business_impact(self, recommendations: List[str], context: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate marketing impact of recommendations"""
        
        current_customers = context.get('customer_count', 120)
        current_revenue = context.get('monthly_revenue', 4500)
        
        # Marketing impact estimates
        customer_growth = random.uniform(0.12, 0.25)  # 12-25% customer growth
        retention_improvement = random.uniform(0.08, 0.15)  # 8-15% retention boost
        
        return {
            'revenue_impact': {
                'potential_increase': customer_growth * 0.8,  # Revenue growth slightly less than customer growth
                'confidence': 0.78,
                'timeframe': '6_months',
                'dollar_amount': current_revenue * customer_growth * 0.8
            },
            'customer_impact': {
                'retention_improvement': retention_improvement,
                'new_customer_potential': customer_growth,
                'satisfaction_boost': 0.12,
                'new_customers_monthly': current_customers * customer_growth / 6  # Over 6 months
            },
            'operational_impact': {
                'efficiency_gain': 0.05,  # Better customer flow from reviews/scheduling
                'cost_reduction': 0.02,   # More efficient marketing spend
                'time_savings': 0.10,     # Automated systems
                'brand_value_increase': 0.20
            },
            'risk_assessment': {
                'implementation_risk': 'low',
                'investment_required': 'moderate',
                'success_probability': 0.82
            }
        }
    
    def _get_primary_domain(self) -> MessageDomain:
        """Get the primary domain this agent handles"""
        return MessageDomain.MARKETING
    
    def _generate_follow_up_questions(self, context: Dict[str, Any]) -> List[str]:
        """Generate marketing-specific follow-up questions"""
        return [
            "What's your current social media presence like? Which platforms are you already using?",
            "Do you have any marketing budget allocated, or are you looking for organic strategies?",
            "What's your biggest challenge with attracting new customers right now?",
            "Are you comfortable being on camera for social media content, or would you prefer behind-the-scenes approaches?"
        ]
    
    def _generate_fallback_response(self, message: str, context: Dict[str, Any]) -> AgentResponse:
        """Generate fallback response for errors"""
        
        fallback_text = """I'm experiencing some technical difficulties, but I can still help with your marketing question!

As your marketing strategist, here are my core principles for barbershop marketing:

1. **Authenticity First** - Show real transformations and genuine customer experiences
2. **Local Focus** - Be the go-to barbershop in your neighborhood
3. **Social Proof** - Let your work and happy customers do the talking
4. **Consistency** - Regular posting and engagement beats sporadic bursts

Could you tell me more specifically what aspect of marketing you'd like help with? Social media, customer acquisition, branding, or local marketing?"""
        
        recommendations = [
            "Start documenting before/after photos with customer permission",
            "Optimize Google My Business listing with regular updates",
            "Create a simple referral program for existing customers"
        ]
        
        return self.format_response(
            response_text=fallback_text,
            recommendations=recommendations,
            context=context,
            confidence=0.65
        )

# Global instance
marketing_expert_agent = MarketingExpertAgent()