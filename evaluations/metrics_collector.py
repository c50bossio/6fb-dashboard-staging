#!/usr/bin/env python3
"""
Advanced Metrics Collection for AI Evaluation System
Tracks hallucination, ROI impact, latency percentiles, and more
"""

import time
import json
import numpy as np
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
import statistics
import re

@dataclass
class PerformanceMetrics:
    """Comprehensive performance metrics for AI responses"""
    response_time_ms: float
    tokens_used: int
    cost_usd: float
    model_used: str
    latency_p50: float
    latency_p95: float
    latency_p99: float
    memory_usage_mb: float
    
@dataclass
class QualityMetrics:
    """Quality metrics for AI responses"""
    hallucination_score: float  # 0-1, lower is better
    factual_accuracy: float  # 0-1, higher is better
    context_coherence: float  # 0-1, higher is better
    actionability_score: float  # 0-1, higher is better
    relevance_score: float  # 0-1, higher is better
    
@dataclass
class BusinessMetrics:
    """Business impact metrics"""
    roi_impact: float  # Estimated ROI in dollars
    efficiency_gain: float  # Percentage improvement
    customer_satisfaction_delta: float  # Change in satisfaction score
    revenue_opportunity: float  # Potential revenue in dollars
    cost_savings: float  # Estimated savings in dollars


