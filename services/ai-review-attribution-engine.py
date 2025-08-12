#!/usr/bin/env python3
"""
AI Review Attribution Engine
Analyzes Google My Business reviews to identify and credit specific barbers mentioned in customer feedback.
"""

import re
import json
import asyncio
import logging
from datetime import datetime
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
from enum import Enum
import difflib
from textblob import TextBlob
import openai
import anthropic

logger = logging.getLogger(__name__)

class AttributionConfidence(Enum):
    """Confidence levels for barber attribution"""
    LOW = "low"      # 0-40%
    MEDIUM = "medium"  # 41-70% 
    HIGH = "high"    # 71-90%
    CERTAIN = "certain"  # 91-100%

class ReviewSentiment(Enum):
    """Review sentiment classification"""
    POSITIVE = "positive"
    NEGATIVE = "negative"
    NEUTRAL = "neutral"
    MIXED = "mixed"

@dataclass
class BarberProfile:
    """Barber profile for name matching"""
    id: str
    first_name: str
    last_name: str
    nickname: Optional[str] = None
    aliases: List[str] = None
    barbershop_id: str = None
    
    def __post_init__(self):
        if self.aliases is None:
            self.aliases = []
        
    @property
    def all_names(self) -> List[str]:
        """Get all possible name variations for this barber"""
        names = [
            self.first_name.lower(),
            self.last_name.lower(), 
            f"{self.first_name} {self.last_name}".lower(),
            f"{self.first_name[0]} {self.last_name}".lower() if self.first_name else "",
        ]
        
        if self.nickname:
            names.append(self.nickname.lower())
            
        names.extend([alias.lower() for alias in self.aliases])
        
        # Remove empty strings and duplicates
        return list(set([name for name in names if name.strip()]))

@dataclass 
class ReviewAttribution:
    """Result of review attribution analysis"""
    review_id: str
    review_text: str
    barber_id: Optional[str]
    barber_name: Optional[str]
    confidence: AttributionConfidence
    confidence_score: float  # 0-100
    sentiment: ReviewSentiment
    sentiment_score: float  # -1 to 1
    mentioned_phrases: List[str]
    reasoning: str
    extracted_names: List[str]
    manual_override: bool = False

