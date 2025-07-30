#!/usr/bin/env python3
"""
AI-Powered Booking Intelligence Service
Uses real LLM models (OpenAI GPT-4, Anthropic Claude) for intelligent booking recommendations
"""

import os
import json
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union
import openai
import anthropic
from dataclasses import dataclass, asdict
import sqlite3
import logging

logger = logging.getLogger(__name__)

@dataclass
class AIRecommendation:
    """AI-generated booking recommendation"""
    recommendation_id: str
    customer_id: str
    recommendation_type: str
    title: str
    description: str
    reasoning: str
    confidence_score: float
    suggested_actions: List[Dict[str, Any]]
    ai_model_used: str
    generated_at: str

@dataclass
class CustomerInsight:
    """AI-generated customer insight"""
    insight_id: str
    customer_id: str
    insight_type: str  # "behavior_pattern", "preference_change", "loyalty_risk", "upsell_opportunity"
    insight_text: str
    actionable_recommendations: List[str]
    confidence_score: float
    supporting_data: Dict[str, Any]
    ai_model_used: str
    generated_at: str

class AIBookingIntelligence:
    """AI-powered booking intelligence using real LLM models"""
    
    def __init__(self, db_path: str = "ai_booking_intelligence.db"):
        self.db_path = db_path
        self.openai_client = None
        self.anthropic_client = None
        
        # Initialize AI clients
        self._init_ai_clients()
        self._init_database()
    
    def _init_ai_clients(self):
        """Initialize AI API clients"""
        try:
            # OpenAI client
            openai_key = os.getenv('OPENAI_API_KEY')
            if openai_key:
                openai.api_key = openai_key
                self.openai_client = openai
                logger.info("✅ OpenAI client initialized")
            else:
                logger.warning("⚠️ OPENAI_API_KEY not found")
            
            # Anthropic client
            anthropic_key = os.getenv('ANTHROPIC_API_KEY')
            if anthropic_key:
                self.anthropic_client = anthropic.Anthropic(api_key=anthropic_key)
                logger.info("✅ Anthropic client initialized")
            else:
                logger.warning("⚠️ ANTHROPIC_API_KEY not found")
                
        except Exception as e:
            logger.error(f"Error initializing AI clients: {e}")
    
    def _init_database(self):
        """Initialize database for AI insights and recommendations"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # AI recommendations table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS ai_recommendations (
                recommendation_id TEXT PRIMARY KEY,
                customer_id TEXT,
                recommendation_type TEXT,
                title TEXT,
                description TEXT,
                reasoning TEXT,
                confidence_score REAL,
                suggested_actions TEXT,  -- JSON
                ai_model_used TEXT,
                generated_at TEXT,
                is_presented BOOLEAN DEFAULT FALSE,
                is_accepted BOOLEAN DEFAULT FALSE,
                customer_feedback TEXT
            )
        ''')
        
        # AI customer insights table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS ai_customer_insights (
                insight_id TEXT PRIMARY KEY,
                customer_id TEXT,
                insight_type TEXT,
                insight_text TEXT,
                actionable_recommendations TEXT,  -- JSON
                confidence_score REAL,
                supporting_data TEXT,  -- JSON
                ai_model_used TEXT,
                generated_at TEXT,
                is_acted_upon BOOLEAN DEFAULT FALSE
            )
        ''')
        
        # AI learning feedback table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS ai_learning_feedback (
                feedback_id TEXT PRIMARY KEY,
                recommendation_id TEXT,
                customer_id TEXT,
                feedback_type TEXT,  -- 'accepted', 'rejected', 'modified'
                feedback_details TEXT,
                actual_outcome TEXT,
                learning_notes TEXT,
                created_at TEXT
            )
        ''')
        
        conn.commit()
        conn.close()
    
    async def generate_smart_recommendations(self, customer_id: str, booking_history: List[Dict], current_context: Dict = None) -> List[AIRecommendation]:
        """Generate AI-powered smart recommendations"""
        try:
            # Prepare context for AI
            context = self._prepare_customer_context(customer_id, booking_history, current_context)
            
            # Try Claude first (better for reasoning), fallback to GPT-4
            if self.anthropic_client:
                recommendations = await self._generate_recommendations_claude(context)
            elif self.openai_client:
                recommendations = await self._generate_recommendations_openai(context)
            else:
                # Fallback to rule-based system
                logger.warning("No AI clients available, using fallback recommendations")
                return self._generate_fallback_recommendations(customer_id, booking_history)
            
            # Store recommendations in database
            for rec in recommendations:
                self._store_ai_recommendation(rec)
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Error generating AI recommendations: {e}")
            return self._generate_fallback_recommendations(customer_id, booking_history)
    
    async def analyze_customer_behavior(self, customer_id: str, booking_history: List[Dict]) -> List[CustomerInsight]:
        """AI-powered customer behavior analysis"""
        try:
            context = self._prepare_behavior_analysis_context(customer_id, booking_history)
            
            # Use Claude for behavior analysis (better at pattern recognition)
            if self.anthropic_client:
                insights = await self._analyze_behavior_claude(context)
            elif self.openai_client:
                insights = await self._analyze_behavior_openai(context)
            else:
                logger.warning("No AI clients available, using rule-based analysis")
                return self._generate_fallback_insights(customer_id, booking_history)
            
            # Store insights
            for insight in insights:
                self._store_customer_insight(insight)
            
            return insights
            
        except Exception as e:
            logger.error(f"Error analyzing customer behavior: {e}")
            return self._generate_fallback_insights(customer_id, booking_history)
    
    async def _generate_recommendations_claude(self, context: Dict) -> List[AIRecommendation]:
        """Generate recommendations using Anthropic Claude"""
        prompt = f"""
        You are an AI booking intelligence system for a barbershop platform. Analyze the customer data and generate smart booking recommendations.

        Customer Context:
        {json.dumps(context, indent=2)}

        Generate 2-4 personalized booking recommendations. For each recommendation, provide:
        1. recommendation_type: "next_appointment", "service_upgrade", "loyalty_reward", "time_optimization"
        2. title: Clear, engaging title
        3. description: Brief explanation (1-2 sentences)
        4. reasoning: Why this recommendation makes sense
        5. confidence_score: 0.0-1.0 based on data strength
        6. suggested_actions: Specific actionable steps

        Respond in JSON format:
        {{
            "recommendations": [
                {{
                    "recommendation_type": "next_appointment",
                    "title": "Perfect timing for your next cut",
                    "description": "Based on your booking pattern, you're due for another appointment.",
                    "reasoning": "Customer books every 3-4 weeks on average, last visit was 3 weeks ago",
                    "confidence_score": 0.85,
                    "suggested_actions": [
                        {{"action": "book_appointment", "barber_id": "preferred_barber", "service_type": "usual_service"}}
                    ]
                }}
            ]
        }}
        """
        
        try:
            response = await asyncio.to_thread(
                self.anthropic_client.messages.create,
                model="claude-3-sonnet-20240229",
                max_tokens=1000,
                messages=[{"role": "user", "content": prompt}]
            )
            
            # Parse Claude's response
            response_text = response.content[0].text
            ai_response = json.loads(response_text)
            
            recommendations = []
            for i, rec_data in enumerate(ai_response.get('recommendations', [])):
                rec = AIRecommendation(
                    recommendation_id=f"claude_rec_{context['customer_id']}_{i}_{int(datetime.now().timestamp())}",
                    customer_id=context['customer_id'],
                    recommendation_type=rec_data.get('recommendation_type', 'general'),
                    title=rec_data.get('title', 'Smart Recommendation'),
                    description=rec_data.get('description', ''),
                    reasoning=rec_data.get('reasoning', ''),
                    confidence_score=rec_data.get('confidence_score', 0.7),
                    suggested_actions=rec_data.get('suggested_actions', []),
                    ai_model_used="claude-3-sonnet",
                    generated_at=datetime.now().isoformat()
                )
                recommendations.append(rec)
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Claude API error: {e}")
            raise
    
    async def _generate_recommendations_openai(self, context: Dict) -> List[AIRecommendation]:
        """Generate recommendations using OpenAI GPT-4"""
        prompt = f"""
        You are an AI booking intelligence system for a barbershop platform. Analyze the customer data and generate smart booking recommendations.

        Customer Context:
        {json.dumps(context, indent=2)}

        Generate 2-4 personalized booking recommendations in JSON format with the structure:
        {{
            "recommendations": [
                {{
                    "recommendation_type": "next_appointment" | "service_upgrade" | "loyalty_reward" | "time_optimization",
                    "title": "Clear, engaging title",
                    "description": "Brief explanation (1-2 sentences)",
                    "reasoning": "Why this recommendation makes sense based on data",
                    "confidence_score": 0.0-1.0,
                    "suggested_actions": [
                        {{"action": "specific_action", "details": "actionable_step"}}
                    ]
                }}
            ]
        }}

        Focus on actionable, personalized recommendations based on the customer's booking history and preferences.
        """
        
        try:
            response = await asyncio.to_thread(
                self.openai_client.ChatCompletion.create,
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are an expert AI booking intelligence system specializing in personalized barbershop recommendations."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=1000,
                temperature=0.7
            )
            
            # Parse GPT-4's response
            response_text = response.choices[0].message.content
            ai_response = json.loads(response_text)
            
            recommendations = []
            for i, rec_data in enumerate(ai_response.get('recommendations', [])):
                rec = AIRecommendation(
                    recommendation_id=f"gpt4_rec_{context['customer_id']}_{i}_{int(datetime.now().timestamp())}",
                    customer_id=context['customer_id'],
                    recommendation_type=rec_data.get('recommendation_type', 'general'),
                    title=rec_data.get('title', 'Smart Recommendation'),
                    description=rec_data.get('description', ''),
                    reasoning=rec_data.get('reasoning', ''),
                    confidence_score=rec_data.get('confidence_score', 0.7),
                    suggested_actions=rec_data.get('suggested_actions', []),
                    ai_model_used="gpt-4",
                    generated_at=datetime.now().isoformat()
                )
                recommendations.append(rec)
            
            return recommendations
            
        except Exception as e:
            logger.error(f"OpenAI API error: {e}")
            raise
    
    async def _analyze_behavior_claude(self, context: Dict) -> List[CustomerInsight]:
        """Analyze customer behavior using Claude"""
        prompt = f"""
        You are an AI customer behavior analyst for a barbershop platform. Analyze the booking patterns and generate insights.

        Customer Data:
        {json.dumps(context, indent=2)}

        Analyze the data and generate 2-3 key insights about this customer's behavior patterns. For each insight:
        1. insight_type: "behavior_pattern", "preference_change", "loyalty_risk", "upsell_opportunity"
        2. insight_text: Clear description of the insight
        3. actionable_recommendations: Specific actions to take
        4. confidence_score: 0.0-1.0 based on data strength
        5. supporting_data: Key data points that support this insight

        Respond in JSON format:
        {{
            "insights": [
                {{
                    "insight_type": "behavior_pattern",
                    "insight_text": "Customer shows consistent booking behavior with 3-week intervals",
                    "actionable_recommendations": ["Send proactive booking reminder after 2.5 weeks", "Offer subscription service"],
                    "confidence_score": 0.9,
                    "supporting_data": {{"average_interval_days": 21, "consistency_score": 0.85}}
                }}
            ]
        }}
        """
        
        try:
            response = await asyncio.to_thread(
                self.anthropic_client.messages.create,
                model="claude-3-sonnet-20240229",
                max_tokens=800,
                messages=[{"role": "user", "content": prompt}]
            )
            
            response_text = response.content[0].text
            ai_response = json.loads(response_text)
            
            insights = []
            for i, insight_data in enumerate(ai_response.get('insights', [])):
                insight = CustomerInsight(
                    insight_id=f"claude_insight_{context['customer_id']}_{i}_{int(datetime.now().timestamp())}",
                    customer_id=context['customer_id'],
                    insight_type=insight_data.get('insight_type', 'general'),
                    insight_text=insight_data.get('insight_text', ''),
                    actionable_recommendations=insight_data.get('actionable_recommendations', []),
                    confidence_score=insight_data.get('confidence_score', 0.7),
                    supporting_data=insight_data.get('supporting_data', {}),
                    ai_model_used="claude-3-sonnet",
                    generated_at=datetime.now().isoformat()
                )
                insights.append(insight)
            
            return insights
            
        except Exception as e:
            logger.error(f"Claude behavior analysis error: {e}")
            raise
    
    def _prepare_customer_context(self, customer_id: str, booking_history: List[Dict], current_context: Dict = None) -> Dict:
        """Prepare comprehensive customer context for AI analysis"""
        if not booking_history:
            return {"customer_id": customer_id, "message": "No booking history available"}
        
        # Calculate key metrics
        total_bookings = len(booking_history)
        total_spent = sum(booking.get('price', 0) for booking in booking_history)
        avg_price = total_spent / total_bookings if total_bookings > 0 else 0
        
        # Service preferences
        services = [booking.get('service_name') for booking in booking_history if booking.get('service_name')]
        service_counts = {}
        for service in services:
            service_counts[service] = service_counts.get(service, 0) + 1
        
        # Booking frequency analysis
        dates = []
        for booking in booking_history:
            if booking.get('scheduled_at'):
                try:
                    dates.append(datetime.fromisoformat(booking['scheduled_at']))
                except:
                    continue
        
        dates.sort()
        intervals = []
        if len(dates) > 1:
            for i in range(1, len(dates)):
                intervals.append((dates[i] - dates[i-1]).days)
        
        avg_interval = sum(intervals) / len(intervals) if intervals else 30
        
        context = {
            "customer_id": customer_id,
            "booking_summary": {
                "total_bookings": total_bookings,
                "total_spent": total_spent,
                "average_price": avg_price,
                "booking_frequency_days": avg_interval,
                "last_booking_date": dates[-1].isoformat() if dates else None,
                "first_booking_date": dates[0].isoformat() if dates else None
            },
            "service_preferences": service_counts,
            "recent_bookings": booking_history[-5:],  # Last 5 bookings
            "booking_intervals": intervals[-10:] if intervals else [],  # Last 10 intervals
            "current_context": current_context or {}
        }
        
        return context
    
    def _prepare_behavior_analysis_context(self, customer_id: str, booking_history: List[Dict]) -> Dict:
        """Prepare context specifically for behavior analysis"""
        context = self._prepare_customer_context(customer_id, booking_history)
        
        # Add behavior-specific metrics
        if booking_history:
            # Time of day preferences
            times = []
            days_of_week = []
            for booking in booking_history:
                if booking.get('scheduled_at'):
                    try:
                        dt = datetime.fromisoformat(booking['scheduled_at'])
                        times.append(dt.hour)
                        days_of_week.append(dt.weekday())
                    except:
                        continue
            
            context["behavior_patterns"] = {
                "preferred_hours": times,
                "preferred_days_of_week": days_of_week,
                "booking_consistency": len(set(times)) / len(times) if times else 1,
                "loyalty_indicators": {
                    "repeat_bookings": len(booking_history),
                    "service_variety": len(set(booking.get('service_name') for booking in booking_history if booking.get('service_name'))),
                    "price_consistency": abs(max(booking.get('price', 0) for booking in booking_history) - min(booking.get('price', 0) for booking in booking_history))
                }
            }
        
        return context
    
    def _generate_fallback_recommendations(self, customer_id: str, booking_history: List[Dict]) -> List[AIRecommendation]:
        """Fallback recommendations when AI is not available"""
        recommendations = []
        
        if not booking_history:
            rec = AIRecommendation(
                recommendation_id=f"fallback_rec_{customer_id}_{int(datetime.now().timestamp())}",
                customer_id=customer_id,
                recommendation_type="first_booking",
                title="Welcome! Time for your first appointment",
                description="Book your first appointment to start building your personalized experience.",
                reasoning="New customer with no booking history",
                confidence_score=0.8,
                suggested_actions=[{"action": "book_appointment", "details": "Choose any available service"}],
                ai_model_used="rule_based_fallback",
                generated_at=datetime.now().isoformat()
            )
            recommendations.append(rec)
        else:
            # Basic rule-based recommendation
            last_booking = booking_history[-1]
            days_since = (datetime.now() - datetime.fromisoformat(last_booking['scheduled_at'])).days
            
            if days_since >= 21:  # 3 weeks
                rec = AIRecommendation(
                    recommendation_id=f"fallback_rec_{customer_id}_{int(datetime.now().timestamp())}",
                    customer_id=customer_id,
                    recommendation_type="next_appointment",
                    title="Time for your next appointment!",
                    description=f"It's been {days_since} days since your last visit. Book now to maintain your look.",
                    reasoning="Based on typical 3-week booking cycle",
                    confidence_score=0.6,
                    suggested_actions=[{"action": "book_appointment", "service": last_booking.get('service_name')}],
                    ai_model_used="rule_based_fallback",
                    generated_at=datetime.now().isoformat()
                )
                recommendations.append(rec)
        
        return recommendations
    
    def _generate_fallback_insights(self, customer_id: str, booking_history: List[Dict]) -> List[CustomerInsight]:
        """Fallback insights when AI is not available"""
        insights = []
        
        if len(booking_history) >= 3:
            # Basic pattern analysis
            dates = []
            for booking in booking_history:
                try:
                    dates.append(datetime.fromisoformat(booking['scheduled_at']))
                except:
                    continue
            
            if len(dates) >= 2:
                dates.sort()
                intervals = [(dates[i] - dates[i-1]).days for i in range(1, len(dates))]
                avg_interval = sum(intervals) / len(intervals)
                
                insight = CustomerInsight(
                    insight_id=f"fallback_insight_{customer_id}_{int(datetime.now().timestamp())}",
                    customer_id=customer_id,
                    insight_type="behavior_pattern",
                    insight_text=f"Customer shows regular booking pattern with {avg_interval:.1f} day average interval",
                    actionable_recommendations=[
                        f"Send reminder after {int(avg_interval * 0.8)} days",
                        "Offer loyalty program for regular customers"
                    ],
                    confidence_score=0.7,
                    supporting_data={"average_interval": avg_interval, "total_bookings": len(booking_history)},
                    ai_model_used="rule_based_fallback",
                    generated_at=datetime.now().isoformat()
                )
                insights.append(insight)
        
        return insights
    
    def _store_ai_recommendation(self, recommendation: AIRecommendation):
        """Store AI recommendation in database"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT OR REPLACE INTO ai_recommendations (
                    recommendation_id, customer_id, recommendation_type, title, description,
                    reasoning, confidence_score, suggested_actions, ai_model_used, generated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                recommendation.recommendation_id,
                recommendation.customer_id,
                recommendation.recommendation_type,
                recommendation.title,
                recommendation.description,
                recommendation.reasoning,
                recommendation.confidence_score,
                json.dumps(recommendation.suggested_actions),
                recommendation.ai_model_used,
                recommendation.generated_at
            ))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Error storing AI recommendation: {e}")
    
    def _store_customer_insight(self, insight: CustomerInsight):
        """Store customer insight in database"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT OR REPLACE INTO ai_customer_insights (
                    insight_id, customer_id, insight_type, insight_text,
                    actionable_recommendations, confidence_score, supporting_data,
                    ai_model_used, generated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                insight.insight_id,
                insight.customer_id,
                insight.insight_type,
                insight.insight_text,
                json.dumps(insight.actionable_recommendations),
                insight.confidence_score,
                json.dumps(insight.supporting_data),
                insight.ai_model_used,
                insight.generated_at
            ))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Error storing customer insight: {e}")
    
    def get_ai_recommendations(self, customer_id: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Get stored AI recommendations for customer"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT * FROM ai_recommendations 
                WHERE customer_id = ? 
                ORDER BY generated_at DESC 
                LIMIT ?
            ''', (customer_id, limit))
            
            recommendations = []
            columns = [description[0] for description in cursor.description]
            
            for row in cursor.fetchall():
                rec_dict = dict(zip(columns, row))
                rec_dict['suggested_actions'] = json.loads(rec_dict['suggested_actions'] or '[]')
                recommendations.append(rec_dict)
            
            conn.close()
            return recommendations
            
        except Exception as e:
            logger.error(f"Error getting AI recommendations: {e}")
            return []
    
    def get_customer_insights(self, customer_id: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Get stored customer insights"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT * FROM ai_customer_insights 
                WHERE customer_id = ? 
                ORDER BY generated_at DESC 
                LIMIT ?
            ''', (customer_id, limit))
            
            insights = []
            columns = [description[0] for description in cursor.description]
            
            for row in cursor.fetchall():
                insight_dict = dict(zip(columns, row))
                insight_dict['actionable_recommendations'] = json.loads(insight_dict['actionable_recommendations'] or '[]')
                insight_dict['supporting_data'] = json.loads(insight_dict['supporting_data'] or '{}')
                insights.append(insight_dict)
            
            conn.close()
            return insights
            
        except Exception as e:
            logger.error(f"Error getting customer insights: {e}")
            return []

# Usage example and testing
if __name__ == "__main__":
    import asyncio
    
    async def test_ai_intelligence():
        ai = AIBookingIntelligence()
        
        # Sample booking history
        booking_history = [
            {
                'customer_id': 'test_customer',
                'service_name': 'Classic Haircut',
                'scheduled_at': (datetime.now() - timedelta(days=30)).isoformat(),
                'price': 25.0
            },
            {
                'customer_id': 'test_customer',
                'service_name': 'Beard Trim',
                'scheduled_at': (datetime.now() - timedelta(days=15)).isoformat(),
                'price': 15.0
            }
        ]
        
        # Generate AI recommendations
        recommendations = await ai.generate_smart_recommendations('test_customer', booking_history)
        print(f"Generated {len(recommendations)} AI recommendations")
        
        for rec in recommendations:
            print(f"- {rec.title} (confidence: {rec.confidence_score:.2f}, model: {rec.ai_model_used})")
        
        # Analyze behavior
        insights = await ai.analyze_customer_behavior('test_customer', booking_history)
        print(f"Generated {len(insights)} customer insights")
        
        for insight in insights:
            print(f"- {insight.insight_text} (confidence: {insight.confidence_score:.2f})")
    
    # Run the test
    asyncio.run(test_ai_intelligence())