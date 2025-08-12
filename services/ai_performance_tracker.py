#!/usr/bin/env python3
"""
AI Performance Tracker - Middleware for automatic performance monitoring
Integrates with existing AI providers to track metrics transparently
"""

import asyncio
import functools
import json
import logging
import time
from datetime import datetime
from typing import Dict, List, Optional, Any, Callable, Union
from contextlib import asynccontextmanager

from .ai_performance_monitor import (
    ai_performance_monitor,
    AIProvider,
    ModelType,
    PerformanceMetric,
    MetricType
)

logger = logging.getLogger(__name__)

class AIProviderTracker:
    """Tracks performance for specific AI providers"""
    
    def __init__(self, provider: AIProvider):
        self.provider = provider
        self.active_requests = {}
        
    async def track_request(self, 
                           model: ModelType,
                           request_func: Callable,
                           *args,
                           session_id: str = "",
                           user_id: str = "",
                           context_data: Dict[str, Any] = None,
                           **kwargs) -> Any:
        """Track a single AI request with comprehensive metrics"""
        
        start_time = time.time()
        request_id = None
        success = False
        tokens_used = 0
        cost = 0.0
        confidence_score = 0.0
        
        if context_data is None:
            context_data = {}
        
        try:
            # Execute the AI request
            result = await request_func(*args, **kwargs) if asyncio.iscoroutinefunction(request_func) else request_func(*args, **kwargs)
            
            success = True
            
            # Extract metrics from result if available
            if isinstance(result, dict):
                tokens_used = self._extract_token_count(result)
                cost = self._estimate_cost(model, tokens_used)
                confidence_score = self._extract_confidence(result)
            
            return result
            
        except Exception as e:
            logger.error(f"AI request failed: {e}")
            success = False
            raise
            
        finally:
            end_time = time.time()
            
            # Record comprehensive metrics
            try:
                request_id = await ai_performance_monitor.record_ai_request(
                    provider=self.provider,
                    model=model,
                    start_time=start_time,
                    end_time=end_time,
                    success=success,
                    tokens_used=tokens_used,
                    cost=cost,
                    confidence_score=confidence_score,
                    context_data=context_data,
                    session_id=session_id,
                    user_id=user_id
                )
            except Exception as e:
                logger.error(f"Failed to record AI metrics: {e}")
    
    def _extract_token_count(self, result: Dict[str, Any]) -> int:
        """Extract token count from AI response"""
        
        # OpenAI format
        if 'usage' in result:
            return result['usage'].get('total_tokens', 0)
        
        # Anthropic format
        if 'usage' in result:
            return result['usage'].get('input_tokens', 0) + result['usage'].get('output_tokens', 0)
        
        # Estimate from text length if no usage data
        if 'choices' in result and result['choices']:
            text = result['choices'][0].get('message', {}).get('content', '')
            return len(text.split()) * 1.3  # Rough token estimation
        
        return 0
    
    def _estimate_cost(self, model: ModelType, tokens_used: int) -> float:
        """Estimate cost based on model and tokens"""
        
        # Cost per 1K tokens (as of August 2025, estimated)
        cost_per_1k_tokens = {
            ModelType.GPT_5: 0.10,
            ModelType.GPT_5_MINI: 0.05,
            ModelType.GPT_5_NANO: 0.02,
            ModelType.CLAUDE_OPUS_4_1: 0.08,
            ModelType.GEMINI_2_0_FLASH: 0.03
        }
        
        rate = cost_per_1k_tokens.get(model, 0.05)  # Default rate
        return (tokens_used / 1000) * rate
    
    def _extract_confidence(self, result: Dict[str, Any]) -> float:
        """Extract confidence score from AI response"""
        
        # Some providers include confidence scores
        if 'confidence' in result:
            return result['confidence']
        
        # Estimate confidence from response characteristics
        if 'choices' in result and result['choices']:
            choice = result['choices'][0]
            if 'logprobs' in choice and choice['logprobs']:
                # Use logprobs if available
                return min(1.0, abs(choice['logprobs']['top_logprobs'][0]) / 10)
        
        # Default confidence
        return 0.8