class AIReviewAttributionEngine:
    """
    AI-powered engine for attributing Google My Business reviews to specific barbers
    Uses multiple NLP techniques and AI models for accurate attribution
    """
    
    def __init__(self, openai_api_key: str, anthropic_api_key: str):
        self.openai_client = openai.OpenAI(api_key=openai_api_key)
        self.anthropic_client = anthropic.Anthropic(api_key=anthropic_api_key)
        
        # Common barber-related keywords that increase attribution confidence
        self.barber_context_keywords = [
            "barber", "cut", "trim", "fade", "style", "haircut", "shave", "beard",
            "scissors", "clippers", "razor", "lineup", "edge", "taper", "crew cut",
            "buzz cut", "pompadour", "undercut", "mustache", "grooming", "styling"
        ]
        
        # Words that typically precede barber names
        self.name_indicators = [
            "by", "with", "from", "ask for", "request", "see", "book with",
            "recommend", "go to", "visited", "met with", "worked with"
        ]
    
    async def analyze_review(self, review_text: str, review_id: str, barbershop_staff: List[BarberProfile]) -> ReviewAttribution:
        """
        Analyze a single review to identify barber mentions and sentiment
        
        Args:
            review_text: The customer review text
            review_id: Unique identifier for the review
            barbershop_staff: List of barbers working at this barbershop
            
        Returns:
            ReviewAttribution with barber identification and confidence scoring
        """
        logger.info(f"Analyzing review {review_id}: {review_text[:50]}...")
        
        # Step 1: Extract potential names from review text
        extracted_names = self._extract_names_from_text(review_text)
        
        # Step 2: Match extracted names against staff database
        barber_matches = self._match_names_to_barbers(extracted_names, barbershop_staff)
        
        # Step 3: Analyze sentiment
        sentiment, sentiment_score = self._analyze_sentiment(review_text)
        
        # Step 4: Use AI for contextual verification if we have potential matches
        if barber_matches:
            # Get the best match and verify with AI
            best_match = max(barber_matches, key=lambda x: x['confidence'])
            ai_verification = await self._ai_verify_attribution(review_text, best_match['barber'], barbershop_staff)
            
            # Combine rule-based and AI confidence scores
            final_confidence_score = (best_match['confidence'] + ai_verification['confidence']) / 2
            
            return ReviewAttribution(
                review_id=review_id,
                review_text=review_text,
                barber_id=best_match['barber'].id,
                barber_name=f"{best_match['barber'].first_name} {best_match['barber'].last_name}",
                confidence=self._score_to_confidence_level(final_confidence_score),
                confidence_score=final_confidence_score,
                sentiment=sentiment,
                sentiment_score=sentiment_score,
                mentioned_phrases=best_match['mentioned_phrases'],
                reasoning=ai_verification['reasoning'],
                extracted_names=extracted_names
            )
        else:
            # No barber identified
            return ReviewAttribution(
                review_id=review_id,
                review_text=review_text,
                barber_id=None,
                barber_name=None,
                confidence=AttributionConfidence.LOW,
                confidence_score=0.0,
                sentiment=sentiment,
                sentiment_score=sentiment_score,
                mentioned_phrases=[],
                reasoning="No barber names detected in review text",
                extracted_names=extracted_names
            )
    
    def _extract_names_from_text(self, text: str) -> List[str]:
        """Extract potential names from review text using multiple techniques"""
        names = []
        
        # Method 1: Regex patterns for common name mentions
        name_patterns = [
            r'\b(?:ask for|see|with|by|from)\s+([A-Z][a-z]+)\b',
            r'\b([A-Z][a-z]+)\s+(?:cut|trimmed|styled|did|gave)\b',
            r'\b(?:barber|stylist)\s+([A-Z][a-z]+)\b',
            r'\b([A-Z][a-z]+)\s+(?:is|was)\s+(?:amazing|great|excellent|fantastic|awesome|perfect)\b'
        ]
        
        for pattern in name_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            names.extend(matches)
        
        # Method 2: Look for capitalized words that might be names
        # Filter out common words that aren't names
        common_words = {'The', 'This', 'That', 'They', 'Great', 'Amazing', 'Perfect', 'Excellent', 'Good', 'Best', 'Very', 'Really', 'Super', 'Highly'}
        words = re.findall(r'\b[A-Z][a-z]+\b', text)
        potential_names = [word for word in words if word not in common_words and len(word) > 2]
        
        names.extend(potential_names)
        
        # Remove duplicates and return
        return list(set([name.lower() for name in names]))
    
    def _match_names_to_barbers(self, extracted_names: List[str], barbershop_staff: List[BarberProfile]) -> List[Dict[str, Any]]:
        """Match extracted names against barbershop staff using fuzzy matching"""
        matches = []
        
        for name in extracted_names:
            for barber in barbershop_staff:
                # Check against all name variations for this barber
                for barber_name in barber.all_names:
                    if not barber_name.strip():
                        continue
                        
                    # Exact match gets highest score
                    if name == barber_name:
                        confidence = 95.0
                    else:
                        # Fuzzy matching for similar names
                        similarity = difflib.SequenceMatcher(None, name, barber_name).ratio()
                        confidence = similarity * 85.0  # Max 85% for fuzzy matches
                    
                    # Only consider matches above 70% confidence
                    if confidence >= 70.0:
                        matches.append({
                            'barber': barber,
                            'matched_name': barber_name,
                            'extracted_name': name,
                            'confidence': confidence,
                            'mentioned_phrases': [name]  # Could be expanded to include context
                        })
        
        # Remove duplicates and sort by confidence
        unique_matches = {}
        for match in matches:
            barber_id = match['barber'].id
            if barber_id not in unique_matches or match['confidence'] > unique_matches[barber_id]['confidence']:
                unique_matches[barber_id] = match
        
        return sorted(unique_matches.values(), key=lambda x: x['confidence'], reverse=True)
    
    def _analyze_sentiment(self, text: str) -> Tuple[ReviewSentiment, float]:
        """Analyze review sentiment using TextBlob"""
        try:
            blob = TextBlob(text)
            polarity = blob.sentiment.polarity  # -1 to 1
            
            if polarity > 0.3:
                sentiment = ReviewSentiment.POSITIVE
            elif polarity < -0.3:
                sentiment = ReviewSentiment.NEGATIVE
            elif abs(polarity) < 0.1:
                sentiment = ReviewSentiment.NEUTRAL
            else:
                sentiment = ReviewSentiment.MIXED
                
            return sentiment, polarity
            
        except Exception as e:
            logger.error(f"Error analyzing sentiment: {e}")
            return ReviewSentiment.NEUTRAL, 0.0
    
    async def _ai_verify_attribution(self, review_text: str, barber: BarberProfile, all_staff: List[BarberProfile]) -> Dict[str, Any]:
        """Use AI to verify and provide reasoning for barber attribution"""
        
        staff_names = [f"{b.first_name} {b.last_name}" for b in all_staff]
        
        prompt = f"""
        Analyze this barbershop review to determine if it mentions a specific barber named "{barber.first_name} {barber.last_name}".
        
        Review: "{review_text}"
        
        Staff at this barbershop: {', '.join(staff_names)}
        
        Consider:
        1. Is the barber's name explicitly mentioned?
        2. Are there contextual clues linking praise/criticism to this specific barber?
        3. Could the review be referring to a different barber or no specific barber?
        4. What's the confidence level (0-100%) that this review should be attributed to {barber.first_name}?
        
        Respond with a JSON object:
        {{
            "confidence": <number 0-100>,
            "reasoning": "<detailed explanation>",
            "attribution_justified": <true/false>
        }}
        """
        
        try:
            # Try Anthropic Claude first
            response = await self._call_anthropic_claude(prompt)
            
            # Parse JSON response
            result = json.loads(response.strip())
            return {
                'confidence': float(result.get('confidence', 0)),
                'reasoning': result.get('reasoning', 'AI analysis completed'),
                'justified': result.get('attribution_justified', False)
            }
            
        except Exception as e:
            logger.error(f"AI verification failed: {e}")
            # Fallback to basic confidence
            return {
                'confidence': 50.0,
                'reasoning': f"AI verification unavailable, using rule-based matching only: {str(e)[:100]}",
                'justified': True
            }
    
    async def _call_anthropic_claude(self, prompt: str) -> str:
        """Call Anthropic Claude for AI analysis"""
        try:
            response = self.anthropic_client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=500,
                messages=[{"role": "user", "content": prompt}]
            )
            return response.content[0].text
        except Exception as e:
            logger.error(f"Anthropic API error: {str(e)}")
            raise
    
    def _score_to_confidence_level(self, score: float) -> AttributionConfidence:
        """Convert numerical confidence score to confidence level enum"""
        if score >= 91:
            return AttributionConfidence.CERTAIN
        elif score >= 71:
            return AttributionConfidence.HIGH
        elif score >= 41:
            return AttributionConfidence.MEDIUM
        else:
            return AttributionConfidence.LOW
    
    async def batch_analyze_reviews(self, reviews: List[Dict[str, str]], barbershop_staff: List[BarberProfile]) -> List[ReviewAttribution]:
        """Analyze multiple reviews in batch for efficiency"""
        logger.info(f"Batch analyzing {len(reviews)} reviews for {len(barbershop_staff)} staff members")
        
        tasks = []
        for review in reviews:
            task = self.analyze_review(
                review_text=review['text'],
                review_id=review['id'],
                barbershop_staff=barbershop_staff
            )
            tasks.append(task)
        
        # Process reviews concurrently
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Filter out exceptions and log errors
        attributions = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"Failed to analyze review {reviews[i]['id']}: {result}")
            else:
                attributions.append(result)
        
        logger.info(f"Successfully analyzed {len(attributions)} reviews")
        return attributions

