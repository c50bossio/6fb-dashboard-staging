#!/usr/bin/env python3
"""
Multi-Model Integration Tests
============================

Comprehensive integration tests for AI model performance comparison focusing on:
- Model selection accuracy across different task types
- Performance consistency between models
- Model fallback mechanisms
- Cost optimization validation
- Response quality comparison
- Cross-model conversation continuity
"""

import pytest
import json
import asyncio
import time
import statistics
from typing import Dict, List, Any, Optional, Tuple
from unittest.mock import Mock, patch, AsyncMock
from dataclasses import dataclass
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.append(str(project_root))

@dataclass
class ModelPerformanceResult:
    """Model performance test result"""
    model_id: str
    task_type: str
    response_time: float
    response_quality: float
    cost: float
    success: bool
    error_message: Optional[str] = None

@dataclass
class ModelComparisonResult:
    """Comparison result between models"""
    task_description: str
    model_results: List[ModelPerformanceResult]
    best_model: str
    performance_ranking: List[str]
    cost_ranking: List[str]
    recommendation: str

class AIModelRouter:
    """Mock AI model router for testing"""
    
    def __init__(self):
        self.models = {
            'gpt-5': {
                'name': 'GPT-5',
                'cost_per_token': 0.00003,
                'avg_response_time': 1.2,
                'strengths': ['general_purpose', 'creative_writing', 'analysis'],
                'max_tokens': 4096,
                'availability': 0.99
            },
            'gpt-5-mini': {
                'name': 'GPT-5 Mini',
                'cost_per_token': 0.000015,
                'avg_response_time': 0.8,
                'strengths': ['simple_queries', 'classification', 'summarization'],
                'max_tokens': 2048,
                'availability': 0.995
            },
            'claude-opus-4-1-20250805': {
                'name': 'Claude Opus 4.1',
                'cost_per_token': 0.000045,
                'avg_response_time': 1.8,
                'strengths': ['coding', 'complex_analysis', 'reasoning'],
                'max_tokens': 8192,
                'availability': 0.98
            },
            'gemini-2.0-flash-exp': {
                'name': 'Gemini 2.0 Flash',
                'cost_per_token': 0.00001,
                'avg_response_time': 0.6,
                'strengths': ['speed', 'cost_efficiency', 'simple_tasks'],
                'max_tokens': 2048,
                'availability': 0.97
            }
        }
        
        self.routing_rules = {
            'coding': 'claude-opus-4-1-20250805',
            'complex_analysis': 'claude-opus-4-1-20250805',
            'simple_query': 'gemini-2.0-flash-exp',
            'cost_sensitive': 'gemini-2.0-flash-exp',
            'general_purpose': 'gpt-5',
            'creative': 'gpt-5'
        }
    
    async def select_model(self, task_description: str, context: Dict[str, Any] = None) -> str:
        """Select optimal model for task"""
        task_lower = task_description.lower()
        context = context or {}
        
        # Check for explicit cost constraints
        if context.get('cost_priority') == 'low':
            return 'gemini-2.0-flash-exp'
        
        # Check for coding tasks
        if any(keyword in task_lower for keyword in ['code', 'script', 'python', 'function', 'programming']):
            return 'claude-opus-4-1-20250805'
        
        # Check for complex analysis
        if any(keyword in task_lower for keyword in ['analyze', 'complex', 'detailed', 'strategy', 'comprehensive']):
            if len(task_description) > 200:
                return 'claude-opus-4-1-20250805'
            else:
                return 'gpt-5'
        
        # Check for simple queries
        if any(keyword in task_lower for keyword in ['what time', 'when', 'where', 'simple', 'quick']):
            return 'gemini-2.0-flash-exp'
        
        # Default to balanced option
        return 'gpt-5'
    
    async def execute_with_model(self, model_id: str, task: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Execute task with specific model"""
        if model_id not in self.models:
            raise ValueError(f"Unknown model: {model_id}")
        
        model_config = self.models[model_id]
        
        # Simulate model execution
        start_time = time.time()
        
        # Simulate processing time based on model characteristics
        base_time = model_config['avg_response_time']
        complexity_factor = len(task) / 1000  # Longer tasks take more time
        processing_time = base_time * (1 + complexity_factor)
        
        await asyncio.sleep(min(processing_time, 3.0))  # Cap at 3 seconds for testing
        
        actual_time = time.time() - start_time
        
        # Simulate response quality based on task-model match
        response_quality = self._calculate_response_quality(model_id, task)
        
        # Calculate cost
        estimated_tokens = len(task.split()) * 2  # Rough estimate
        cost = estimated_tokens * model_config['cost_per_token']
        
        # Simulate occasional failures
        import random
        if random.random() > model_config['availability']:
            raise Exception(f"Model {model_id} temporarily unavailable")
        
        return {
            'model_id': model_id,
            'response': self._generate_mock_response(model_id, task),
            'response_time': actual_time,
            'response_quality': response_quality,
            'cost': cost,
            'tokens_used': estimated_tokens,
            'success': True
        }
    
    def _calculate_response_quality(self, model_id: str, task: str) -> float:
        """Calculate response quality score based on task-model match"""
        model_config = self.models[model_id]
        task_lower = task.lower()
        
        base_quality = 0.7  # Base quality for all models
        
        # Boost quality for matching strengths
        for strength in model_config['strengths']:
            if strength == 'coding' and any(kw in task_lower for kw in ['code', 'script', 'python']):
                base_quality += 0.2
            elif strength == 'complex_analysis' and any(kw in task_lower for kw in ['analyze', 'complex', 'strategy']):
                base_quality += 0.15
            elif strength == 'simple_queries' and len(task.split()) < 10:
                base_quality += 0.1
            elif strength == 'general_purpose':
                base_quality += 0.05
        
        # Penalize mismatched tasks
        if model_id == 'gemini-2.0-flash-exp' and len(task) > 500:
            base_quality -= 0.15  # Not ideal for complex tasks
        elif model_id == 'claude-opus-4-1-20250805' and len(task.split()) < 5:
            base_quality -= 0.05  # Overkill for simple tasks
        
        return min(max(base_quality, 0.3), 1.0)
    
    def _generate_mock_response(self, model_id: str, task: str) -> str:
        """Generate mock response based on model characteristics"""
        if 'claude' in model_id.lower():
            return f"Claude response: Detailed analysis of '{task[:50]}...' with comprehensive reasoning and code examples."
        elif 'gpt' in model_id.lower():
            return f"GPT response: Balanced analysis of '{task[:50]}...' with creative insights and practical recommendations."
        elif 'gemini' in model_id.lower():
            return f"Gemini response: Quick and efficient answer to '{task[:50]}...' optimized for speed and cost."
        else:
            return f"Response to '{task[:50]}...' from {model_id}"

class ModelPerformanceTestSuite:
    """Test suite for model performance comparison"""
    
    def __init__(self):
        self.router = AIModelRouter()
        self.test_results: List[ModelComparisonResult] = []
    
    async def run_model_comparison(self, task: str, models: List[str], context: Dict[str, Any] = None) -> ModelComparisonResult:
        """Run performance comparison across multiple models"""
        results = []
        
        for model_id in models:
            try:
                result = await self.router.execute_with_model(model_id, task, context)
                
                performance_result = ModelPerformanceResult(
                    model_id=model_id,
                    task_type=self._categorize_task(task),
                    response_time=result['response_time'],
                    response_quality=result['response_quality'],
                    cost=result['cost'],
                    success=result['success']
                )
                
                results.append(performance_result)
                
            except Exception as e:
                performance_result = ModelPerformanceResult(
                    model_id=model_id,
                    task_type=self._categorize_task(task),
                    response_time=0.0,
                    response_quality=0.0,
                    cost=0.0,
                    success=False,
                    error_message=str(e)
                )
                results.append(performance_result)
        
        # Analyze results
        successful_results = [r for r in results if r.success]
        
        if not successful_results:
            best_model = models[0]
            recommendation = "All models failed - investigate system issues"
        else:
            # Rank by combined score (quality * 0.6 + speed_score * 0.2 + cost_score * 0.2)
            def calculate_score(result):
                speed_score = 1.0 / (result.response_time + 0.1)  # Faster is better
                cost_score = 1.0 / (result.cost + 0.001)  # Cheaper is better
                return result.response_quality * 0.6 + (speed_score * 0.2) + (cost_score * 0.2)
            
            ranked_results = sorted(successful_results, key=calculate_score, reverse=True)
            best_model = ranked_results[0].model_id
            
            performance_ranking = [r.model_id for r in ranked_results]
            cost_ranking = sorted(successful_results, key=lambda x: x.cost)
            cost_ranking = [r.model_id for r in cost_ranking]
            
            recommendation = self._generate_recommendation(ranked_results[0], task)
        
        comparison_result = ModelComparisonResult(
            task_description=task,
            model_results=results,
            best_model=best_model,
            performance_ranking=performance_ranking if successful_results else [],
            cost_ranking=cost_ranking if successful_results else [],
            recommendation=recommendation
        )
        
        self.test_results.append(comparison_result)
        return comparison_result
    
    def _categorize_task(self, task: str) -> str:
        """Categorize task type"""
        task_lower = task.lower()
        
        if any(kw in task_lower for kw in ['code', 'script', 'python', 'function']):
            return 'coding'
        elif any(kw in task_lower for kw in ['analyze', 'complex', 'strategy', 'detailed']):
            return 'complex_analysis'
        elif len(task.split()) < 10:
            return 'simple_query'
        else:
            return 'general_purpose'
    
    def _generate_recommendation(self, best_result: ModelPerformanceResult, task: str) -> str:
        """Generate recommendation based on best result"""
        if best_result.response_quality > 0.9:
            return f"{best_result.model_id} is optimal for this task type with excellent quality"
        elif best_result.cost < 0.001:
            return f"{best_result.model_id} provides best cost-efficiency for this task"
        elif best_result.response_time < 1.0:
            return f"{best_result.model_id} offers fastest response for time-sensitive tasks"
        else:
            return f"{best_result.model_id} provides best overall balance for this task"

class TestModelIntegration:
    """Integration tests for multi-model performance"""
    
    @pytest.fixture
    def performance_suite(self):
        return ModelPerformanceTestSuite()
    
    @pytest.fixture
    def test_models(self):
        return ['gpt-5', 'gpt-5-mini', 'claude-opus-4-1-20250805', 'gemini-2.0-flash-exp']
    
    @pytest.mark.asyncio
    async def test_coding_task_model_selection(self, performance_suite, test_models):
        """Test model selection and performance for coding tasks"""
        coding_task = "Create a Python script to analyze booking patterns and predict busy periods for a barbershop"
        
        result = await performance_suite.run_model_comparison(coding_task, test_models)
        
        # Claude should be best for coding tasks
        assert result.best_model == 'claude-opus-4-1-20250805'
        
        # Verify Claude has highest quality for coding
        claude_result = next(r for r in result.model_results if r.model_id == 'claude-opus-4-1-20250805')
        assert claude_result.response_quality > 0.8
        
        # Verify all models completed successfully
        successful_models = [r for r in result.model_results if r.success]
        assert len(successful_models) >= 3  # At least 3 models should succeed
    
    @pytest.mark.asyncio
    async def test_simple_query_model_selection(self, performance_suite, test_models):
        """Test model selection for simple queries"""
        simple_task = "What time should I open on weekdays?"
        
        result = await performance_suite.run_model_comparison(simple_task, test_models)
        
        # Gemini should be best for simple queries (cost-effective)
        assert result.best_model == 'gemini-2.0-flash-exp'
        
        # Verify Gemini has good speed and cost efficiency
        gemini_result = next(r for r in result.model_results if r.model_id == 'gemini-2.0-flash-exp')
        assert gemini_result.response_time < 1.5
        assert gemini_result.cost < 0.01
    
    @pytest.mark.asyncio
    async def test_complex_analysis_model_selection(self, performance_suite, test_models):
        """Test model selection for complex analysis tasks"""
        complex_task = """Analyze the comprehensive business strategy for a barbershop facing increased competition. 
        Consider market positioning, pricing strategy, customer retention, operational efficiency, 
        marketing campaigns, and long-term growth opportunities. Provide detailed recommendations 
        with implementation timelines and success metrics."""
        
        result = await performance_suite.run_model_comparison(complex_task, test_models)
        
        # Either Claude or GPT-5 should be best for complex analysis
        assert result.best_model in ['claude-opus-4-1-20250805', 'gpt-5']
        
        # Verify best model has high quality
        best_result = next(r for r in result.model_results if r.model_id == result.best_model)
        assert best_result.response_quality > 0.8
        
        # Gemini should not be the best choice (not optimized for complex tasks)
        assert result.best_model != 'gemini-2.0-flash-exp'
    
    @pytest.mark.asyncio
    async def test_cost_sensitive_routing(self, performance_suite, test_models):
        """Test model routing with cost constraints"""
        task = "Provide marketing recommendations for customer acquisition"
        context = {'cost_priority': 'low'}
        
        result = await performance_suite.run_model_comparison(task, test_models, context)
        
        # Should prioritize cost-effective models
        cost_ranking = result.cost_ranking
        assert cost_ranking[0] in ['gemini-2.0-flash-exp', 'gpt-5-mini']  # Cheapest models first
        
        # Verify cost differences
        cheapest_result = next(r for r in result.model_results if r.model_id == cost_ranking[0])
        most_expensive_result = next(r for r in result.model_results if r.model_id == cost_ranking[-1])
        assert cheapest_result.cost < most_expensive_result.cost
    
    @pytest.mark.asyncio
    async def test_model_performance_consistency(self, performance_suite):
        """Test consistency of model performance across similar tasks"""
        similar_tasks = [
            "How can I improve customer retention in my barbershop?",
            "What are effective customer retention strategies for barbershops?",
            "Suggest ways to keep customers coming back to my barbershop"
        ]
        
        gpt5_results = []
        
        for task in similar_tasks:
            result = await performance_suite.run_model_comparison(task, ['gpt-5'])
            gpt5_result = result.model_results[0]
            gpt5_results.append(gpt5_result)
        
        # Verify consistency in response times
        response_times = [r.response_time for r in gpt5_results if r.success]
        if len(response_times) > 1:
            time_variance = statistics.variance(response_times)
            assert time_variance < 1.0  # Should be consistent
        
        # Verify consistency in quality
        quality_scores = [r.response_quality for r in gpt5_results if r.success]
        if len(quality_scores) > 1:
            quality_variance = statistics.variance(quality_scores)
            assert quality_variance < 0.1  # Quality should be consistent
    
    @pytest.mark.asyncio
    async def test_model_fallback_mechanism(self, performance_suite):
        """Test fallback when preferred model fails"""
        task = "Create a comprehensive business analysis"
        
        # Mock Claude failure
        with patch.object(performance_suite.router, 'execute_with_model') as mock_execute:
            async def mock_execution(model_id, task, context=None):
                if model_id == 'claude-opus-4-1-20250805':
                    raise Exception("Model unavailable")
                else:
                    return await performance_suite.router.execute_with_model.__wrapped__(
                        performance_suite.router, model_id, task, context
                    )
            
            mock_execute.side_effect = mock_execution
            
            result = await performance_suite.run_model_comparison(
                task, ['claude-opus-4-1-20250805', 'gpt-5', 'gemini-2.0-flash-exp']
            )
            
            # Should fallback to working model
            assert result.best_model != 'claude-opus-4-1-20250805'
            
            # Claude should show failure
            claude_result = next(r for r in result.model_results if r.model_id == 'claude-opus-4-1-20250805')
            assert not claude_result.success
            assert claude_result.error_message is not None
    
    @pytest.mark.asyncio
    async def test_response_time_requirements(self, performance_suite, test_models):
        """Test that all models meet response time requirements"""
        urgent_task = "Emergency: Need immediate pricing recommendation"
        
        result = await performance_suite.run_model_comparison(urgent_task, test_models)
        
        # All successful models should respond within reasonable time
        for model_result in result.model_results:
            if model_result.success:
                assert model_result.response_time < 5.0  # Max 5 seconds for any model
        
        # Fast models should be significantly faster
        fast_models = ['gemini-2.0-flash-exp', 'gpt-5-mini']
        for model_id in fast_models:
            model_result = next((r for r in result.model_results if r.model_id == model_id), None)
            if model_result and model_result.success:
                assert model_result.response_time < 2.0  # Fast models under 2 seconds
    
    @pytest.mark.asyncio
    async def test_quality_vs_cost_tradeoff(self, performance_suite, test_models):
        """Test quality vs cost tradeoff analysis"""
        balanced_task = "Analyze customer satisfaction trends and recommend improvements"
        
        result = await performance_suite.run_model_comparison(balanced_task, test_models)
        
        # Calculate quality per dollar for each model
        quality_per_cost = {}
        for model_result in result.model_results:
            if model_result.success and model_result.cost > 0:
                quality_per_cost[model_result.model_id] = model_result.response_quality / model_result.cost
        
        # Verify that different models offer different value propositions
        assert len(quality_per_cost) >= 3
        
        # Most expensive model should have high quality
        most_expensive = max(result.model_results, key=lambda x: x.cost if x.success else 0)
        if most_expensive.success:
            assert most_expensive.response_quality > 0.7
        
        # Cheapest model should have reasonable quality
        cheapest = min((r for r in result.model_results if r.success), key=lambda x: x.cost)
        assert cheapest.response_quality > 0.5
    
    @pytest.mark.asyncio
    async def test_model_specialization_accuracy(self, performance_suite):
        """Test that models perform best on their specialized tasks"""
        
        # Test coding specialization
        coding_result = await performance_suite.run_model_comparison(
            "Write a Python function to calculate barber commission rates",
            ['claude-opus-4-1-20250805', 'gpt-5', 'gemini-2.0-flash-exp']
        )
        
        # Claude should excel at coding
        claude_coding = next(r for r in coding_result.model_results if r.model_id == 'claude-opus-4-1-20250805')
        other_coding = [r for r in coding_result.model_results if r.model_id != 'claude-opus-4-1-20250805' and r.success]
        
        if claude_coding.success and other_coding:
            avg_other_quality = statistics.mean([r.response_quality for r in other_coding])
            assert claude_coding.response_quality >= avg_other_quality
        
        # Test cost-efficiency specialization
        simple_result = await performance_suite.run_model_comparison(
            "What are your business hours?",
            ['gemini-2.0-flash-exp', 'gpt-5', 'claude-opus-4-1-20250805']
        )
        
        # Gemini should be most cost-efficient
        gemini_simple = next(r for r in simple_result.model_results if r.model_id == 'gemini-2.0-flash-exp')
        other_simple = [r for r in simple_result.model_results if r.model_id != 'gemini-2.0-flash-exp' and r.success]
        
        if gemini_simple.success and other_simple:
            avg_other_cost = statistics.mean([r.cost for r in other_simple])
            assert gemini_simple.cost <= avg_other_cost
    
    @pytest.mark.asyncio
    async def test_conversation_continuity_across_models(self, performance_suite):
        """Test conversation continuity when switching between models"""
        
        # First query with one model
        initial_task = "Help me analyze my barbershop's revenue trends"
        initial_result = await performance_suite.run_model_comparison(initial_task, ['gpt-5'])
        
        # Follow-up query that might use different model
        followup_task = "Based on that analysis, create a detailed financial optimization plan"
        followup_context = {
            'previous_conversation': initial_result.model_results[0].model_id,
            'context': 'revenue_analysis_discussion'
        }
        
        followup_result = await performance_suite.run_model_comparison(
            followup_task, ['claude-opus-4-1-20250805', 'gpt-5'], followup_context
        )
        
        # Should successfully handle context switching
        assert followup_result.best_model in ['claude-opus-4-1-20250805', 'gpt-5']
        
        best_followup = next(r for r in followup_result.model_results if r.model_id == followup_result.best_model)
        assert best_followup.success
        assert best_followup.response_quality > 0.6

class TestModelRoutingAccuracy:
    """Test routing accuracy based on evaluation dataset"""
    
    @pytest.fixture
    def router(self):
        return AIModelRouter()
    
    @pytest.mark.asyncio
    async def test_routing_for_coding_tasks(self, router):
        """Test routing accuracy for coding tasks"""
        coding_tasks = [
            "Create a Python script to analyze booking patterns",
            "Write a function to calculate commission rates",
            "Develop an algorithm for appointment scheduling"
        ]
        
        for task in coding_tasks:
            selected_model = await router.select_model(task)
            assert selected_model == 'claude-opus-4-1-20250805', f"Failed for task: {task}"
    
    @pytest.mark.asyncio
    async def test_routing_for_simple_queries(self, router):
        """Test routing accuracy for simple queries"""
        simple_tasks = [
            "What time should I open on weekdays?",
            "When is the best time to schedule appointments?",
            "What are your business hours?"
        ]
        
        for task in simple_tasks:
            selected_model = await router.select_model(task)
            assert selected_model == 'gemini-2.0-flash-exp', f"Failed for task: {task}"
    
    @pytest.mark.asyncio
    async def test_routing_for_complex_analysis(self, router):
        """Test routing for complex analysis tasks"""
        complex_tasks = [
            "Analyze the comprehensive business strategy for competitive positioning in the local market",
            "Provide detailed analysis of customer retention patterns with strategic recommendations",
            "Examine operational efficiency across multiple business dimensions"
        ]
        
        for task in complex_tasks:
            selected_model = await router.select_model(task)
            assert selected_model in ['claude-opus-4-1-20250805', 'gpt-5'], f"Failed for task: {task}"
    
    @pytest.mark.asyncio
    async def test_cost_constrained_routing(self, router):
        """Test routing with cost constraints"""
        task = "Provide marketing recommendations for customer acquisition"
        
        # Without cost constraint
        normal_model = await router.select_model(task)
        
        # With cost constraint
        cost_constrained_model = await router.select_model(task, {'cost_priority': 'low'})
        
        assert cost_constrained_model == 'gemini-2.0-flash-exp'
        # Cost-constrained should be different from normal routing (unless already cheapest)
        if normal_model != 'gemini-2.0-flash-exp':
            assert cost_constrained_model != normal_model
    
    @pytest.mark.asyncio
    async def test_routing_consistency(self, router):
        """Test routing consistency for similar tasks"""
        similar_tasks = [
            "How can I improve customer retention?",
            "What strategies help retain customers?",
            "Suggest customer retention methods"
        ]
        
        selected_models = []
        for task in similar_tasks:
            model = await router.select_model(task)
            selected_models.append(model)
        
        # Should route similar tasks to the same model
        assert len(set(selected_models)) <= 2, "Too much variation in routing for similar tasks"

class TestModelPerformanceBenchmarks:
    """Performance benchmark tests for model comparison"""
    
    @pytest.fixture
    def performance_suite(self):
        return ModelPerformanceTestSuite()
    
    @pytest.mark.asyncio
    async def test_response_time_benchmarks(self, performance_suite):
        """Test that all models meet response time benchmarks"""
        test_tasks = [
            "Simple query: What are peak hours?",
            "Medium task: Analyze customer satisfaction trends",
            "Complex task: Develop comprehensive business strategy with market analysis"
        ]
        
        models = ['gpt-5', 'gpt-5-mini', 'claude-opus-4-1-20250805', 'gemini-2.0-flash-exp']
        
        for task in test_tasks:
            result = await performance_suite.run_model_comparison(task, models)
            
            # Check response time requirements by task complexity
            for model_result in result.model_results:
                if model_result.success:
                    if 'Simple' in task:
                        assert model_result.response_time < 2.0
                    elif 'Medium' in task:
                        assert model_result.response_time < 5.0
                    else:  # Complex
                        assert model_result.response_time < 10.0
    
    @pytest.mark.asyncio
    async def test_quality_benchmarks(self, performance_suite):
        """Test that models meet quality benchmarks for appropriate tasks"""
        models = ['gpt-5', 'claude-opus-4-1-20250805', 'gemini-2.0-flash-exp']
        
        # Test coding quality
        coding_result = await performance_suite.run_model_comparison(
            "Create a Python function to optimize barbershop scheduling",
            models
        )
        
        claude_result = next(r for r in coding_result.model_results if r.model_id == 'claude-opus-4-1-20250805')
        if claude_result.success:
            assert claude_result.response_quality >= 0.85  # High quality for coding
        
        # Test general purpose quality
        general_result = await performance_suite.run_model_comparison(
            "Provide business recommendations for improving customer experience",
            models
        )
        
        for model_result in general_result.model_results:
            if model_result.success:
                assert model_result.response_quality >= 0.65  # Minimum acceptable quality
    
    @pytest.mark.asyncio
    async def test_cost_efficiency_benchmarks(self, performance_suite):
        """Test cost efficiency benchmarks"""
        models = ['gpt-5', 'gpt-5-mini', 'gemini-2.0-flash-exp']
        
        simple_task = "What time should I close on Sundays?"
        result = await performance_suite.run_model_comparison(simple_task, models)
        
        # For simple tasks, cost should be minimal
        for model_result in result.model_results:
            if model_result.success:
                assert model_result.cost < 0.05  # Should cost less than 5 cents
        
        # Gemini should be most cost-efficient
        gemini_result = next(r for r in result.model_results if r.model_id == 'gemini-2.0-flash-exp')
        if gemini_result.success:
            other_costs = [r.cost for r in result.model_results if r.model_id != 'gemini-2.0-flash-exp' and r.success]
            if other_costs:
                assert gemini_result.cost <= min(other_costs)
    
    @pytest.mark.asyncio
    async def test_availability_benchmarks(self, performance_suite):
        """Test model availability meets requirements"""
        models = ['gpt-5', 'gpt-5-mini', 'claude-opus-4-1-20250805', 'gemini-2.0-flash-exp']
        
        # Run multiple tests to check availability
        task = "Provide a quick business tip"
        success_rates = {model: 0 for model in models}
        
        test_runs = 10
        for _ in range(test_runs):
            result = await performance_suite.run_model_comparison(task, models)
            
            for model_result in result.model_results:
                if model_result.success:
                    success_rates[model_result.model_id] += 1
        
        # Each model should have at least 90% success rate
        for model, successes in success_rates.items():
            success_rate = successes / test_runs
            assert success_rate >= 0.9, f"Model {model} has {success_rate:.1%} success rate, below 90% threshold"
    
    @pytest.mark.asyncio
    async def test_concurrent_model_performance(self, performance_suite):
        """Test model performance under concurrent load"""
        import asyncio
        
        models = ['gpt-5', 'gemini-2.0-flash-exp']
        task = "Analyze customer booking patterns"
        
        # Run multiple concurrent requests
        concurrent_tasks = []
        for i in range(5):
            concurrent_tasks.append(
                performance_suite.run_model_comparison(f"{task} (test {i})", models)
            )
        
        start_time = time.time()
        results = await asyncio.gather(*concurrent_tasks)
        total_time = time.time() - start_time
        
        # Should handle concurrent requests efficiently
        assert total_time < 15.0  # All 5 requests should complete in under 15 seconds
        
        # All requests should succeed
        for result in results:
            successful_models = [r for r in result.model_results if r.success]
            assert len(successful_models) >= 1  # At least one model should succeed per request

if __name__ == "__main__":
    # Run tests
    pytest.main([__file__, "-v"])