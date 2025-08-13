"""
AI Blog Content Generator for Barbershop SEO
Automated content creation with local SEO optimization
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
from enum import Enum
import re

import openai
import anthropic
from urllib.parse import quote

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ContentType(Enum):
    BLOG_POST = "blog_post"
    GMB_POST = "gmb_post"
    SOCIAL_MEDIA = "social_media"
    EMAIL_NEWSLETTER = "email_newsletter"
    SERVICE_PAGE = "service_page"


class ContentTone(Enum):
    PROFESSIONAL = "professional"
    FRIENDLY = "friendly"
    EXPERT = "expert"
    CASUAL = "casual"
    TRENDY = "trendy"


@dataclass
class ContentRequest:
    """Content generation request parameters"""
    barbershop_id: str
    barbershop_name: str
    location: str
    services: List[str]
    target_keywords: List[str]
    content_type: ContentType
    tone: ContentTone
    word_count: int
    topic: str
    include_cta: bool = True
    seasonal: Optional[str] = None
    target_audience: str = "men 25-45"


@dataclass
class GeneratedContent:
    """AI-generated content with SEO optimization"""
    title: str
    content: str
    meta_description: str
    target_keywords: List[str]
    headings: List[str]
    estimated_read_time: int
    seo_score: int
    publish_date: str
    slug: str
    tags: List[str]
    cta: str
    image_suggestions: List[str]


class AIBlogContentGenerator:
    """AI-powered blog content generation with local SEO"""
    
    def __init__(self, openai_api_key: str, anthropic_api_key: str):
        self.openai_client = openai.OpenAI(api_key=openai_api_key)
        self.anthropic_client = anthropic.Anthropic(api_key=anthropic_api_key)
    
    async def generate_blog_post(self, request: ContentRequest) -> GeneratedContent:
        """Generate comprehensive SEO-optimized blog post"""
        try:
            # Generate title and structure first
            title_and_outline = await self._generate_title_and_outline(request)
            
            # Generate full content
            content = await self._generate_full_content(request, title_and_outline)
            
            # Generate SEO elements
            seo_elements = await self._generate_seo_elements(request, content)
            
            # Create final content object
            generated_content = GeneratedContent(
                title=title_and_outline["title"],
                content=content,
                meta_description=seo_elements["meta_description"],
                target_keywords=request.target_keywords,
                headings=title_and_outline["headings"],
                estimated_read_time=self._calculate_read_time(content),
                seo_score=await self._calculate_seo_score(content, request.target_keywords),
                publish_date=datetime.utcnow().isoformat(),
                slug=self._create_slug(title_and_outline["title"]),
                tags=seo_elements["tags"],
                cta=seo_elements["cta"],
                image_suggestions=seo_elements["image_suggestions"]
            )
            
            return generated_content
            
        except Exception as e:
            logger.error(f"Error generating blog post: {str(e)}")
            raise
    
    async def generate_content_calendar(
        self, 
        barbershop_profile: Dict[str, Any],
        days: int = 30
    ) -> List[Dict[str, Any]]:
        """Generate comprehensive content calendar"""
        try:
            prompt = f"""
            Create a {days}-day content calendar for {barbershop_profile['name']} in {barbershop_profile['location']}.
            
            Business Context:
            - Services: {', '.join(barbershop_profile.get('services', []))}
            - Target audience: Men aged 25-45
            - Location: {barbershop_profile['location']}
            - Current date: {datetime.now().strftime('%B %d, %Y')}
            
            Generate content for:
            - 3x Blog posts per week (educational, promotional, seasonal)
            - 5x Google My Business posts per week
            - 2x Social media content series per week
            - 1x Email newsletter per week
            
            For each content piece, include:
            1. Content type (blog, gmb, social, email)
            2. Topic/headline
            3. Target keywords (2-3 local keywords)
            4. Content angle (educational/promotional/seasonal)
            5. Suggested publish date
            6. Priority level (1-5)
            7. Expected engagement level (low/medium/high)
            8. Content pillar category
            
            Content pillars should include:
            - Hair care education
            - Style trends and tips  
            - Behind-the-scenes/team spotlight
            - Local community involvement
            - Seasonal/holiday content
            - Service promotions
            - Customer testimonials/transformations
            
            Format as JSON array with dates as ISO format.
            """
            
            response = await self._call_anthropic_claude(prompt, max_tokens=3000)
            calendar = json.loads(response)
            
            # Add unique IDs and additional metadata
            for i, item in enumerate(calendar):
                item["id"] = f"content_{i+1}_{datetime.utcnow().timestamp()}"
                item["barbershop_id"] = barbershop_profile["id"]
                item["generated_at"] = datetime.utcnow().isoformat()
                item["status"] = "planned"
            
            return calendar
            
        except Exception as e:
            logger.error(f"Error generating content calendar: {str(e)}")
            return []
    
    async def generate_local_blog_topics(
        self, 
        barbershop_profile: Dict[str, Any],
        count: int = 20
    ) -> List[Dict[str, Any]]:
        """Generate local SEO-focused blog topics"""
        try:
            current_month = datetime.now().strftime('%B')
            current_year = datetime.now().year
            
            prompt = f"""
            Generate {count} SEO-optimized blog post topics for {barbershop_profile['name']} 
            in {barbershop_profile['location']}.
            
            Context:
            - Current date: {current_month} {current_year}
            - Services: {', '.join(barbershop_profile.get('services', []))}
            - Target audience: Men aged 25-45 in {barbershop_profile['location']}
            - Competitors: Local barbershops and salons
            
            Topics should include:
            1. Local event tie-ins (sports teams, festivals, seasons)
            2. Neighborhood-specific content
            3. Service education and how-tos
            4. Style trends relevant to local climate/culture
            5. Business/professional looks for local industries
            6. Seasonal hair care (consider local weather)
            
            For each topic, provide:
            - SEO-optimized title (include location + service keywords)
            - Primary keyword focus (local intent)
            - Secondary keywords (2-3 supporting terms)
            - Content angle (educational/promotional/seasonal)
            - Target word count
            - Difficulty to rank (1-10)
            - Estimated monthly search volume (high/medium/low)
            - Content type (how-to, listicle, guide, news)
            - Seasonal relevance (year-round, seasonal, trending)
            
            Format as JSON array.
            """
            
            response = await self._call_openai_gpt(prompt, max_tokens=2500)
            topics = json.loads(response)
            
            # Enhance with local keyword variations
            enhanced_topics = []
            for topic in topics:
                enhanced_topic = topic.copy()
                enhanced_topic["local_variations"] = await self._generate_keyword_variations(
                    topic["primary_keyword"],
                    barbershop_profile["location"]
                )
                enhanced_topic["generated_at"] = datetime.utcnow().isoformat()
                enhanced_topics.append(enhanced_topic)
            
            return enhanced_topics
            
        except Exception as e:
            logger.error(f"Error generating blog topics: {str(e)}")
            return []
    
    async def _generate_title_and_outline(self, request: ContentRequest) -> Dict[str, Any]:
        """Generate SEO-optimized title and content outline"""
        prompt = f"""
        Create an SEO-optimized title and outline for a blog post about "{request.topic}"
        for {request.barbershop_name} in {request.location}.
        
        Requirements:
        - Target keywords: {', '.join(request.target_keywords)}
        - Word count: {request.word_count} words
        - Tone: {request.tone.value}
        - Target audience: {request.target_audience}
        
        Generate:
        1. SEO-optimized title (include primary keyword naturally)
        2. H2 and H3 headings outline (6-8 headings)
        3. Key points to cover under each heading
        4. Introduction hook
        5. Conclusion preview
        
        Title should be:
        - 50-60 characters
        - Include location + service keywords
        - Compelling and clickable
        - Natural keyword integration
        
        Format as JSON with title, headings array, and outline structure.
        """
        
        response = await self._call_anthropic_claude(prompt)
        return json.loads(response)
    
    async def _generate_full_content(self, request: ContentRequest, outline: Dict) -> str:
        """Generate full blog post content from outline"""
        prompt = f"""
        Write a comprehensive {request.word_count}-word blog post using this outline:
        
        Title: {outline['title']}
        Headings: {json.dumps(outline['headings'], indent=2)}
        
        Context:
        - Business: {request.barbershop_name} in {request.location}
        - Services: {', '.join(request.services)}
        - Target keywords: {', '.join(request.target_keywords)} (integrate naturally)
        - Tone: {request.tone.value}
        - Target audience: {request.target_audience}
        
        Content requirements:
        - Write in {request.tone.value} tone
        - Include local references to {request.location}
        - Naturally integrate target keywords 2-3 times each
        - Add specific examples and actionable tips
        - Include internal linking opportunities [LINK: page-name]
        - Add external authority link opportunities [EXTERNAL: description]
        - Use transition sentences between sections
        - Include relevant statistics or trends
        
        Structure:
        - Engaging introduction (150 words)
        - Detailed body sections following the outline
        - Practical tips and examples
        - Strong conclusion with call-to-action (100 words)
        
        Writing style:
        - Use short paragraphs (2-3 sentences)
        - Include bullet points and lists where appropriate
        - Write for 8th grade reading level
        - Be conversational but professional
        - Include local barbershop expertise
        """
        
        response = await self._call_anthropic_claude(prompt, max_tokens=4000)
        return response
    
    async def _generate_seo_elements(self, request: ContentRequest, content: str) -> Dict[str, Any]:
        """Generate SEO meta elements and additional content"""
        prompt = f"""
        Create SEO elements for this blog post:
        
        Title: Based on content about {request.topic}
        Content: {content[:1000]}... (truncated for brevity)
        
        Target keywords: {', '.join(request.target_keywords)}
        Business: {request.barbershop_name} in {request.location}
        
        Generate:
        1. Meta description (155 characters max, include primary keyword)
        2. 5-7 relevant tags/categories
        3. Strong call-to-action for blog conclusion
        4. 3-5 image suggestions with alt text descriptions
        5. Social media share text (Twitter & Facebook versions)
        
        Format as JSON.
        """
        
        response = await self._call_openai_gpt(prompt, max_tokens=800)
        return json.loads(response)
    
    async def _generate_keyword_variations(self, primary_keyword: str, location: str) -> List[str]:
        """Generate local keyword variations"""
        variations = [
            f"{primary_keyword} {location}",
            f"{primary_keyword} near {location}",
            f"{primary_keyword} in {location}",
            f"best {primary_keyword} {location}",
            f"{location} {primary_keyword}",
            f"{primary_keyword} near me"
        ]
        return variations
    
    def _calculate_read_time(self, content: str) -> int:
        """Calculate estimated reading time"""
        words = len(content.split())
        # Average reading speed: 200 words per minute
        return max(1, round(words / 200))
    
    async def _calculate_seo_score(self, content: str, keywords: List[str]) -> int:
        """Calculate basic SEO score"""
        score = 70  # Base score
        
        content_lower = content.lower()
        
        # Keyword density check
        total_words = len(content.split())
        for keyword in keywords:
            keyword_count = content_lower.count(keyword.lower())
            density = (keyword_count / total_words) * 100
            
            if 1 <= density <= 3:  # Good keyword density
                score += 5
            elif density > 3:  # Over-optimization
                score -= 10
        
        # Content length
        if 800 <= total_words <= 2000:
            score += 10
        elif total_words < 500:
            score -= 20
        
        # Headings structure
        h2_count = content.count('<h2>')
        if 3 <= h2_count <= 8:
            score += 5
        
        return min(100, max(0, score))
    
    def _create_slug(self, title: str) -> str:
        """Create URL-friendly slug"""
        slug = title.lower()
        slug = re.sub(r'[^\w\s-]', '', slug)
        slug = re.sub(r'[\s_-]+', '-', slug)
        slug = slug.strip('-')
        return slug
    
    async def _call_openai_gpt(self, prompt: str, max_tokens: int = 1000) -> str:
        """Call OpenAI GPT API"""
        try:
            response = await asyncio.to_thread(
                self.openai_client.chat.completions.create,
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are an expert content marketer and SEO specialist for local businesses, particularly barbershops."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=max_tokens,
                temperature=0.7
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"OpenAI API error: {str(e)}")
            raise
    
    async def _call_anthropic_claude(self, prompt: str, max_tokens: int = 1000) -> str:
        """Call Anthropic Claude API"""
        try:
            response = await asyncio.to_thread(
                self.anthropic_client.messages.create,
                model="claude-3-sonnet-20240229",
                max_tokens=max_tokens,
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )
            return response.content[0].text
        except Exception as e:
            logger.error(f"Anthropic API error: {str(e)}")
            raise


class ContentScheduler:
    """Schedule and manage AI-generated content publication"""
    
    def __init__(self, blog_generator: AIBlogContentGenerator):
        self.blog_generator = blog_generator
        self.scheduled_content = []
    
    async def schedule_content_batch(
        self, 
        barbershop_profile: Dict[str, Any],
        content_calendar: List[Dict[str, Any]]
    ) -> List[GeneratedContent]:
        """Generate and schedule batch content from calendar"""
        generated_content = []
        
        for calendar_item in content_calendar:
            if calendar_item["content_type"] == "blog":
                try:
                    request = ContentRequest(
                        barbershop_id=barbershop_profile["id"],
                        barbershop_name=barbershop_profile["name"],
                        location=barbershop_profile["location"],
                        services=barbershop_profile["services"],
                        target_keywords=calendar_item["target_keywords"],
                        content_type=ContentType.BLOG_POST,
                        tone=ContentTone.PROFESSIONAL,
                        word_count=1200,
                        topic=calendar_item["topic"]
                    )
                    
                    content = await self.blog_generator.generate_blog_post(request)
                    content.publish_date = calendar_item["publish_date"]
                    
                    generated_content.append(content)
                    
                    # Add delay to avoid API rate limits
                    await asyncio.sleep(2)
                    
                except Exception as e:
                    logger.error(f"Error generating content for {calendar_item['topic']}: {str(e)}")
                    continue
        
        return generated_content
    
    def get_publishing_schedule(self, days_ahead: int = 7) -> List[Dict[str, Any]]:
        """Get content scheduled for publishing in next N days"""
        cutoff_date = datetime.utcnow() + timedelta(days=days_ahead)
        
        upcoming = [
            content for content in self.scheduled_content
            if datetime.fromisoformat(content.publish_date.replace('Z', '+00:00')) <= cutoff_date
        ]
        
        return sorted(upcoming, key=lambda x: x.publish_date)


# Example usage and testing
async def main():
    """Example usage of AI Blog Generator"""
    
    # Initialize generator
    generator = AIBlogContentGenerator(
        openai_api_key="your-openai-key",
        anthropic_api_key="your-anthropic-key"
    )
    
    # Barbershop profile
    barbershop_profile = {
        "id": "elite-cuts-la",
        "name": "Elite Cuts Barbershop",
        "location": "Los Angeles, CA",
        "services": ["Haircut", "Beard Trim", "Hot Towel Shave", "Fade Cut"],
        "target_keywords": ["barber los angeles", "mens haircut downtown la", "fade cut los angeles"]
    }
    
    # Generate content calendar
    print("Generating 30-day content calendar...")
    calendar = await generator.generate_content_calendar(barbershop_profile, 30)
    print(f"Generated {len(calendar)} content pieces")
    
    # Generate blog topics
    print("\nGenerating local blog topics...")
    topics = await generator.generate_local_blog_topics(barbershop_profile, 10)
    print(f"Generated {len(topics)} blog topics")
    
    # Generate sample blog post
    if topics:
        sample_topic = topics[0]
        request = ContentRequest(
            barbershop_id=barbershop_profile["id"],
            barbershop_name=barbershop_profile["name"],
            location=barbershop_profile["location"],
            services=barbershop_profile["services"],
            target_keywords=sample_topic["primary_keyword"],
            content_type=ContentType.BLOG_POST,
            tone=ContentTone.PROFESSIONAL,
            word_count=1200,
            topic=sample_topic["title"]
        )
        
        print(f"\nGenerating blog post: {sample_topic['title']}")
        blog_post = await generator.generate_blog_post(request)
        
        print(f"Generated blog post:")
        print(f"Title: {blog_post.title}")
        print(f"SEO Score: {blog_post.seo_score}/100")
        print(f"Read Time: {blog_post.estimated_read_time} minutes")
        print(f"Content length: {len(blog_post.content.split())} words")


if __name__ == "__main__":
    asyncio.run(main())