class OpenAITracker(AIProviderTracker):
    """OpenAI-specific performance tracking"""
    
    def __init__(self):
        super().__init__(AIProvider.OPENAI)
    
    def track_completion(self, model: str = "gpt-5"):
        """Decorator for OpenAI completion tracking"""
        model_type = self._get_model_type(model)
        
        def decorator(func):
            @functools.wraps(func)
            async def wrapper(*args, **kwargs):
                # Extract session info from kwargs if available
                session_id = kwargs.pop('session_id', '')
                user_id = kwargs.pop('user_id', '')
                context_data = kwargs.pop('context_data', {})
                
                return await self.track_request(
                    model=model_type,
                    request_func=func,
                    *args,
                    session_id=session_id,
                    user_id=user_id,
                    context_data=context_data,
                    **kwargs
                )
            return wrapper
        return decorator
    
    def _get_model_type(self, model_name: str) -> ModelType:
        """Map OpenAI model name to ModelType"""
        model_mapping = {
            "gpt-5": ModelType.GPT_5,
            "gpt-5-mini": ModelType.GPT_5_MINI,
            "gpt-5-nano": ModelType.GPT_5_NANO
        }
        return model_mapping.get(model_name, ModelType.GPT_5)

class AnthropicTracker(AIProviderTracker):
    """Anthropic-specific performance tracking"""
    
    def __init__(self):
        super().__init__(AIProvider.ANTHROPIC)
    
    def track_message(self, model: str = "claude-opus-4-1-20250805"):
        """Decorator for Anthropic message tracking"""
        model_type = self._get_model_type(model)
        
        def decorator(func):
            @functools.wraps(func)
            async def wrapper(*args, **kwargs):
                session_id = kwargs.pop('session_id', '')
                user_id = kwargs.pop('user_id', '')
                context_data = kwargs.pop('context_data', {})
                
                return await self.track_request(
                    model=model_type,
                    request_func=func,
                    *args,
                    session_id=session_id,
                    user_id=user_id,
                    context_data=context_data,
                    **kwargs
                )
            return wrapper
        return decorator
    
    def _get_model_type(self, model_name: str) -> ModelType:
        """Map Anthropic model name to ModelType"""
        return ModelType.CLAUDE_OPUS_4_1

class GeminiTracker(AIProviderTracker):
    """Google Gemini-specific performance tracking"""
    
    def __init__(self):
        super().__init__(AIProvider.GOOGLE)
    
    def track_generation(self, model: str = "gemini-2.0-flash-exp"):
        """Decorator for Gemini generation tracking"""
        model_type = self._get_model_type(model)
        
        def decorator(func):
            @functools.wraps(func)
            async def wrapper(*args, **kwargs):
                session_id = kwargs.pop('session_id', '')
                user_id = kwargs.pop('user_id', '')
                context_data = kwargs.pop('context_data', {})
                
                return await self.track_request(
                    model=model_type,
                    request_func=func,
                    *args,
                    session_id=session_id,
                    user_id=user_id,
                    context_data=context_data,
                    **kwargs
                )
            return wrapper
        return decorator
    
    def _get_model_type(self, model_name: str) -> ModelType:
        """Map Gemini model name to ModelType"""
        return ModelType.GEMINI_2_0_FLASH

