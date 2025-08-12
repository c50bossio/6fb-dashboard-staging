#!/usr/bin/env python3
"""
Crisis and Edge Case Scenario Evaluation System
Tests AI agents' ability to handle extreme situations and emergencies
"""

import json
import asyncio
import time
from datetime import datetime
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
import statistics

from evaluation_config import get_config, get_ai_client, get_supabase_client
from metrics_collector import MetricsCollector

@dataclass
class CrisisEvaluation:
    """Structure for crisis scenario evaluation results"""
    scenario_id: str
    scenario_type: str
    response_time_ms: float
    solution_quality: float  # 0-100
    practicality_score: float  # 0-100
    customer_focus_score: float  # 0-100
    speed_score: float  # 0-100
    completeness_score: float  # 0-100
    financial_wisdom_score: float  # 0-100
    passed: bool
    ai_response_summary: str
    model_used: str
    hallucination_score: float
    actionability_score: float


class CrisisScenarioEvaluator:
    """Evaluates AI performance in crisis and edge case scenarios"""
    
    def __init__(self):
        self.load_scenarios()
        self.config = get_config()
        self.metrics_collector = MetricsCollector()
        self.performance_thresholds = {
            "response_time": 5000,  # 5 seconds for crisis
            "solution_quality": 80,
            "practicality": 85,
            "customer_focus": 90,
            "speed": 95,
            "completeness": 80
        }
        
    def load_scenarios(self):
        """Load edge case and crisis scenarios"""
        with open('edge_case_scenarios.json', 'r') as f:
            self.scenarios_data = json.load(f)['edge_case_scenarios']
            
    async def evaluate_crisis_response(self, scenario: Dict) -> CrisisEvaluation:
        """Evaluate AI response to a crisis scenario"""
        start_time = time.time()
        
        ai_client = await get_ai_client()
        
        # Determine appropriate agent based on crisis type
        agent_type = self._select_agent_for_crisis(scenario['type'])
        
        # Build comprehensive prompt
        prompt = f"""
        URGENT CRISIS SITUATION requiring immediate response:
        
        Scenario: {scenario['scenario']}
        Type: {scenario['type']}
        
        Current Situation:
        {json.dumps(scenario['input_data'], indent=2)}
        
        You must provide:
        1. IMMEDIATE actions (within 1 hour)
        2. Short-term solutions (next 24-48 hours)
        3. Long-term prevention measures
        4. Customer communication strategy
        5. Financial impact assessment
        6. Staff management approach
        
        Be specific, practical, and prioritize customer retention and safety.
        Time is critical - provide actionable steps that can be implemented NOW.
        """
        
        # Query AI with crisis scenario
        ai_response = await ai_client.query_ai_agent(agent_type, prompt, {
            "crisis_level": "HIGH",
            "scenario_data": scenario['input_data']
        })
        
        response_text = ai_response.get("response", "")
        response_time = (time.time() - start_time) * 1000
        
        # Evaluate response quality
        scores = self._evaluate_crisis_solution(
            response_text,
            scenario['expected_response'],
            scenario['type']
        )
        
        # Calculate advanced metrics
        hallucination_score = self.metrics_collector.detect_hallucination(
            response_text,
            ground_truth=scenario.get('expected_response', {}),
            context=scenario['input_data']
        )
        
        actionability_score = self.metrics_collector.calculate_actionability_score(response_text)
        
        # Determine if response passes criteria
        passed = self._check_crisis_pass_criteria(scores, response_time)
        
        await ai_client.close()
        
        return CrisisEvaluation(
            scenario_id=scenario['id'],
            scenario_type=scenario['type'],
            response_time_ms=response_time,
            solution_quality=scores['solution_quality'],
            practicality_score=scores['practicality'],
            customer_focus_score=scores['customer_focus'],
            speed_score=scores['speed'],
            completeness_score=scores['completeness'],
            financial_wisdom_score=scores['financial_wisdom'],
            passed=passed,
            ai_response_summary=response_text[:500],
            model_used=ai_response.get("model", "unknown"),
            hallucination_score=hallucination_score,
            actionability_score=actionability_score
        )
    
    def _select_agent_for_crisis(self, crisis_type: str) -> str:
        """Select the most appropriate AI agent for the crisis type"""
        agent_mapping = {
            "staff_emergency": "operations",
            "infrastructure_failure": "operations",
            "reputation_crisis": "marketing",
            "demand_spike": "operations",
            "staff_shortage": "operations",
            "weather_emergency": "master_coach",
            "aggressive_competition": "marketing",
            "compliance_crisis": "operations",
            "data_loss": "operations",
            "cost_crisis": "financial",
            "enterprise_crisis": "strategic",
            "seasonal_crisis": "financial"
        }
        return agent_mapping.get(crisis_type, "master_coach")
    
    def _evaluate_crisis_solution(self, 
                                 response: str,
                                 expected: Dict,
                                 crisis_type: str) -> Dict[str, float]:
        """Evaluate the quality of crisis solution"""
        scores = {
            "solution_quality": 0,
            "practicality": 0,
            "customer_focus": 0,
            "speed": 0,
            "completeness": 0,
            "financial_wisdom": 0
        }
        
        response_lower = response.lower()
        
        # Check for immediate actions
        immediate_keywords = ["immediate", "now", "urgent", "within hour", "asap", "right away"]
        immediate_count = sum(1 for keyword in immediate_keywords if keyword in response_lower)
        scores['speed'] = min(100, immediate_count * 20)
        
        # Check for customer focus
        customer_keywords = ["customer", "client", "apologize", "compensate", "retain", "satisfaction"]
        customer_count = sum(1 for keyword in customer_keywords if keyword in response_lower)
        scores['customer_focus'] = min(100, customer_count * 15)
        
        # Check for practical solutions
        action_verbs = ["contact", "call", "email", "offer", "provide", "implement", "hire", "extend", "reduce"]
        action_count = sum(1 for verb in action_verbs if verb in response_lower)
        scores['practicality'] = min(100, action_count * 12)
        
        # Check for financial consideration
        financial_keywords = ["cost", "revenue", "profit", "discount", "price", "budget", "expense"]
        financial_count = sum(1 for keyword in financial_keywords if keyword in response_lower)
        scores['financial_wisdom'] = min(100, financial_count * 15)
        
        # Check completeness (covers immediate, short-term, long-term)
        if "immediate" in response_lower and "long-term" in response_lower:
            scores['completeness'] = 85
        elif "immediate" in response_lower or "long-term" in response_lower:
            scores['completeness'] = 60
        else:
            scores['completeness'] = 40
            
        # Add points for addressing expected solutions
        if expected:
            for key, value in expected.items():
                if isinstance(value, list):
                    for item in value:
                        if str(item).lower() in response_lower:
                            scores['completeness'] += 5
                elif str(value).lower() in response_lower:
                    scores['completeness'] += 10
        
        scores['completeness'] = min(100, scores['completeness'])
        
        # Calculate overall solution quality
        scores['solution_quality'] = statistics.mean([
            scores['practicality'],
            scores['customer_focus'],
            scores['speed'],
            scores['completeness'],
            scores['financial_wisdom']
        ])
        
        return scores
    
    def _check_crisis_pass_criteria(self, scores: Dict[str, float], response_time: float) -> bool:
        """Check if crisis response meets pass criteria"""
        return (
            response_time <= self.performance_thresholds['response_time'] and
            scores['solution_quality'] >= self.performance_thresholds['solution_quality'] and
            scores['practicality'] >= self.performance_thresholds['practicality'] and
            scores['customer_focus'] >= self.performance_thresholds['customer_focus'] and
            scores['speed'] >= self.performance_thresholds['speed']
        )
    
    async def run_crisis_evaluations(self) -> Dict:
        """Run all crisis and edge case evaluations"""
        print("🚨 Starting Crisis & Edge Case Evaluations")
        print("=" * 60)
        
        results = {
            "timestamp": datetime.now().isoformat(),
            "scenarios_by_type": {},
            "overall_metrics": {},
            "critical_failures": [],
            "best_responses": []
        }
        
        all_evaluations = []
        
        # Test each category of crisis
        for category, scenarios in self.scenarios_data['categories'].items():
            print(f"\n📋 Testing {category.replace('_', ' ').title()}...")
            category_results = []
            
            for scenario in scenarios[:2]:  # Limit to 2 per category for testing
                try:
                    eval_result = await self.evaluate_crisis_response(scenario)
                    category_results.append(asdict(eval_result))
                    all_evaluations.append(eval_result)
                    
                    status = "✅ PASS" if eval_result.passed else "❌ FAIL"
                    print(f"  {status} - {scenario['id']}: {scenario['scenario'][:50]}...")
                    print(f"    Quality: {eval_result.solution_quality:.1f}%, Time: {eval_result.response_time_ms:.0f}ms")
                    print(f"    Speed: {eval_result.speed_score:.1f}%, Customer Focus: {eval_result.customer_focus_score:.1f}%")
                    
                    # Track critical failures
                    if not eval_result.passed and eval_result.speed_score < 50:
                        results['critical_failures'].append({
                            "scenario_id": eval_result.scenario_id,
                            "type": eval_result.scenario_type,
                            "reason": "Insufficient urgency in crisis response"
                        })
                    
                    # Track best responses
                    if eval_result.solution_quality > 90:
                        results['best_responses'].append({
                            "scenario_id": eval_result.scenario_id,
                            "quality": eval_result.solution_quality,
                            "excerpt": eval_result.ai_response_summary[:200]
                        })
                        
                except Exception as e:
                    print(f"  ❌ Error evaluating {scenario['id']}: {str(e)}")
                    
            results['scenarios_by_type'][category] = category_results
        
        # Calculate overall metrics
        if all_evaluations:
            results['overall_metrics'] = {
                "total_scenarios_tested": len(all_evaluations),
                "pass_rate": sum(1 for e in all_evaluations if e.passed) / len(all_evaluations) * 100,
                "average_response_time_ms": statistics.mean([e.response_time_ms for e in all_evaluations]),
                "average_solution_quality": statistics.mean([e.solution_quality for e in all_evaluations]),
                "average_customer_focus": statistics.mean([e.customer_focus_score for e in all_evaluations]),
                "average_speed_score": statistics.mean([e.speed_score for e in all_evaluations]),
                "average_hallucination": statistics.mean([e.hallucination_score for e in all_evaluations]),
                "critical_failure_count": len(results['critical_failures']),
                "excellent_response_count": len(results['best_responses'])
            }
        
        # Print summary
        print("\n" + "=" * 60)
        print("🚨 CRISIS EVALUATION SUMMARY")
        print("=" * 60)
        print(f"Scenarios Tested: {results['overall_metrics'].get('total_scenarios_tested', 0)}")
        print(f"Pass Rate: {results['overall_metrics'].get('pass_rate', 0):.1f}%")
        print(f"Avg Response Time: {results['overall_metrics'].get('average_response_time_ms', 0):.0f}ms")
        print(f"Avg Solution Quality: {results['overall_metrics'].get('average_solution_quality', 0):.1f}%")
        print(f"Avg Customer Focus: {results['overall_metrics'].get('average_customer_focus', 0):.1f}%")
        print(f"Critical Failures: {results['overall_metrics'].get('critical_failure_count', 0)}")
        
        if results['critical_failures']:
            print("\n⚠️ CRITICAL FAILURES REQUIRING ATTENTION:")
            for failure in results['critical_failures'][:3]:
                print(f"  - {failure['scenario_id']}: {failure['reason']}")
        
        # Save results
        with open('crisis_evaluation_results.json', 'w') as f:
            json.dump(results, f, indent=2)
        print(f"\n💾 Results saved to crisis_evaluation_results.json")
        
        return results


async def run_evaluation():
    """Main entry point for crisis scenario evaluation"""
    evaluator = CrisisScenarioEvaluator()
    await evaluator.run_crisis_evaluations()

if __name__ == "__main__":
    asyncio.run(run_evaluation())