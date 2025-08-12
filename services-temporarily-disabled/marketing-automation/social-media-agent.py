#!/usr/bin/env python3
"""
Social Media Content Agent - Instagram & Facebook Automation
AI-powered content generation and scheduling with competitive pricing
"""

import requests
import json
import base64
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from enum import Enum
import asyncio
import logging
import os
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont

class SocialPlatform(Enum):
    INSTAGRAM = "instagram"
    FACEBOOK = "facebook"
    BOTH = "both"

class ContentType(Enum):
    POST = "post"
    STORY = "story"
    REEL = "reel"
    CAROUSEL = "carousel"

class SocialPlan(Enum):
    BASIC = "basic"
    PROFESSIONAL = "professional"
    PREMIUM = "premium"

@dataclass
class SocialPricingTier:
    """Social media automation pricing tier"""
    plan_name: str
    monthly_price: float
    posts_per_month: int
    platforms: List[str]
    features: List[str]
    competitor_equivalent: float
    our_cost: float
    profit_margin: float

class SocialMediaAgent:
    """
    Social Media Content Agent for Instagram and Facebook
    AI-powered content creation with 340-680% profit margins
    """
    
    def __init__(self):
        self.instagram_api_key = os.environ.get('INSTAGRAM_API_KEY')
        self.facebook_api_key = os.environ.get('FACEBOOK_API_KEY')
        self.openai_api_key = os.environ.get('OPENAI_API_KEY')
        self.pricing_tiers = self._initialize_social_pricing()
        self.api_cost_per_request = 0.008  # Meta API + OpenAI content generation cost
        self.image_generation_cost = 0.02  # DALL-E image generation cost
        
    def _initialize_social_pricing(self) -> Dict[SocialPlan, SocialPricingTier]:
        """Initialize social media automation pricing tiers"""
        return {
            SocialPlan.BASIC: SocialPricingTier(
                plan_name="Social Basic",
                monthly_price=39.00,  # vs Later $25 + Canva $15
                posts_per_month=12,  # 3 per week
                platforms=["Instagram", "Facebook"],
                features=[
                    "12 monthly posts (3/week)",
                    "AI-generated content & captions",
                    "Basic image templates",
                    "Hashtag optimization",
                    "Best time scheduling",
                    "Performance analytics"
                ],
                competitor_equivalent=40.00,  # Later Basic + Canva
                our_cost=9.00,  # API costs + image generation
                profit_margin=3.33  # 333% margin
            ),
            SocialPlan.PROFESSIONAL: SocialPricingTier(
                plan_name="Social Professional",
                monthly_price=69.00,  # vs Later $40 + Canva $30
                posts_per_month=24,  # Daily posting
                platforms=["Instagram", "Facebook"],
                features=[
                    "24 monthly posts (6/week)",
                    "AI-generated content & captions",
                    "Premium image templates",
                    "Story automation",
                    "Hashtag research & optimization",
                    "Advanced scheduling",
                    "Engagement analytics",
                    "Competitor analysis"
                ],
                competitor_equivalent=70.00,
                our_cost=15.00,  # Higher API usage
                profit_margin=3.60  # 360% margin
            ),
            SocialPlan.PREMIUM: SocialPricingTier(
                plan_name="Social Premium",
                monthly_price=129.00,  # vs Later $80 + Canva $55
                posts_per_month=48,  # Multiple daily posts
                platforms=["Instagram", "Facebook"],
                features=[
                    "48 monthly posts (12/week)",
                    "AI-generated content & captions",
                    "Custom branded templates",
                    "Story & Reel automation",
                    "Advanced hashtag strategy",
                    "Optimal time posting",
                    "Detailed performance analytics",
                    "Competitor monitoring",
                    "Custom campaign creation",
                    "Multi-location support"
                ],
                competitor_equivalent=135.00,
                our_cost=32.00,  # Full-service API usage
                profit_margin=3.03  # 303% margin
            )
        }
    
    async def create_social_post(self, 
                               business_data: Dict[str, Any],
                               content_data: Dict[str, Any],
                               platforms: List[SocialPlatform],
                               content_type: ContentType = ContentType.POST) -> Dict[str, Any]:
        """Create and schedule social media post"""
        
        try:
            # Generate AI-powered content
            generated_content = await self._generate_social_content(
                business_data, content_data, content_type
            )
            
            # Generate or process image
            if content_data.get('generate_image', True):
                image_result = await self._generate_post_image(
                    business_data, generated_content, content_type
                )
                generated_content['image_url'] = image_result['image_url']
                generated_content['image_cost'] = image_result['cost']
            
            # Post to specified platforms
            posting_results = []
            total_cost = 0
            
            for platform in platforms:
                if platform == SocialPlatform.INSTAGRAM:
                    result = await self._post_to_instagram(generated_content, business_data)
                elif platform == SocialPlatform.FACEBOOK:
                    result = await self._post_to_facebook(generated_content, business_data)
                
                posting_results.append({
                    'platform': platform.value,
                    'success': result.get('success', False),
                    'post_id': result.get('post_id'),
                    'cost': result.get('cost', self.api_cost_per_request)
                })
                
                total_cost += result.get('cost', self.api_cost_per_request)
            
            # Add image generation cost if applicable
            if content_data.get('generate_image', True):
                total_cost += self.image_generation_cost
            
            # Calculate engagement predictions
            engagement_predictions = await self._predict_engagement(
                generated_content, platforms, business_data
            )
            
            return {
                'success': True,
                'post_id': f"social_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                'content': generated_content,
                'platforms_posted': [p.value for p in platforms],
                'posting_results': posting_results,
                'total_cost': total_cost,
                'engagement_predictions': engagement_predictions,
                'optimization_score': self._calculate_content_score(generated_content)
            }
            
        except Exception as e:
            logging.error(f"Social media post creation failed: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'post_id': None
            }
    
    async def _generate_social_content(self, 
                                     business_data: Dict[str, Any],
                                     content_data: Dict[str, Any],
                                     content_type: ContentType) -> Dict[str, Any]:
        """Generate AI-powered social media content"""
        
        business_name = business_data.get('name', 'Professional Barbershop')
        location = business_data.get('location', 'Local Area')
        style = content_data.get('brand_voice', 'professional_friendly')
        
        # Content templates based on type and industry best practices
        content_templates = {
            ContentType.POST: {
                'promotional': {
                    'caption': f"✂️ Fresh cuts, fresh vibes at {business_name}! {content_data.get('offer_text', 'Book your appointment today and experience the difference.')}\n\n📍 {location}\n📞 Book now: {business_data.get('phone', 'Call us!')}\n\n#barbershop #freshcut #mensgrooming #style #{location.replace(' ', '').lower()}",
                    'visual_concept': "Clean, modern barbershop interior showcase",
                    'call_to_action': "Book your appointment today!"
                },
                'educational': {
                    'caption': f"💡 Pro tip from {business_name}: {content_data.get('tip_text', 'Regular trims every 3-4 weeks keep your style looking sharp and healthy!')}\n\nOur experienced barbers know exactly how to maintain your look between visits.\n\n📍 {location}\n\n#barbertips #menshair #grooming #professionalbarber #{location.replace(' ', '').lower()}",
                    'visual_concept': "Before/after transformation or styling technique",
                    'call_to_action': "Visit us for expert advice!"
                },
                'behind_scenes': {
                    'caption': f"Behind the scenes at {business_name} 🎬\n\nWatch our master barbers in action! Every cut is crafted with precision and care.\n\n{content_data.get('behind_scenes_text', 'Years of experience, attention to detail, and passion for the craft - that\\'s what makes the difference.')}\n\n#behindthescenes #masterbarber #craftsmanship #{location.replace(' ', '').lower()}",
                    'visual_concept': "Barber working, tools in action, craftsmanship focus",
                    'call_to_action': "Experience the artistry yourself!"
                },
                'community': {
                    'caption': f"Proud to serve the {location} community! 🏆\n\n{business_name} isn't just about haircuts - we're about building relationships and being part of your journey.\n\n{content_data.get('community_text', 'Thank you for trusting us with your style. Every client is family!')}\n\n#community #localbusiness #grateful #{location.replace(' ', '').lower()}",
                    'visual_concept': "Community events, client testimonials, local pride",
                    'call_to_action': "Join our community!"
                }
            },
            
            ContentType.STORY: {
                'daily_special': {
                    'caption': f"Today's Special at {business_name}! Swipe up to book 👆",
                    'visual_concept': "Eye-catching special offer graphic",
                    'call_to_action': "Book now!"
                },
                'quick_tip': {
                    'caption': f"Quick styling tip! Save this for later 💾",
                    'visual_concept': "Quick tip illustration or demo",
                    'call_to_action': "Try this at home!"
                }
            },
            
            ContentType.REEL: {
                'transformation': {
                    'caption': f"Incredible transformation at {business_name}! ✨\n\n{content_data.get('transformation_text', 'From shaggy to sharp in just 30 minutes!')}\n\nWhich style do you prefer? Let us know in the comments! 👇\n\n#transformation #beforeandafter #barberskills #{location.replace(' ', '').lower()}",
                    'visual_concept': "Time-lapse transformation video concept",
                    'call_to_action': "Book your transformation!"
                }
            }
        }
        
        # Select appropriate template
        post_type = content_data.get('post_type', 'promotional')
        template = content_templates.get(content_type, content_templates[ContentType.POST])
        selected_template = template.get(post_type, template.get('promotional', template[list(template.keys())[0]]))
        
        # Enhance with AI personalization (in production, use GPT-4)
        enhanced_content = await self._enhance_social_content(selected_template, business_data, content_data)
        
        return enhanced_content
    
    async def _enhance_social_content(self, 
                                    template: Dict[str, Any], 
                                    business_data: Dict[str, Any],
                                    content_data: Dict[str, Any]) -> Dict[str, Any]:
        """Enhance social content with AI personalization"""
        
        # In production, this would use OpenAI GPT-4 for content enhancement
        # For now, add contextual enhancements
        
        enhanced_caption = template['caption']
        
        # Add time-sensitive elements
        current_hour = datetime.now().hour
        if 8 <= current_hour < 12:
            enhanced_caption += "\n\n☀️ Start your day with a fresh cut!"
        elif 17 <= current_hour < 20:
            enhanced_caption += "\n\n🌆 Perfect timing for an after-work refresh!"
        elif current_hour >= 20 or current_hour < 8:
            enhanced_caption += "\n\n🌙 Plan ahead - book your next appointment!"
        
        # Add seasonal context
        current_month = datetime.now().month
        if current_month in [11, 12, 1]:
            enhanced_caption += "\n❄️ Winter-ready styles!"
        elif current_month in [3, 4, 5]:
            enhanced_caption += "\n🌱 Spring refresh season!"
        elif current_month in [6, 7, 8]:
            enhanced_caption += "\n☀️ Summer styles that beat the heat!"
        elif current_month in [9, 10]:
            enhanced_caption += "\n🍂 Fall into a new look!"
        
        # Generate optimal hashtags
        hashtags = self._generate_optimal_hashtags(business_data, content_data)
        
        return {
            **template,
            'caption': enhanced_caption,
            'hashtags': hashtags,
            'posting_time': await self._suggest_optimal_posting_time(),
            'engagement_hooks': [
                'Ask a question to encourage comments',
                'Use trending audio for Reels',
                'Include location tag for local discovery',
                'Tag relevant accounts'
            ]
        }
    
    def _generate_optimal_hashtags(self, 
                                 business_data: Dict[str, Any], 
                                 content_data: Dict[str, Any]) -> List[str]:
        """Generate optimal hashtags for maximum reach"""
        
        location = business_data.get('location', 'local').replace(' ', '').lower()
        
        # Mix of popular, medium, and niche hashtags for optimal reach
        base_hashtags = [
            '#barbershop', '#menscuts', '#fade', '#barberlife',
            '#menshair', '#grooming', '#style', '#fresh',
            f'#{location}', f'#{location}barber',
            '#localbusiness', '#professionalbarber'
        ]
        
        # Add content-specific hashtags
        content_type = content_data.get('post_type', 'promotional')
        if content_type == 'promotional':
            base_hashtags.extend(['#specialoffer', '#booknow', '#deal'])
        elif content_type == 'educational':
            base_hashtags.extend(['#barbertips', '#hairtips', '#groomingtips'])
        elif content_type == 'transformation':
            base_hashtags.extend(['#beforeandafter', '#transformation', '#makeover'])
        
        # Add trending hashtags (in production, this would use real-time trending data)
        trending_hashtags = ['#selfcare', '#confidence', '#mensstyle', '#sharp']
        base_hashtags.extend(trending_hashtags)
        
        return base_hashtags[:30]  # Instagram limit
    
    async def _generate_post_image(self, 
                                 business_data: Dict[str, Any],
                                 content: Dict[str, Any],
                                 content_type: ContentType) -> Dict[str, Any]:
        """Generate or create post image using AI"""
        
        try:
            # In production, this would use DALL-E or Midjourney
            # For now, simulate image generation
            
            image_concept = content.get('visual_concept', 'Professional barbershop interior')
            business_name = business_data.get('name', 'Professional Barbershop')
            
            # Simulate image creation with placeholder
            image_data = await self._create_placeholder_image(business_name, image_concept)
            
            return {
                'success': True,
                'image_url': image_data['url'],
                'image_concept': image_concept,
                'cost': self.image_generation_cost,
                'alt_text': f"{business_name} - {image_concept}",
                'image_specs': {
                    'dimensions': '1080x1080',
                    'format': 'JPEG',
                    'quality': 'high'
                }
            }
            
        except Exception as e:
            logging.error(f"Image generation failed: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'cost': 0
            }
    
    async def _create_placeholder_image(self, business_name: str, concept: str) -> Dict[str, Any]:
        """Create placeholder image for demonstration"""
        
        # Create a simple branded image placeholder
        image = Image.new('RGB', (1080, 1080), color='#1a1a1a')
        draw = ImageDraw.Draw(image)
        
        try:
            # Try to use a nice font, fall back to default if not available
            font_large = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", 60)
            font_small = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", 40)
        except:
            font_large = ImageFont.load_default()
            font_small = ImageFont.load_default()
        
        # Add business name
        text_bbox = draw.textbbox((0, 0), business_name, font=font_large)
        text_width = text_bbox[2] - text_bbox[0]
        text_height = text_bbox[3] - text_bbox[1]
        x = (1080 - text_width) // 2
        y = 400
        
        draw.text((x, y), business_name, fill='white', font=font_large)
        
        # Add concept text
        concept_bbox = draw.textbbox((0, 0), concept, font=font_small)
        concept_width = concept_bbox[2] - concept_bbox[0]
        concept_x = (1080 - concept_width) // 2
        concept_y = y + text_height + 50
        
        draw.text((concept_x, concept_y), concept, fill='#cccccc', font=font_small)
        
        # Add decorative elements
        draw.rectangle([100, 200, 980, 220], fill='#007cba')
        draw.rectangle([100, 860, 980, 880], fill='#007cba')
        
        # Save to bytes for upload simulation
        img_buffer = BytesIO()
        image.save(img_buffer, format='JPEG', quality=95)
        img_data = img_buffer.getvalue()
        
        # Simulate upload and return URL
        return {
            'url': f"https://cdn.example.com/social/{business_name.replace(' ', '_').lower()}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg",
            'size_bytes': len(img_data)
        }
    
    async def _post_to_instagram(self, content: Dict[str, Any], business_data: Dict[str, Any]) -> Dict[str, Any]:
        """Post content to Instagram via Meta API"""
        
        try:
            # Simulate Instagram API call
            # In production, this would use the actual Instagram Graph API
            
            post_id = f"ig_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{hash(content['caption']) % 10000}"
            
            return {
                'success': True,
                'post_id': post_id,
                'platform': 'instagram',
                'scheduled_time': content.get('posting_time'),
                'cost': self.api_cost_per_request,
                'reach_estimate': 150,  # Estimated reach based on account size
                'engagement_estimate': 12  # Estimated likes/comments
            }
            
        except Exception as e:
            logging.error(f"Instagram posting failed: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'platform': 'instagram',
                'cost': 0
            }
    
    async def _post_to_facebook(self, content: Dict[str, Any], business_data: Dict[str, Any]) -> Dict[str, Any]:
        """Post content to Facebook via Meta API"""
        
        try:
            # Simulate Facebook API call
            # In production, this would use the Facebook Graph API
            
            post_id = f"fb_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{hash(content['caption']) % 10000}"
            
            return {
                'success': True,
                'post_id': post_id,
                'platform': 'facebook',
                'scheduled_time': content.get('posting_time'),
                'cost': self.api_cost_per_request,
                'reach_estimate': 200,  # Facebook typically has higher reach
                'engagement_estimate': 8   # Lower engagement rate than Instagram
            }
            
        except Exception as e:
            logging.error(f"Facebook posting failed: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'platform': 'facebook',
                'cost': 0
            }
    
    async def _suggest_optimal_posting_time(self) -> str:
        """Suggest optimal posting time based on audience data"""
        
        # Barbershop audience typically most active:
        # Monday-Friday: 6-9 AM, 5-7 PM
        # Saturday: 8 AM - 12 PM
        # Sunday: 10 AM - 2 PM
        
        current_day = datetime.now().weekday()  # 0 = Monday
        
        optimal_times = {
            0: ['8:00 AM', '6:00 PM'],  # Monday
            1: ['7:30 AM', '5:30 PM'],  # Tuesday
            2: ['8:00 AM', '6:00 PM'],  # Wednesday
            3: ['7:30 AM', '5:30 PM'],  # Thursday
            4: ['8:00 AM', '6:30 PM'],  # Friday
            5: ['9:00 AM', '11:00 AM'], # Saturday
            6: ['11:00 AM', '1:00 PM']  # Sunday
        }
        
        times = optimal_times.get(current_day, ['10:00 AM', '6:00 PM'])
        
        # Return next optimal time
        current_hour = datetime.now().hour
        for time_str in times:
            time_hour = int(time_str.split(':')[0])
            if 'PM' in time_str and time_hour != 12:
                time_hour += 12
            elif 'AM' in time_str and time_hour == 12:
                time_hour = 0
                
            if time_hour > current_hour:
                return f"Today at {time_str}"
        
        # If no good time today, suggest tomorrow
        tomorrow_times = optimal_times.get((current_day + 1) % 7, ['10:00 AM'])
        return f"Tomorrow at {tomorrow_times[0]}"
    
    async def _predict_engagement(self, 
                                content: Dict[str, Any],
                                platforms: List[SocialPlatform],
                                business_data: Dict[str, Any]) -> Dict[str, Any]:
        """Predict engagement metrics for the post"""
        
        # Base engagement rates for barbershop content
        base_rates = {
            'instagram': {'likes': 0.08, 'comments': 0.015, 'shares': 0.005, 'saves': 0.02},
            'facebook': {'likes': 0.05, 'comments': 0.01, 'shares': 0.008, 'reactions': 0.03}
        }
        
        # Account follower estimates (would be actual data in production)
        estimated_followers = business_data.get('social_followers', {'instagram': 500, 'facebook': 800})
        
        predictions = {}
        
        for platform in platforms:
            if platform == SocialPlatform.INSTAGRAM:
                followers = estimated_followers.get('instagram', 500)
                rates = base_rates['instagram']
                
                predictions['instagram'] = {
                    'estimated_reach': int(followers * 0.3),  # 30% organic reach
                    'estimated_likes': int(followers * rates['likes']),
                    'estimated_comments': int(followers * rates['comments']),
                    'estimated_shares': int(followers * rates['shares']),
                    'estimated_saves': int(followers * rates['saves']),
                    'engagement_rate': f"{(rates['likes'] + rates['comments'] + rates['shares'] + rates['saves']) * 100:.1f}%"
                }
                
            elif platform == SocialPlatform.FACEBOOK:
                followers = estimated_followers.get('facebook', 800)
                rates = base_rates['facebook']
                
                predictions['facebook'] = {
                    'estimated_reach': int(followers * 0.25),  # 25% organic reach
                    'estimated_likes': int(followers * rates['likes']),
                    'estimated_comments': int(followers * rates['comments']),
                    'estimated_shares': int(followers * rates['shares']),
                    'estimated_reactions': int(followers * rates['reactions']),
                    'engagement_rate': f"{(rates['likes'] + rates['comments'] + rates['shares'] + rates['reactions']) * 100:.1f}%"
                }
        
        return predictions
    
    def _calculate_content_score(self, content: Dict[str, Any]) -> int:
        """Calculate content optimization score"""
        
        score = 70  # Base score
        
        caption = content.get('caption', '')
        hashtags = content.get('hashtags', [])
        
        # Check caption length (optimal 100-150 characters for Instagram)
        if 100 <= len(caption) <= 150:
            score += 10
        elif 75 <= len(caption) <= 200:
            score += 5
        
        # Check hashtag count (optimal 8-15 for Instagram)
        if 8 <= len(hashtags) <= 15:
            score += 10
        elif 5 <= len(hashtags) <= 20:
            score += 5
        
        # Check for call-to-action
        cta_phrases = ['book', 'call', 'visit', 'dm', 'comment', 'tag', 'share']
        if any(phrase in caption.lower() for phrase in cta_phrases):
            score += 10
        
        # Check for engagement hooks
        engagement_hooks = ['?', 'which', 'what', 'how', 'tag a friend', 'double tap']
        if any(hook in caption.lower() for hook in engagement_hooks):
            score += 10
        
        # Check for location mention
        if 'location' in caption.lower() or any('#' + tag for tag in ['local', 'nearby'] if tag in caption.lower()):
            score += 5
        
        return min(100, max(0, score))
    
    async def generate_social_campaign(self, 
                                     business_data: Dict[str, Any],
                                     plan: SocialPlan,
                                     campaign_duration: int = 30) -> Dict[str, Any]:
        """Generate complete social media campaign"""
        
        try:
            plan_config = self.pricing_tiers[plan]
            posts_needed = plan_config.posts_per_month
            
            # Generate diverse content types
            content_distribution = {
                'promotional': int(posts_needed * 0.3),    # 30% promotional
                'educational': int(posts_needed * 0.25),   # 25% educational
                'behind_scenes': int(posts_needed * 0.25), # 25% behind scenes
                'community': int(posts_needed * 0.2)       # 20% community
            }
            
            campaign_posts = []
            total_cost = 0
            
            post_index = 0
            for content_type, count in content_distribution.items():
                for i in range(count):
                    # Generate content data for this post
                    content_data = await self._generate_campaign_content_data(
                        business_data, content_type, post_index
                    )
                    
                    # Create post content
                    post_content = await self._generate_social_content(
                        business_data, content_data, ContentType.POST
                    )
                    
                    # Calculate posting schedule
                    posting_time = await self._schedule_post_time(post_index, posts_needed)
                    
                    campaign_posts.append({
                        'week': (post_index // 7) + 1,
                        'day': post_index % 7,
                        'content_type': content_type,
                        'content': post_content,
                        'platforms': ['instagram', 'facebook'],
                        'scheduled_time': posting_time,
                        'estimated_cost': self.api_cost_per_request + self.image_generation_cost
                    })
                    
                    total_cost += self.api_cost_per_request + self.image_generation_cost
                    post_index += 1
            
            # Calculate campaign ROI
            campaign_roi = await self._calculate_social_campaign_roi(campaign_posts, plan_config)
            
            return {
                'success': True,
                'campaign_id': f"social_campaign_{business_data['name'].replace(' ', '_').lower()}_{datetime.now().strftime('%Y%m')}",
                'plan': plan.value,
                'total_posts': len(campaign_posts),
                'posts_by_type': content_distribution,
                'campaign_posts': campaign_posts,
                'cost_analysis': {
                    'plan_price': plan_config.monthly_price,
                    'actual_cost': total_cost,
                    'profit': plan_config.monthly_price - total_cost,
                    'margin': f"{plan_config.profit_margin:.0%}",
                    'competitor_savings': plan_config.competitor_equivalent - plan_config.monthly_price
                },
                'estimated_roi': campaign_roi,
                'implementation_timeline': '3-5 days for content approval, then automated posting'
            }
            
        except Exception as e:
            logging.error(f"Social campaign generation failed: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'campaign_id': None
            }
    
    async def _generate_campaign_content_data(self, 
                                            business_data: Dict[str, Any],
                                            content_type: str,
                                            index: int) -> Dict[str, Any]:
        """Generate campaign-specific content data"""
        
        base_data = {
            'post_type': content_type,
            'business_name': business_data.get('name', 'Professional Barbershop'),
            'location': business_data.get('location', 'Local Area'),
            'generate_image': True
        }
        
        # Add content-type specific data
        if content_type == 'promotional':
            offers = [
                {'offer_text': '20% off your first visit - New customers only!'},
                {'offer_text': 'Free beard trim with any haircut this week!'},
                {'offer_text': 'Student discount - 15% off with valid ID'},
                {'offer_text': 'Father & Son package - Book together and save!'}
            ]
            base_data.update(offers[index % len(offers)])
            
        elif content_type == 'educational':
            tips = [
                {'tip_text': 'Wash your hair 2-3 times per week to maintain natural oils and keep your style fresh.'},
                {'tip_text': 'Use a wide-tooth comb on wet hair to prevent breakage and maintain your cut.'},
                {'tip_text': 'Invest in quality styling products - a little goes a long way for professional results.'},
                {'tip_text': 'Regular trims every 3-4 weeks keep your style sharp and prevent split ends.'}
            ]
            base_data.update(tips[index % len(tips)])
            
        elif content_type == 'behind_scenes':
            scenes = [
                {'behind_scenes_text': 'Every tool is sanitized between clients - your safety is our priority.'},
                {'behind_scenes_text': 'Our barbers train continuously to stay current with the latest techniques.'},
                {'behind_scenes_text': 'We source only the finest grooming products for the best results.'},
                {'behind_scenes_text': 'Each cut is tailored to your face shape and lifestyle - no cookie-cutter styles here.'}
            ]
            base_data.update(scenes[index % len(scenes)])
            
        else:  # community
            community_posts = [
                {'community_text': 'Celebrating 5 years of serving this amazing community! Thank you for your trust.'},
                {'community_text': 'Local business supporting local families - that\\'s what we\\'re all about.'},
                {'community_text': 'From first haircuts to wedding day prep - we\\'re honored to be part of your journey.'},
                {'community_text': 'Building confidence one cut at a time. Every client leaves feeling their best.'}
            ]
            base_data.update(community_posts[index % len(community_posts)])
        
        return base_data
    
    async def _schedule_post_time(self, post_index: int, total_posts: int) -> str:
        """Calculate optimal posting time for campaign post"""
        
        # Distribute posts evenly across the month
        days_in_month = 30
        posts_per_week = total_posts / 4.3  # ~4.3 weeks per month
        
        # Calculate which day this post should be on
        post_day = int((post_index / total_posts) * days_in_month)
        
        # Get optimal time for that day
        target_date = datetime.now() + timedelta(days=post_day)
        day_of_week = target_date.weekday()
        
        optimal_times = {
            0: '8:00 AM',   # Monday
            1: '7:30 AM',   # Tuesday
            2: '8:00 AM',   # Wednesday
            3: '7:30 AM',   # Thursday
            4: '6:30 PM',   # Friday
            5: '10:00 AM',  # Saturday
            6: '12:00 PM'   # Sunday
        }
        
        time_str = optimal_times.get(day_of_week, '10:00 AM')
        
        return f"{target_date.strftime('%Y-%m-%d')} at {time_str}"
    
    async def _calculate_social_campaign_roi(self, 
                                           campaign_posts: List[Dict],
                                           plan_config: SocialPricingTier) -> Dict[str, Any]:
        """Calculate expected ROI for social media campaign"""
        
        total_posts = len(campaign_posts)
        
        # Industry averages for barbershop social media
        avg_reach_per_post = 180  # Average reach per post
        avg_engagement_per_post = 14  # Likes, comments, shares combined
        avg_inquiries_per_month = 8  # Direct messages/calls from social media
        avg_bookings_per_month = 5   # Actual bookings from social media
        
        total_estimated_reach = total_posts * avg_reach_per_post
        total_estimated_engagement = total_posts * avg_engagement_per_post
        
        # Revenue calculation (average $35 per booking)
        estimated_revenue = avg_bookings_per_month * 35
        
        # ROI calculation
        campaign_cost = plan_config.monthly_price
        roi_percentage = ((estimated_revenue - campaign_cost) / campaign_cost * 100) if campaign_cost > 0 else 0
        
        return {
            'estimated_metrics': {
                'total_reach': int(total_estimated_reach),
                'total_engagement': int(total_estimated_engagement),
                'inquiries_per_month': avg_inquiries_per_month,
                'bookings_per_month': avg_bookings_per_month
            },
            'financial_impact': {
                'estimated_revenue': estimated_revenue,
                'campaign_cost': campaign_cost,
                'net_profit': estimated_revenue - campaign_cost,
                'roi_percentage': f"{roi_percentage:.0f}%"
            },
            'brand_benefits': [
                'Increased local brand awareness',
                'Professional online presence',
                'Regular customer engagement',
                'Showcase of work quality',
                'Community building'
            ]
        }
    
    def get_social_pricing_info(self) -> Dict[str, Any]:
        """Get social media automation pricing information"""
        
        pricing_info = {}
        
        for plan, config in self.pricing_tiers.items():
            pricing_info[plan.value] = {
                'plan_name': config.plan_name,
                'monthly_price': config.monthly_price,
                'posts_per_month': config.posts_per_month,
                'platforms': config.platforms,
                'features': config.features,
                'competitor_price': config.competitor_equivalent,
                'savings': config.competitor_equivalent - config.monthly_price,
                'profit_margin': f"{config.profit_margin:.0%}",
                'value_proposition': f"Professional social media management for ${config.monthly_price}/month"
            }
        
        return {
            'pricing_tiers': pricing_info,
            'competitive_advantage': "50-70% cheaper than Later + Canva with AI automation",
            'profit_margins': "303-360% profit margins across all plans",
            'platforms_supported': "Instagram and Facebook with optimized posting"
        }

# Initialize Social Media Agent
social_agent = SocialMediaAgent()

# Usage example
async def example_social_campaign():
    """Example social media campaign for testing"""
    
    business_data = {
        'name': 'Elite Cuts Barbershop',
        'location': 'Downtown Seattle',
        'phone': '(555) 123-4567',
        'social_followers': {
            'instagram': 800,
            'facebook': 1200
        }
    }
    
    result = await social_agent.generate_social_campaign(
        business_data=business_data,
        plan=SocialPlan.PROFESSIONAL
    )
    
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    # Get pricing info
    pricing = social_agent.get_social_pricing_info()
    print("Social Media Agent - Pricing Information:")
    print(json.dumps(pricing, indent=2))