class MetricsCollector:
    """Collects and analyzes advanced metrics for AI evaluations"""
    
    def __init__(self):
        self.latency_history: List[float] = []
        self.cost_history: List[float] = []
        self.hallucination_detections: List[Dict] = []
        self.model_costs = {
            "gpt-5": 0.015,  # per 1K tokens
            "gpt-5-mini": 0.005,
            "claude-opus-4-1-20250805": 0.020,
            "gemini-2.0-flash-exp": 0.002
        }
        
    def calculate_performance_metrics(self, 
                                     response_data: Dict[str, Any],
                                     start_time: float) -> PerformanceMetrics:
        """Calculate comprehensive performance metrics"""
        response_time = (time.time() - start_time) * 1000  # Convert to ms
        
        # Track latency for percentile calculations
        self.latency_history.append(response_time)
        
        # Calculate percentiles
        if len(self.latency_history) >= 10:
            latency_p50 = np.percentile(self.latency_history[-100:], 50)
            latency_p95 = np.percentile(self.latency_history[-100:], 95)
            latency_p99 = np.percentile(self.latency_history[-100:], 99)
        else:
            latency_p50 = latency_p95 = latency_p99 = response_time
            
        # Calculate cost
        model = response_data.get("model", "gpt-5")
        tokens = response_data.get("usage", {}).get("total_tokens", 500)
        cost = (tokens / 1000) * self.model_costs.get(model, 0.01)
        self.cost_history.append(cost)
        
        # Estimate memory usage (simplified)
        memory_mb = len(json.dumps(response_data)) / (1024 * 1024) * 10  # Rough estimate
        
        return PerformanceMetrics(
            response_time_ms=response_time,
            tokens_used=tokens,
            cost_usd=cost,
            model_used=model,
            latency_p50=latency_p50,
            latency_p95=latency_p95,
            latency_p99=latency_p99,
            memory_usage_mb=memory_mb
        )
    
    def detect_hallucination(self, 
                           response: str,
                           ground_truth: Optional[Dict[str, Any]] = None,
                           context: Optional[Dict[str, Any]] = None) -> float:
        """
        Detect potential hallucinations in AI responses
        Returns score 0-1 where 0 is no hallucination, 1 is definite hallucination
        """
        hallucination_score = 0.0
        indicators = []
        
        # Check for impossible numbers
        numbers = re.findall(r'\d+\.?\d*', response)
        for num in numbers:
            value = float(num)
            # Check for unrealistic percentages
            if "%" in response and value > 100:
                hallucination_score += 0.3
                indicators.append(f"Impossible percentage: {value}%")
            
            # Check for unrealistic revenue/cost figures
            if any(word in response.lower() for word in ["revenue", "cost", "price"]):
                if value > 1000000:  # Over $1M for single barbershop
                    hallucination_score += 0.2
                    indicators.append(f"Unrealistic financial figure: ${value}")
        
        # Check against ground truth if provided
        if ground_truth:
            for key, true_value in ground_truth.items():
                if str(true_value) in response:
                    hallucination_score -= 0.1  # Reduce score for matching facts
                elif key in response.lower():
                    # Key mentioned but wrong value
                    hallucination_score += 0.2
                    indicators.append(f"Incorrect value for {key}")
        
        # Check for contradictions within response
        sentences = response.split('.')
        for i, sent1 in enumerate(sentences):
            for sent2 in sentences[i+1:]:
                if self._contradicts(sent1, sent2):
                    hallucination_score += 0.3
                    indicators.append("Internal contradiction detected")
                    break
        
        # Check for made-up statistics without sources
        stat_patterns = [
            r'\d+% of customers',
            r'studies show',
            r'research indicates',
            r'data suggests'
        ]
        for pattern in stat_patterns:
            if re.search(pattern, response.lower()) and "according to" not in response.lower():
                hallucination_score += 0.1
                indicators.append("Unsourced statistical claim")
        
        # Normalize score to 0-1 range
        hallucination_score = max(0, min(1, hallucination_score))
        
        # Log detection
        self.hallucination_detections.append({
            "timestamp": datetime.now().isoformat(),
            "score": hallucination_score,
            "indicators": indicators,
            "response_excerpt": response[:200]
        })
        
        return hallucination_score
    
    def calculate_roi_impact(self,
                           recommendation: Dict[str, Any],
                           business_metrics: Dict[str, Any]) -> BusinessMetrics:
        """Calculate the ROI impact of AI recommendations"""
        current_revenue = business_metrics.get("monthly_revenue", 50000)
        current_costs = business_metrics.get("monthly_costs", 30000)
        current_satisfaction = business_metrics.get("customer_satisfaction", 4.0)
        
        # Analyze recommendation impact
        roi_impact = 0
        efficiency_gain = 0
        satisfaction_delta = 0
        revenue_opportunity = 0
        cost_savings = 0
        
        # Price optimization impact
        if "price" in str(recommendation).lower():
            suggested_price = recommendation.get("suggested_price", 0)
            current_price = business_metrics.get("current_price", 25)
            volume = business_metrics.get("monthly_volume", 1000)
            
            # Estimate volume change based on price elasticity
            price_change_pct = (suggested_price - current_price) / current_price
            volume_change_pct = price_change_pct * -0.5  # Assuming -0.5 elasticity
            new_volume = volume * (1 + volume_change_pct)
            
            revenue_opportunity = (suggested_price * new_volume) - (current_price * volume)
            roi_impact = revenue_opportunity * 12  # Annual impact
        
        # Operational efficiency impact
        if "schedule" in str(recommendation).lower() or "staff" in str(recommendation).lower():
            # Estimate 10-20% efficiency gain from better scheduling
            efficiency_gain = 0.15
            cost_savings = current_costs * efficiency_gain
            roi_impact += cost_savings * 12
        
        # Customer retention impact
        if "retention" in str(recommendation).lower() or "loyalty" in str(recommendation).lower():
            # Estimate 5% improvement in retention = 10% revenue increase
            retention_improvement = 0.05
            revenue_opportunity = current_revenue * (retention_improvement * 2)
            satisfaction_delta = 0.2  # Assume 0.2 point increase in satisfaction
            roi_impact += revenue_opportunity * 12
        
        # Marketing campaign impact
        if "marketing" in str(recommendation).lower() or "campaign" in str(recommendation).lower():
            # Estimate 15% increase in new customers
            new_customer_rate = 0.15
            avg_customer_value = current_revenue / business_metrics.get("customer_count", 500)
            new_customers = business_metrics.get("customer_count", 500) * new_customer_rate
            revenue_opportunity = new_customers * avg_customer_value
            roi_impact += revenue_opportunity * 12
        
        return BusinessMetrics(
            roi_impact=roi_impact,
            efficiency_gain=efficiency_gain * 100,  # Convert to percentage
            customer_satisfaction_delta=satisfaction_delta,
            revenue_opportunity=revenue_opportunity,
            cost_savings=cost_savings
        )
    
    def calculate_context_coherence(self,
                                   conversation_turns: List[Dict[str, str]]) -> float:
        """
        Calculate how well AI maintains context across conversation turns
        Returns score 0-1 where 1 is perfect coherence
        """
        if len(conversation_turns) < 2:
            return 1.0
        
        coherence_score = 1.0
        mentioned_entities = set()
        topic_consistency = []
        
        for i, turn in enumerate(conversation_turns):
            ai_response = turn.get("ai_response", "")
            
            # Extract entities/topics mentioned
            current_entities = self._extract_entities(ai_response)
            
            if i > 0:
                # Check if previous context is maintained
                prev_user_message = conversation_turns[i-1].get("user_message", "")
                prev_entities = self._extract_entities(prev_user_message)
                
                # Entities from previous turn should be acknowledged
                missed_entities = prev_entities - current_entities
                if missed_entities:
                    coherence_score -= 0.1 * len(missed_entities)
                
                # Check for topic drift
                topic_similarity = self._calculate_topic_similarity(
                    conversation_turns[i-1].get("ai_response", ""),
                    ai_response
                )
                topic_consistency.append(topic_similarity)
            
            mentioned_entities.update(current_entities)
        
        # Calculate average topic consistency
        if topic_consistency:
            avg_consistency = statistics.mean(topic_consistency)
            coherence_score *= avg_consistency
        
        return max(0, min(1, coherence_score))
    
    def calculate_actionability_score(self, response: str) -> float:
        """
        Calculate how actionable the AI's recommendations are
        Returns score 0-1 where 1 is highly actionable
        """
        actionability_score = 0.0
        
        # Check for specific action verbs
        action_verbs = [
            "implement", "create", "set up", "launch", "start",
            "increase", "decrease", "optimize", "improve", "add",
            "remove", "change", "update", "schedule", "hire",
            "train", "promote", "offer", "introduce", "analyze"
        ]
        
        response_lower = response.lower()
        for verb in action_verbs:
            if verb in response_lower:
                actionability_score += 0.1
        
        # Check for specific timeframes
        timeframe_patterns = [
            r"within \d+ (days?|weeks?|months?)",
            r"by (monday|tuesday|wednesday|thursday|friday|saturday|sunday)",
            r"(immediately|today|tomorrow|this week|next week)",
            r"(q1|q2|q3|q4|first quarter|second quarter)"
        ]
        
        for pattern in timeframe_patterns:
            if re.search(pattern, response_lower):
                actionability_score += 0.15
        
        # Check for specific metrics/goals
        metric_patterns = [
            r"\d+%",
            r"\$\d+",
            r"increase .* by",
            r"reduce .* by",
            r"achieve .* of"
        ]
        
        for pattern in metric_patterns:
            if re.search(pattern, response_lower):
                actionability_score += 0.1
        
        # Check for step-by-step instructions
        if any(indicator in response_lower for indicator in ["step 1", "first,", "1.", "a)"]):
            actionability_score += 0.2
        
        return min(1.0, actionability_score)
    
    def _contradicts(self, sent1: str, sent2: str) -> bool:
        """Check if two sentences contradict each other"""
        # Simplified contradiction detection
        negation_words = ["not", "no", "never", "don't", "doesn't", "didn't", "won't", "wouldn't"]
        
        sent1_lower = sent1.lower()
        sent2_lower = sent2.lower()
        
        # Check for opposite sentiments about same entity
        for neg in negation_words:
            if neg in sent1_lower and neg not in sent2_lower:
                # Check if they're talking about the same thing
                words1 = set(sent1_lower.split())
                words2 = set(sent2_lower.split())
                common_words = words1.intersection(words2)
                if len(common_words) > 3:  # Significant overlap
                    return True
        
        return False
    
    def _extract_entities(self, text: str) -> set:
        """Extract key entities/topics from text"""
        # Simplified entity extraction
        entities = set()
        
        # Extract money amounts
        money_patterns = re.findall(r'\$[\d,]+', text)
        entities.update(money_patterns)
        
        # Extract percentages
        percent_patterns = re.findall(r'\d+%', text)
        entities.update(percent_patterns)
        
        # Extract key business terms
        business_terms = [
            "revenue", "customer", "booking", "appointment",
            "barber", "shop", "service", "price", "cost",
            "profit", "marketing", "schedule", "staff"
        ]
        
        text_lower = text.lower()
        for term in business_terms:
            if term in text_lower:
                entities.add(term)
        
        return entities
    
    def _calculate_topic_similarity(self, text1: str, text2: str) -> float:
        """Calculate topic similarity between two texts"""
        # Simplified topic similarity using word overlap
        words1 = set(text1.lower().split())
        words2 = set(text2.lower().split())
        
        # Remove common stop words
        stop_words = {"the", "is", "at", "which", "on", "a", "an", "and", "or", "but", "in", "with", "to", "for"}
        words1 = words1 - stop_words
        words2 = words2 - stop_words
        
        if not words1 or not words2:
            return 0.5
        
        intersection = words1.intersection(words2)
        union = words1.union(words2)
        
        return len(intersection) / len(union) if union else 0
    
    def generate_metrics_summary(self) -> Dict[str, Any]:
        """Generate comprehensive metrics summary"""
        summary = {
            "performance": {
                "avg_latency_ms": statistics.mean(self.latency_history) if self.latency_history else 0,
                "p50_latency_ms": np.percentile(self.latency_history, 50) if self.latency_history else 0,
                "p95_latency_ms": np.percentile(self.latency_history, 95) if self.latency_history else 0,
                "p99_latency_ms": np.percentile(self.latency_history, 99) if self.latency_history else 0,
                "total_cost_usd": sum(self.cost_history),
                "avg_cost_per_query": statistics.mean(self.cost_history) if self.cost_history else 0
            },
            "quality": {
                "hallucination_detections": len(self.hallucination_detections),
                "avg_hallucination_score": statistics.mean([d["score"] for d in self.hallucination_detections]) if self.hallucination_detections else 0,
                "high_risk_hallucinations": sum(1 for d in self.hallucination_detections if d["score"] > 0.7)
            },
            "cost_analysis": {
                "total_queries": len(self.cost_history),
                "total_cost": sum(self.cost_history),
                "cost_by_model": {},
                "most_economical_model": None,
                "most_expensive_model": None
            }
        }
        
        # Calculate cost by model
        if self.cost_history:
            # This would need actual model tracking, simplified for now
            summary["cost_analysis"]["most_economical_model"] = "gemini-2.0-flash-exp"
            summary["cost_analysis"]["most_expensive_model"] = "claude-opus-4-1-20250805"
        
        return summary