class AIPerformanceMiddleware:
    """Central middleware for AI performance tracking"""
    
    def __init__(self):
        self.openai_tracker = OpenAITracker()
        self.anthropic_tracker = AnthropicTracker()
        self.gemini_tracker = GeminiTracker()
        
        # A/B testing configuration
        self.ab_tests = {}
        self.model_routing = {}
    
    def track_openai(self, model: str = "gpt-5"):
        """Track OpenAI requests"""
        return self.openai_tracker.track_completion(model)
    
    def track_anthropic(self, model: str = "claude-opus-4-1-20250805"):
        """Track Anthropic requests"""
        return self.anthropic_tracker.track_message(model)
    
    def track_gemini(self, model: str = "gemini-2.0-flash-exp"):
        """Track Gemini requests"""
        return self.gemini_tracker.track_generation(model)
    
    def track_ai_request(self, provider: str, model: str):
        """Generic AI request tracker"""
        if provider.lower() == "openai":
            return self.track_openai(model)
        elif provider.lower() == "anthropic":
            return self.track_anthropic(model)
        elif provider.lower() == "google":
            return self.track_gemini(model)
        else:
            raise ValueError(f"Unsupported provider: {provider}")
    
    async def select_optimal_model(self, 
                                  task_type: str = "general",
                                  priority: str = "balanced") -> Tuple[str, str]:
        """Select optimal model based on current performance metrics"""
        
        # Get recent performance snapshots
        models_to_evaluate = [
            (AIProvider.OPENAI, ModelType.GPT_5),
            (AIProvider.OPENAI, ModelType.GPT_5_MINI),
            (AIProvider.ANTHROPIC, ModelType.CLAUDE_OPUS_4_1),
            (AIProvider.GOOGLE, ModelType.GEMINI_2_0_FLASH)
        ]
        
        best_model = None
        best_score = -1
        
        for provider, model in models_to_evaluate:
            try:
                snapshot = await ai_performance_monitor.get_model_performance_snapshot(
                    model, provider, time_window_hours=1
                )
                
                # Calculate priority-weighted score
                if priority == "speed":
                    score = self._calculate_speed_score(snapshot)
                elif priority == "quality":
                    score = self._calculate_quality_score(snapshot)
                elif priority == "cost":
                    score = self._calculate_cost_score(snapshot)
                else:  # balanced
                    score = snapshot.overall_score
                
                if score > best_score:
                    best_score = score
                    best_model = (provider.value, model.value)
                    
            except Exception as e:
                logger.warning(f"Failed to get snapshot for {provider.value}/{model.value}: {e}")
        
        # Default fallback
        if best_model is None:
            best_model = ("openai", "gpt-5")
        
        return best_model
    
    def _calculate_speed_score(self, snapshot) -> float:
        """Calculate speed-optimized score"""
        response_time_score = max(0, 100 - (snapshot.avg_response_time * 20))
        success_rate_score = snapshot.success_rate * 100
        return (response_time_score * 0.7) + (success_rate_score * 0.3)
    
    def _calculate_quality_score(self, snapshot) -> float:
        """Calculate quality-optimized score"""
        confidence_score = snapshot.avg_confidence * 100
        success_rate_score = snapshot.success_rate * 100
        return (confidence_score * 0.6) + (success_rate_score * 0.4)
    
    def _calculate_cost_score(self, snapshot) -> float:
        """Calculate cost-optimized score"""
        # Inverse cost score (lower cost = higher score)
        cost_score = max(0, 100 - (snapshot.cost_per_token * 1000))
        success_rate_score = snapshot.success_rate * 100
        return (cost_score * 0.6) + (success_rate_score * 0.4)
    
    async def route_request_with_ab_test(self, 
                                        test_id: str,
                                        user_id: str = "") -> Tuple[str, str]:
        """Route request based on A/B test configuration"""
        
        if test_id not in self.ab_tests:
            return await self.select_optimal_model()
        
        test_config = self.ab_tests[test_id]
        
        # Simple hash-based routing for consistent user experience
        if user_id:
            hash_value = hash(user_id) % 100
            if hash_value < (test_config.traffic_split * 100):
                provider_model = (test_config.model_a.value, test_config.model_a.value)
            else:
                provider_model = (test_config.model_b.value, test_config.model_b.value)
        else:
            # Random routing if no user ID
            import random
            if random.random() < test_config.traffic_split:
                provider_model = (test_config.model_a.value, test_config.model_a.value)
            else:
                provider_model = (test_config.model_b.value, test_config.model_b.value)
        
        return provider_model

# Global middleware instance
ai_performance_middleware = AIPerformanceMiddleware()

# Convenience decorators
track_openai = ai_performance_middleware.track_openai
track_anthropic = ai_performance_middleware.track_anthropic
track_gemini = ai_performance_middleware.track_gemini