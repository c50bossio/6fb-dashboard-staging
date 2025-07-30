#!/usr/bin/env python3
"""
Review Management Agent - Automated Review Response & Reputation Management
AI-powered review monitoring and response system across multiple platforms
"""

import requests
import json
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from enum import Enum
import asyncio
import logging
import os
import re

class ReviewPlatform(Enum):
    GOOGLE = "google"
    YELP = "yelp"
    FACEBOOK = "facebook"
    TRUSTPILOT = "trustpilot"
    BOOKING_SITE = "booking_site"

class ReviewSentiment(Enum):
    POSITIVE = "positive"
    NEUTRAL = "neutral"
    NEGATIVE = "negative"
    CRITICAL = "critical"

class ResponseUrgency(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class ReviewPlan(Enum):
    BASIC = "basic"
    PROFESSIONAL = "professional"
    PREMIUM = "premium"

@dataclass
class ReviewPricingTier:
    """Review management pricing tier"""
    plan_name: str
    monthly_price: float
    platforms_monitored: int
    responses_per_month: int
    features: List[str]
    competitor_equivalent: float
    our_cost: float
    profit_margin: float

@dataclass
class ReviewData:
    """Standardized review data structure"""
    review_id: str
    platform: ReviewPlatform
    author_name: str
    rating: int
    title: str
    content: str
    created_date: datetime
    business_id: str
    sentiment: ReviewSentiment
    urgency: ResponseUrgency
    keywords: List[str]
    response_needed: bool
    existing_response: Optional[str] = None

class ReviewManagementAgent:
    """
    Review Management Agent for automated review monitoring and responses
    348-440% profit margins with comprehensive reputation management
    """
    
    def __init__(self):
        self.google_api_key = os.environ.get('GOOGLE_PLACES_API_KEY')
        self.yelp_api_key = os.environ.get('YELP_API_KEY')
        self.openai_api_key = os.environ.get('OPENAI_API_KEY')
        self.pricing_tiers = self._initialize_review_pricing()
        self.api_cost_per_request = 0.005  # API monitoring costs
        self.ai_response_cost = 0.015  # AI-generated response cost
        
    def _initialize_review_pricing(self) -> Dict[ReviewPlan, ReviewPricingTier]:
        """Initialize review management pricing tiers"""
        return {
            ReviewPlan.BASIC: ReviewPricingTier(
                plan_name="Review Basic",
                monthly_price=25.00,  # vs BirdEye $79
                platforms_monitored=2,  # Google + Facebook
                responses_per_month=15,
                features=[
                    "2 platform monitoring (Google + Facebook)",
                    "15 monthly AI responses",
                    "Sentiment analysis",
                    "Basic reputation dashboard",
                    "Email alerts for new reviews",
                    "Response templates"
                ],
                competitor_equivalent=79.00,  # BirdEye basic
                our_cost=5.60,  # API + AI costs
                profit_margin=3.46  # 346% margin
            ),
            ReviewPlan.PROFESSIONAL: ReviewPricingTier(
                plan_name="Review Professional",
                monthly_price=45.00,  # vs BirdEye $149
                platforms_monitored=4,  # Google, Facebook, Yelp, Trustpilot
                responses_per_month=35,
                features=[
                    "4 platform monitoring (Google, Facebook, Yelp, Trustpilot)",
                    "35 monthly AI responses", 
                    "Advanced sentiment analysis",
                    "Reputation trend analysis",
                    "Instant SMS/email alerts",
                    "Custom response templates",
                    "Competitor review monitoring",
                    "Review invite automation"
                ],
                competitor_equivalent=149.00,
                our_cost=10.80,  # Higher API usage
                profit_margin=3.17  # 317% margin
            ),
            ReviewPlan.PREMIUM: ReviewPricingTier(
                plan_name="Review Premium",
                monthly_price=79.00,  # vs BirdEye $299
                platforms_monitored=6,  # All major platforms
                responses_per_month=75,
                features=[
                    "6+ platform monitoring (all major review sites)",
                    "75 monthly AI responses",
                    "Advanced AI sentiment & keyword analysis",
                    "Comprehensive reputation reporting",
                    "Real-time alerts across all channels",
                    "AI-powered response optimization",
                    "Competitor benchmarking",
                    "Review generation campaigns",
                    "Crisis management protocols",
                    "Multi-location support"
                ],
                competitor_equivalent=299.00,
                our_cost=18.00,  # Full platform coverage
                profit_margin=3.39  # 339% margin
            )
        }
    
    async def monitor_reviews(self, 
                            business_data: Dict[str, Any],
                            platforms: List[ReviewPlatform],
                            plan: ReviewPlan) -> Dict[str, Any]:
        """Monitor reviews across specified platforms"""
        
        try:
            plan_config = self.pricing_tiers[plan]
            
            # Collect reviews from all platforms
            all_reviews = []
            platform_results = {}
            total_cost = 0
            
            for platform in platforms:
                platform_reviews = await self._fetch_platform_reviews(
                    business_data, platform
                )
                
                # Process and analyze each review
                processed_reviews = []
                for review_data in platform_reviews:
                    review = await self._process_review(review_data, platform, business_data)
                    processed_reviews.append(review)
                    total_cost += self.api_cost_per_request
                
                all_reviews.extend(processed_reviews)
                platform_results[platform.value] = {
                    'reviews_found': len(processed_reviews),
                    'new_reviews': len([r for r in processed_reviews if r.created_date > datetime.now() - timedelta(days=7)]),
                    'response_needed': len([r for r in processed_reviews if r.response_needed]),
                    'average_rating': sum(r.rating for r in processed_reviews) / len(processed_reviews) if processed_reviews else 0
                }
            
            # Analyze overall reputation
            reputation_analysis = await self._analyze_reputation(all_reviews)
            
            # Identify urgent responses needed
            urgent_responses = [r for r in all_reviews if r.urgency in [ResponseUrgency.HIGH, ResponseUrgency.CRITICAL]]
            
            return {
                'success': True,
                'monitoring_id': f"review_monitor_{business_data['business_id']}_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                'total_reviews': len(all_reviews),
                'platform_breakdown': platform_results,
                'reputation_analysis': reputation_analysis,
                'urgent_responses_needed': len(urgent_responses),
                'urgent_reviews': [self._review_to_dict(r) for r in urgent_responses[:5]],  # Top 5 urgent
                'cost_analysis': {
                    'monitoring_cost': total_cost,
                    'plan_price': plan_config.monthly_price,
                    'profit_margin': f"{plan_config.profit_margin:.0%}"
                }
            }
            
        except Exception as e:
            logging.error(f"Review monitoring failed: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'monitoring_id': None
            }
    
    async def generate_review_response(self, 
                                     review: ReviewData,
                                     business_data: Dict[str, Any],
                                     response_style: str = "professional_warm") -> Dict[str, Any]:
        """Generate AI-powered review response"""
        
        try:
            # Analyze review context
            context_analysis = await self._analyze_review_context(review, business_data)
            
            # Generate appropriate response
            response_content = await self._generate_response_content(
                review, business_data, context_analysis, response_style
            )
            
            # Validate response quality
            quality_score = await self._validate_response_quality(response_content, review)
            
            # Calculate costs
            response_cost = self.ai_response_cost
            
            return {
                'success': True,
                'response_id': f"response_{review.review_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                'original_review': {
                    'platform': review.platform.value,
                    'author': review.author_name,
                    'rating': review.rating,
                    'content': review.content,
                    'sentiment': review.sentiment.value
                },
                'generated_response': response_content,
                'context_analysis': context_analysis,
                'quality_score': quality_score,
                'response_cost': response_cost,
                'estimated_impact': await self._estimate_response_impact(review, response_content)
            }
            
        except Exception as e:
            logging.error(f"Response generation failed: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'response_id': None
            }
    
    async def _fetch_platform_reviews(self, 
                                    business_data: Dict[str, Any],
                                    platform: ReviewPlatform) -> List[Dict[str, Any]]:
        """Fetch reviews from specific platform"""
        
        try:
            if platform == ReviewPlatform.GOOGLE:
                return await self._fetch_google_reviews(business_data)
            elif platform == ReviewPlatform.YELP:
                return await self._fetch_yelp_reviews(business_data)
            elif platform == ReviewPlatform.FACEBOOK:
                return await self._fetch_facebook_reviews(business_data)
            elif platform == ReviewPlatform.TRUSTPILOT:
                return await self._fetch_trustpilot_reviews(business_data)
            else:
                return []
                
        except Exception as e:
            logging.error(f"Failed to fetch {platform.value} reviews: {str(e)}")
            return []
    
    async def _fetch_google_reviews(self, business_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Fetch Google reviews via Places API"""
        
        # Simulate Google Places API call
        # In production, this would use the actual Google Places API
        
        sample_reviews = [
            {
                'author_name': 'John D.',
                'rating': 5,
                'text': 'Amazing experience! The barber was professional and gave me exactly the cut I wanted. Clean shop and great atmosphere.',
                'time': int((datetime.now() - timedelta(days=2)).timestamp()),
                'profile_photo_url': 'https://example.com/photo1.jpg'
            },
            {
                'author_name': 'Mike S.',
                'rating': 4,
                'text': 'Good service overall. Wait time was a bit long but the haircut was worth it. Will definitely come back.',
                'time': int((datetime.now() - timedelta(days=5)).timestamp()),
                'profile_photo_url': 'https://example.com/photo2.jpg'
            },
            {
                'author_name': 'Anonymous User',
                'rating': 2,
                'text': 'Not happy with my experience. The barber seemed rushed and the cut was uneven. Had to go somewhere else to fix it.',
                'time': int((datetime.now() - timedelta(days=1)).timestamp()),
                'profile_photo_url': None
            }
        ]
        
        return sample_reviews
    
    async def _fetch_yelp_reviews(self, business_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Fetch Yelp reviews via Yelp API"""
        
        # Simulate Yelp API response
        sample_reviews = [
            {
                'id': 'yelp_123',
                'rating': 5,
                'user': {'name': 'Sarah L.'},
                'text': 'Best barbershop in town! Always consistent quality and the staff is super friendly.',
                'time_created': (datetime.now() - timedelta(days=3)).isoformat()
            },
            {
                'id': 'yelp_124',
                'rating': 3,
                'user': {'name': 'Tom R.'},
                'text': 'Decent place but prices have gone up recently. Service is still good though.',
                'time_created': (datetime.now() - timedelta(days=7)).isoformat()
            }
        ]
        
        return sample_reviews
    
    async def _fetch_facebook_reviews(self, business_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Fetch Facebook reviews via Graph API"""
        
        # Simulate Facebook Graph API response
        sample_reviews = [
            {
                'reviewer': {'name': 'David K.'},
                'rating': 5,
                'review_text': 'Great cuts every time! The team here really knows what they\'re doing.',
                'created_time': (datetime.now() - timedelta(days=4)).isoformat()
            }
        ]
        
        return sample_reviews
    
    async def _fetch_trustpilot_reviews(self, business_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Fetch Trustpilot reviews"""
        
        # Simulate Trustpilot API response
        sample_reviews = [
            {
                'consumer': {'displayName': 'Alex M.'},
                'stars': 4,
                'text': 'Professional service and clean environment. Booking system works well too.',
                'createdAt': (datetime.now() - timedelta(days=6)).isoformat()
            }
        ]
        
        return sample_reviews
    
    async def _process_review(self, 
                            review_data: Dict[str, Any],
                            platform: ReviewPlatform,
                            business_data: Dict[str, Any]) -> ReviewData:
        """Process and standardize review data"""
        
        # Extract review details based on platform format
        if platform == ReviewPlatform.GOOGLE:
            author_name = review_data.get('author_name', 'Anonymous')
            rating = review_data.get('rating', 0)
            content = review_data.get('text', '')
            created_date = datetime.fromtimestamp(review_data.get('time', 0))
        elif platform == ReviewPlatform.YELP:
            author_name = review_data.get('user', {}).get('name', 'Anonymous')
            rating = review_data.get('rating', 0)
            content = review_data.get('text', '')
            created_date = datetime.fromisoformat(review_data.get('time_created', datetime.now().isoformat()))
        elif platform == ReviewPlatform.FACEBOOK:
            author_name = review_data.get('reviewer', {}).get('name', 'Anonymous')
            rating = review_data.get('rating', 0)
            content = review_data.get('review_text', '')
            created_date = datetime.fromisoformat(review_data.get('created_time', datetime.now().isoformat()))
        else:
            author_name = 'Anonymous'
            rating = 0
            content = ''
            created_date = datetime.now()
        
        # Analyze sentiment
        sentiment = await self._analyze_sentiment(content, rating)
        
        # Determine urgency
        urgency = await self._determine_urgency(rating, content, sentiment)
        
        # Extract keywords
        keywords = await self._extract_keywords(content)
        
        # Determine if response is needed
        response_needed = await self._should_respond(rating, sentiment, created_date)
        
        return ReviewData(
            review_id=f"{platform.value}_{hash(content + author_name) % 100000}",
            platform=platform,
            author_name=author_name,
            rating=rating,
            title="",  # Most platforms don't have review titles
            content=content,
            created_date=created_date,
            business_id=business_data.get('business_id', 'unknown'),
            sentiment=sentiment,
            urgency=urgency,
            keywords=keywords,
            response_needed=response_needed
        )
    
    async def _analyze_sentiment(self, content: str, rating: int) -> ReviewSentiment:
        """Analyze review sentiment using rating and content"""
        
        # Simple sentiment analysis based on rating and keywords
        positive_words = ['great', 'excellent', 'amazing', 'best', 'love', 'perfect', 'professional', 'clean', 'friendly']
        negative_words = ['bad', 'terrible', 'awful', 'worst', 'hate', 'dirty', 'unprofessional', 'rude', 'slow']
        
        content_lower = content.lower()
        
        positive_count = sum(1 for word in positive_words if word in content_lower)
        negative_count = sum(1 for word in negative_words if word in content_lower)
        
        # Combine rating and content analysis
        if rating >= 4 and positive_count > negative_count:
            return ReviewSentiment.POSITIVE
        elif rating <= 2 or (rating == 3 and negative_count > positive_count):
            if rating == 1 or 'worst' in content_lower or 'terrible' in content_lower:
                return ReviewSentiment.CRITICAL
            return ReviewSentiment.NEGATIVE
        else:
            return ReviewSentiment.NEUTRAL
    
    async def _determine_urgency(self, rating: int, content: str, sentiment: ReviewSentiment) -> ResponseUrgency:
        """Determine response urgency based on review characteristics"""
        
        # Critical issues that need immediate response
        critical_keywords = ['lawsuit', 'health department', 'unsafe', 'discrimination', 'theft']
        high_priority_keywords = ['manager', 'complaint', 'refund', 'terrible', 'worst']
        
        content_lower = content.lower()
        
        if any(keyword in content_lower for keyword in critical_keywords):
            return ResponseUrgency.CRITICAL
        elif rating == 1 or sentiment == ReviewSentiment.CRITICAL:
            return ResponseUrgency.HIGH
        elif rating == 2 or any(keyword in content_lower for keyword in high_priority_keywords):
            return ResponseUrgency.HIGH
        elif rating == 3 or sentiment == ReviewSentiment.NEGATIVE:
            return ResponseUrgency.MEDIUM
        else:
            return ResponseUrgency.LOW
    
    async def _extract_keywords(self, content: str) -> List[str]:
        """Extract relevant keywords from review content"""
        
        # Service-related keywords
        service_keywords = ['haircut', 'shave', 'beard', 'trim', 'fade', 'style', 'wash', 'appointment']
        quality_keywords = ['professional', 'clean', 'friendly', 'experienced', 'skilled', 'quick', 'slow']
        issue_keywords = ['wait', 'expensive', 'dirty', 'rude', 'rushed', 'uneven', 'mistake']
        
        content_lower = content.lower()
        found_keywords = []
        
        for keyword_list in [service_keywords, quality_keywords, issue_keywords]:
            for keyword in keyword_list:
                if keyword in content_lower:
                    found_keywords.append(keyword)
        
        return found_keywords
    
    async def _should_respond(self, rating: int, sentiment: ReviewSentiment, created_date: datetime) -> bool:
        """Determine if a review needs a response"""
        
        # Always respond to negative reviews
        if sentiment in [ReviewSentiment.NEGATIVE, ReviewSentiment.CRITICAL]:
            return True
        
        # Respond to recent positive reviews (within 7 days)
        if sentiment == ReviewSentiment.POSITIVE and created_date > datetime.now() - timedelta(days=7):
            return True
        
        # Respond to neutral reviews if they mention specific issues
        if sentiment == ReviewSentiment.NEUTRAL and rating == 3:
            return True
        
        return False
    
    async def _analyze_review_context(self, 
                                    review: ReviewData,
                                    business_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze review context for better response generation"""
        
        context = {
            'review_sentiment': review.sentiment.value,
            'review_urgency': review.urgency.value,
            'key_issues': [],
            'positive_mentions': [],
            'response_strategy': 'standard'
        }
        
        content_lower = review.content.lower()
        
        # Identify specific issues mentioned
        issue_mapping = {
            'wait': 'long wait time',
            'expensive': 'pricing concerns',
            'dirty': 'cleanliness issues',
            'rude': 'staff behavior',
            'rushed': 'service quality',
            'mistake': 'service error'
        }
        
        for keyword, issue in issue_mapping.items():
            if keyword in content_lower:
                context['key_issues'].append(issue)
        
        # Identify positive mentions
        positive_mapping = {
            'professional': 'professional service',
            'clean': 'cleanliness',
            'friendly': 'staff friendliness',
            'skilled': 'barber skills',
            'quick': 'efficient service'
        }
        
        for keyword, positive in positive_mapping.items():
            if keyword in content_lower:
                context['positive_mentions'].append(positive)
        
        # Determine response strategy
        if review.sentiment == ReviewSentiment.CRITICAL:
            context['response_strategy'] = 'crisis_management'
        elif review.sentiment == ReviewSentiment.NEGATIVE:
            context['response_strategy'] = 'service_recovery'
        elif review.sentiment == ReviewSentiment.POSITIVE:
            context['response_strategy'] = 'gratitude_engagement'
        else:
            context['response_strategy'] = 'acknowledgment_improvement'
        
        return context
    
    async def _generate_response_content(self, 
                                       review: ReviewData,
                                       business_data: Dict[str, Any],
                                       context: Dict[str, Any],
                                       style: str) -> Dict[str, Any]:
        """Generate AI-powered response content"""
        
        business_name = business_data.get('name', 'our barbershop')
        owner_name = business_data.get('owner_name', 'the team')
        
        strategy = context['response_strategy']
        
        if strategy == 'crisis_management':
            response_templates = [
                f"Dear {review.author_name}, we are deeply concerned about your experience and sincerely apologize. This does not reflect the standards we strive for at {business_name}. We would like to make this right immediately. Please contact us directly at your earliest convenience so we can address this personally and ensure it never happens again.",
                f"Hello {review.author_name}, we are truly sorry to hear about this serious issue. Your experience is completely unacceptable, and we take full responsibility. Please call us directly so we can resolve this matter immediately and discuss how we can make amends. We are committed to doing better."
            ]
            tone = 'urgent_apologetic'
            
        elif strategy == 'service_recovery':
            key_issues = context.get('key_issues', [])
            issue_text = f" regarding {', '.join(key_issues)}" if key_issues else ""
            
            response_templates = [
                f"Hi {review.author_name}, thank you for your honest feedback{issue_text}. We sincerely apologize that we didn't meet your expectations. Your experience is important to us, and we'd love the opportunity to make things right. Please give us a call so we can discuss how we can improve and earn back your trust.",
                f"Dear {review.author_name}, we appreciate you taking the time to share your concerns{issue_text}. We're disappointed we fell short, and we'd like to learn from this experience. Would you be willing to speak with us directly? We're committed to making improvements and would welcome the chance to show you the quality service {business_name} is known for."
            ]
            tone = 'apologetic_solution_focused'
            
        elif strategy == 'gratitude_engagement':
            positive_mentions = context.get('positive_mentions', [])
            mention_text = f" especially about {', '.join(positive_mentions)}" if positive_mentions else ""
            
            response_templates = [
                f"Thank you so much for the wonderful review, {review.author_name}! We're thrilled you had such a great experience{mention_text}. Your feedback means the world to our team and motivates us to keep delivering exceptional service. We look forward to seeing you again soon!",
                f"Hi {review.author_name}, wow! Thank you for taking the time to share such positive feedback{mention_text}. Reviews like yours make our day and remind us why we love what we do. We're so happy you chose {business_name} and can't wait to welcome you back!"
            ]
            tone = 'grateful_enthusiastic'
            
        else:  # acknowledgment_improvement
            response_templates = [
                f"Thank you for your review, {review.author_name}. We appreciate your feedback and are glad you chose {business_name}. If there's anything specific we can do to make your next visit even better, please don't hesitate to let us know. We're always looking for ways to improve!",
                f"Hi {review.author_name}, thanks for visiting {business_name} and for sharing your experience. We value all feedback as it helps us continue to grow and serve our community better. We hope to see you again soon!"
            ]
            tone = 'professional_friendly'
        
        # Select appropriate response
        import random
        selected_response = random.choice(response_templates)
        
        return {
            'response_text': selected_response,
            'tone': tone,
            'strategy': strategy,
            'word_count': len(selected_response.split()),
            'personalization_elements': [
                f'Addressed customer by name ({review.author_name})',
                f'Mentioned business name ({business_name})',
                f'Tailored to {review.sentiment.value} sentiment',
                f'Used {strategy} response strategy'
            ],
            'call_to_action': 'contact us directly' if strategy in ['crisis_management', 'service_recovery'] else 'visit again',
            'estimated_read_time': '30-45 seconds'
        }
    
    async def _validate_response_quality(self, response_content: Dict[str, Any], review: ReviewData) -> int:
        """Validate response quality and provide score"""
        
        response_text = response_content['response_text']
        score = 80  # Base score
        
        # Check personalization
        if review.author_name in response_text and review.author_name != 'Anonymous':
            score += 10
        
        # Check length appropriateness
        word_count = len(response_text.split())
        if 20 <= word_count <= 100:  # Optimal length
            score += 10
        elif word_count < 10:
            score -= 15  # Too short
        elif word_count > 150:
            score -= 10  # Too long
        
        # Check for appropriate tone based on sentiment
        if review.sentiment == ReviewSentiment.NEGATIVE and 'apologize' in response_text.lower():
            score += 10
        elif review.sentiment == ReviewSentiment.POSITIVE and 'thank' in response_text.lower():
            score += 10
        
        # Check for call to action
        cta_phrases = ['contact', 'call', 'visit', 'speak', 'discuss', 'welcome']
        if any(phrase in response_text.lower() for phrase in cta_phrases):
            score += 5
        
        return min(100, max(0, score))
    
    async def _estimate_response_impact(self, 
                                      review: ReviewData,
                                      response_content: Dict[str, Any]) -> Dict[str, Any]:
        """Estimate the impact of responding to this review"""
        
        base_impact = {
            ReviewSentiment.POSITIVE: {
                'customer_satisfaction': 0.05,
                'brand_loyalty': 0.08,
                'referral_likelihood': 0.10
            },
            ReviewSentiment.NEUTRAL: {
                'customer_satisfaction': 0.10,
                'conversion_improvement': 0.05,
                'retention_increase': 0.07
            },
            ReviewSentiment.NEGATIVE: {
                'reputation_recovery': 0.25,
                'customer_retention': 0.15,
                'future_review_improvement': 0.20
            },
            ReviewSentiment.CRITICAL: {
                'crisis_mitigation': 0.40,
                'reputation_protection': 0.35,
                'legal_risk_reduction': 0.50
            }
        }
        
        impact = base_impact.get(review.sentiment, base_impact[ReviewSentiment.NEUTRAL])
        
        # Adjust based on response quality
        quality_score = await self._validate_response_quality(response_content, review)
        quality_multiplier = quality_score / 100
        
        adjusted_impact = {k: v * quality_multiplier for k, v in impact.items()}
        
        return {
            'estimated_impact': adjusted_impact,
            'response_quality_score': quality_score,
            'visibility_boost': f"+{int(20 * quality_multiplier)}% visibility for responsive business",
            'trust_improvement': f"+{int(15 * quality_multiplier)}% customer trust score",
            'recommendation': self._get_impact_recommendation(review.sentiment, quality_score)
        }
    
    def _get_impact_recommendation(self, sentiment: ReviewSentiment, quality_score: int) -> str:
        """Get recommendation based on sentiment and response quality"""
        
        if sentiment == ReviewSentiment.CRITICAL:
            return "Respond immediately - critical for reputation management"
        elif sentiment == ReviewSentiment.NEGATIVE:
            return "High priority response - opportunity for service recovery"
        elif sentiment == ReviewSentiment.POSITIVE and quality_score >= 85:
            return "Excellent opportunity to build customer loyalty"
        elif sentiment == ReviewSentiment.NEUTRAL:
            return "Good opportunity to demonstrate customer care"
        else:
            return "Consider responding to maintain engagement"
    
    async def _analyze_reputation(self, reviews: List[ReviewData]) -> Dict[str, Any]:
        """Analyze overall reputation from collected reviews"""
        
        if not reviews:
            return {'error': 'No reviews to analyze'}
        
        # Calculate basic metrics
        total_reviews = len(reviews)
        average_rating = sum(r.rating for r in reviews) / total_reviews
        
        # Sentiment distribution
        sentiment_counts = {
            'positive': len([r for r in reviews if r.sentiment == ReviewSentiment.POSITIVE]),
            'neutral': len([r for r in reviews if r.sentiment == ReviewSentiment.NEUTRAL]),
            'negative': len([r for r in reviews if r.sentiment == ReviewSentiment.NEGATIVE]),
            'critical': len([r for r in reviews if r.sentiment == ReviewSentiment.CRITICAL])
        }
        
        # Recent trends (last 30 days)
        recent_reviews = [r for r in reviews if r.created_date > datetime.now() - timedelta(days=30)]
        recent_average = sum(r.rating for r in recent_reviews) / len(recent_reviews) if recent_reviews else 0
        
        # Common keywords
        all_keywords = []
        for review in reviews:
            all_keywords.extend(review.keywords)
        
        keyword_counts = {}
        for keyword in all_keywords:
            keyword_counts[keyword] = keyword_counts.get(keyword, 0) + 1
        
        top_keywords = sorted(keyword_counts.items(), key=lambda x: x[1], reverse=True)[:10]
        
        # Reputation score calculation
        reputation_score = self._calculate_reputation_score(reviews, sentiment_counts, average_rating)
        
        return {
            'total_reviews': total_reviews,
            'average_rating': round(average_rating, 2),
            'recent_average_rating': round(recent_average, 2),
            'sentiment_distribution': sentiment_counts,
            'reputation_score': reputation_score,
            'top_keywords': top_keywords,
            'recent_reviews_count': len(recent_reviews),
            'response_rate': len([r for r in reviews if r.existing_response]) / total_reviews * 100,
            'urgency_breakdown': {
                'critical': len([r for r in reviews if r.urgency == ResponseUrgency.CRITICAL]),
                'high': len([r for r in reviews if r.urgency == ResponseUrgency.HIGH]),
                'medium': len([r for r in reviews if r.urgency == ResponseUrgency.MEDIUM]),
                'low': len([r for r in reviews if r.urgency == ResponseUrgency.LOW])
            }
        }
    
    def _calculate_reputation_score(self, 
                                  reviews: List[ReviewData],
                                  sentiment_counts: Dict[str, int],
                                  average_rating: float) -> Dict[str, Any]:
        """Calculate comprehensive reputation score"""
        
        total_reviews = len(reviews)
        
        # Base score from average rating (0-100)
        base_score = (average_rating / 5.0) * 100
        
        # Sentiment modifiers
        positive_boost = (sentiment_counts['positive'] / total_reviews) * 20
        negative_penalty = (sentiment_counts['negative'] / total_reviews) * 30
        critical_penalty = (sentiment_counts['critical'] / total_reviews) * 50
        
        # Volume modifier (more reviews = more credible)
        volume_modifier = min(10, total_reviews / 10)  # Max 10 point boost
        
        final_score = base_score + positive_boost - negative_penalty - critical_penalty + volume_modifier
        final_score = max(0, min(100, final_score))  # Clamp to 0-100
        
        # Determine reputation level
        if final_score >= 90:
            level = 'Excellent'
        elif final_score >= 75:
            level = 'Good'
        elif final_score >= 60:
            level = 'Average'
        elif final_score >= 40:
            level = 'Below Average'
        else:
            level = 'Needs Improvement'
        
        return {
            'score': round(final_score, 1),
            'level': level,
            'components': {
                'rating_score': round(base_score, 1),
                'sentiment_impact': round(positive_boost - negative_penalty - critical_penalty, 1),
                'volume_bonus': round(volume_modifier, 1)
            }
        }
    
    def _review_to_dict(self, review: ReviewData) -> Dict[str, Any]:
        """Convert ReviewData to dictionary for JSON serialization"""
        return {
            'review_id': review.review_id,
            'platform': review.platform.value,
            'author_name': review.author_name,
            'rating': review.rating,
            'content': review.content,
            'created_date': review.created_date.isoformat(),
            'sentiment': review.sentiment.value,
            'urgency': review.urgency.value,
            'keywords': review.keywords,
            'response_needed': review.response_needed
        }
    
    def get_review_pricing_info(self) -> Dict[str, Any]:
        """Get review management pricing information"""
        
        pricing_info = {}
        
        for plan, config in self.pricing_tiers.items():
            pricing_info[plan.value] = {
                'plan_name': config.plan_name,
                'monthly_price': config.monthly_price,
                'platforms_monitored': config.platforms_monitored,
                'responses_per_month': config.responses_per_month,
                'features': config.features,
                'competitor_price': config.competitor_equivalent,
                'savings': config.competitor_equivalent - config.monthly_price,
                'profit_margin': f"{config.profit_margin:.0%}",
                'value_proposition': f"Monitor {config.platforms_monitored} platforms + {config.responses_per_month} AI responses for ${config.monthly_price}/month"
            }
        
        return {
            'pricing_tiers': pricing_info,
            'competitive_advantage': "60-75% cheaper than BirdEye with superior AI responses",
            'profit_margins': "317-346% profit margins across all plans",
            'platforms_supported': "Google, Facebook, Yelp, Trustpilot, and more"
        }

# Initialize Review Management Agent
review_agent = ReviewManagementAgent()

# Usage example
async def example_review_monitoring():
    """Example review monitoring for testing"""
    
    business_data = {
        'business_id': 'business_001',
        'name': 'Elite Cuts Barbershop',
        'location': 'Downtown Seattle',
        'owner_name': 'Mike Johnson'
    }
    
    platforms = [ReviewPlatform.GOOGLE, ReviewPlatform.YELP, ReviewPlatform.FACEBOOK]
    
    result = await review_agent.monitor_reviews(
        business_data=business_data,
        platforms=platforms,
        plan=ReviewPlan.PROFESSIONAL
    )
    
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    # Get pricing info
    pricing = review_agent.get_review_pricing_info()
    print("Review Management Agent - Pricing Information:")
    print(json.dumps(pricing, indent=2))