# Example usage and testing
async def main():
    """Example usage of the AI Review Attribution Engine"""
    
    # Sample barber profiles
    staff = [
        BarberProfile(
            id="barber_001",
            first_name="Michael",
            last_name="Rodriguez", 
            nickname="Mike",
            aliases=["Big Mike", "Mikey"],
            barbershop_id="elite_cuts_la"
        ),
        BarberProfile(
            id="barber_002", 
            first_name="James",
            last_name="Wilson",
            nickname="Jimmy",
            aliases=["J-Will"],
            barbershop_id="elite_cuts_la"
        ),
        BarberProfile(
            id="barber_003",
            first_name="Carlos",
            last_name="Martinez",
            aliases=["Los"],
            barbershop_id="elite_cuts_la"
        )
    ]
    
    # Sample reviews
    reviews = [
        {
            "id": "review_001",
            "text": "Mike gave me the best fade I've ever had! Highly recommend Elite Cuts."
        },
        {
            "id": "review_002", 
            "text": "Amazing service! The barber was very professional and the cut looks great."
        },
        {
            "id": "review_003",
            "text": "Ask for Jimmy - he knows how to do a perfect beard trim. 5 stars!"
        },
        {
            "id": "review_004",
            "text": "Carlos hooked me up with an incredible cut. Will definitely be back!"
        }
    ]
    
    # Initialize the engine (would use real API keys in production)
    engine = AIReviewAttributionEngine(
        openai_api_key="your_openai_key_here",
        anthropic_api_key="your_anthropic_key_here" 
    )
    
    # Analyze reviews
    attributions = await engine.batch_analyze_reviews(reviews, staff)
    
    # Display results
    for attribution in attributions:
        print(f"\n--- Review {attribution.review_id} ---")
        print(f"Text: {attribution.review_text}")
        print(f"Attributed to: {attribution.barber_name or 'No specific barber'}")
        print(f"Confidence: {attribution.confidence.value} ({attribution.confidence_score:.1f}%)")
        print(f"Sentiment: {attribution.sentiment.value} ({attribution.sentiment_score:.2f})")
        print(f"Reasoning: {attribution.reasoning}")

if __name__ == "__main__":
    asyncio.run(main())