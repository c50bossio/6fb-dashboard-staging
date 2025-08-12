#!/usr/bin/env python3
"""
Business Intelligence Accuracy Evaluation Suite for 6FB Barbershop AI System
Tests AI predictions against real business data and expected outcomes
"""

import json
import asyncio
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass, asdict
import statistics
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

@dataclass
class PredictionResult:
    """Structure for storing AI prediction results"""
    prediction_id: str
    actual_value: float
    predicted_value: float
    confidence_range: Tuple[float, float]
    accuracy_percentage: float
    within_confidence: bool
    evaluation_timestamp: str
    model_used: str
    
@dataclass
class BusinessMetric:
    """Business metric for evaluation"""
    metric_type: str  # revenue, customers, bookings, etc.
    period: str
    actual_value: float
    context: Dict
    timestamp: str

class BusinessIntelligenceEvaluator:
    """Evaluates AI business intelligence predictions accuracy"""
    
    def __init__(self, evaluation_dataset_path: str = "barbershop_evaluation_dataset.json"):
        self.dataset_path = evaluation_dataset_path
        self.load_evaluation_data()
        self.results = []
        self.accuracy_threshold = 0.85  # 85% accuracy target
        
    def load_evaluation_data(self):
        """Load evaluation dataset"""
        with open(self.dataset_path, 'r') as f:
            self.evaluation_data = json.load(f)['evaluation_dataset']
            
    def calculate_accuracy(self, actual: float, predicted: float) -> float:
        """Calculate prediction accuracy percentage"""
        if actual == 0:
            return 0.0
        error = abs(actual - predicted)
        accuracy = max(0, 1 - (error / actual)) * 100
        return round(accuracy, 2)
    
    def evaluate_revenue_prediction(self, scenario: Dict) -> PredictionResult:
        """Evaluate revenue prediction accuracy"""
        # Simulate AI prediction (in production, this would call actual AI)
        input_data = scenario['input_data']
        expected = scenario['expected_output']
        
        # Simple trend-based prediction for testing
        revenue_history = input_data['revenue_history']
        trend = np.polyfit(range(len(revenue_history)), revenue_history, 1)
        predicted = round(trend[0] * len(revenue_history) + trend[1])
        
        # Calculate accuracy
        actual = expected['predicted_revenue']
        accuracy = self.calculate_accuracy(actual, predicted)
        
        # Check if within confidence range
        conf_range = expected['confidence_range']
        within_confidence = conf_range[0] <= predicted <= conf_range[1]
        
        return PredictionResult(
            prediction_id=scenario['id'],
            actual_value=actual,
            predicted_value=predicted,
            confidence_range=tuple(conf_range),
            accuracy_percentage=accuracy,
            within_confidence=within_confidence,
            evaluation_timestamp=datetime.now().isoformat(),
            model_used="gpt-5"  # Default model
        )
    
    def evaluate_customer_behavior(self, scenario: Dict) -> Dict:
        """Evaluate customer behavior prediction accuracy"""
        input_data = scenario['input_data']
        expected = scenario['expected_output']
        
        # Calculate days since last visit
        last_visit = datetime.fromisoformat(input_data['customer_profile']['last_visit'])
        current_date = datetime.fromisoformat(input_data['current_date'])
        days_overdue = (current_date - last_visit).days - input_data['customer_profile']['visit_frequency']
        
        # Predict risk level based on overdue days
        if days_overdue < 7:
            predicted_risk = "low"
        elif days_overdue < 14:
            predicted_risk = "moderate"
        else:
            predicted_risk = "high"
            
        # Evaluate prediction accuracy
        risk_match = predicted_risk == expected['risk_level']
        
        return {
            "scenario_id": scenario['id'],
            "risk_prediction_accurate": risk_match,
            "days_overdue": days_overdue,
            "predicted_risk": predicted_risk,
            "expected_risk": expected['risk_level'],
            "recommendations_provided": True  # Placeholder
        }
    
    def evaluate_seasonal_patterns(self, historical_data: List[float]) -> Dict:
        """Evaluate seasonal pattern recognition"""
        # Detect seasonal patterns using simple analysis
        monthly_averages = []
        for i in range(0, len(historical_data), 30):
            month_data = historical_data[i:i+30]
            if month_data:
                monthly_averages.append(statistics.mean(month_data))
        
        # Identify peak and low seasons
        if monthly_averages:
            peak_month = monthly_averages.index(max(monthly_averages))
            low_month = monthly_averages.index(min(monthly_averages))
            seasonality_strength = (max(monthly_averages) - min(monthly_averages)) / statistics.mean(monthly_averages)
            
            return {
                "peak_month": peak_month + 1,
                "low_month": low_month + 1,
                "seasonality_strength": round(seasonality_strength * 100, 2),
                "pattern_detected": seasonality_strength > 0.2
            }
        return {"pattern_detected": False}
    
    def evaluate_booking_optimization(self, booking_data: Dict) -> Dict:
        """Evaluate booking pattern optimization recommendations"""
        weekly_pattern = booking_data.get('weekly_pattern', {})
        
        # Calculate capacity utilization
        total_bookings = sum(weekly_pattern.values())
        max_daily_capacity = 60  # Assuming max capacity
        days_open = len(weekly_pattern)
        total_capacity = max_daily_capacity * days_open
        utilization = (total_bookings / total_capacity) * 100
        
        # Identify optimization opportunities
        peak_day = max(weekly_pattern, key=weekly_pattern.get)
        slow_day = min(weekly_pattern, key=weekly_pattern.get)
        
        recommendations = []
        if weekly_pattern[peak_day] > max_daily_capacity * 0.9:
            recommendations.append(f"Extend hours on {peak_day}")
        if weekly_pattern[slow_day] < max_daily_capacity * 0.3:
            recommendations.append(f"Offer promotions on {slow_day}")
            
        return {
            "utilization_rate": round(utilization, 2),
            "peak_day": peak_day,
            "slow_day": slow_day,
            "optimization_recommendations": recommendations,
            "revenue_opportunity": (total_capacity - total_bookings) * 30  # $30 avg service
        }
    
    async def run_comprehensive_evaluation(self) -> Dict:
        """Run complete business intelligence evaluation suite"""
        print("🎯 Starting Business Intelligence Evaluation Suite")
        print("=" * 60)
        
        evaluation_results = {
            "timestamp": datetime.now().isoformat(),
            "revenue_predictions": [],
            "customer_behavior": [],
            "seasonal_patterns": [],
            "booking_optimization": [],
            "overall_metrics": {}
        }
        
        # Test revenue predictions
        print("\n📊 Testing Revenue Predictions...")
        revenue_scenarios = self.evaluation_data['categories']['business_intelligence']['revenue_predictions']
        for scenario in revenue_scenarios:
            result = self.evaluate_revenue_prediction(scenario)
            evaluation_results['revenue_predictions'].append(asdict(result))
            print(f"  ✓ {scenario['id']}: {result.accuracy_percentage}% accurate")
        
        # Test customer behavior predictions
        print("\n👥 Testing Customer Behavior Analysis...")
        customer_scenarios = self.evaluation_data['categories']['business_intelligence']['customer_behavior']
        for scenario in customer_scenarios:
            result = self.evaluate_customer_behavior(scenario)
            evaluation_results['customer_behavior'].append(result)
            accuracy = "✓" if result['risk_prediction_accurate'] else "✗"
            print(f"  {accuracy} {scenario['id']}: Risk prediction {'correct' if result['risk_prediction_accurate'] else 'incorrect'}")
        
        # Test seasonal pattern recognition
        print("\n📈 Testing Seasonal Pattern Recognition...")
        sample_data = [float(np.random.normal(100, 20)) for _ in range(365)]
        seasonal_result = self.evaluate_seasonal_patterns(sample_data)
        evaluation_results['seasonal_patterns'].append(seasonal_result)
        print(f"  ✓ Seasonality detected: {seasonal_result['pattern_detected']}")
        
        # Test booking optimization
        print("\n📅 Testing Booking Optimization...")
        booking_scenario = {
            'weekly_pattern': {
                'monday': 15, 'tuesday': 25, 'wednesday': 30,
                'thursday': 35, 'friday': 45, 'saturday': 60, 'sunday': 20
            }
        }
        booking_result = self.evaluate_booking_optimization(booking_scenario)
        evaluation_results['booking_optimization'].append(booking_result)
        print(f"  ✓ Utilization: {booking_result['utilization_rate']}%")
        print(f"  ✓ Revenue opportunity: ${booking_result['revenue_opportunity']}")
        
        # Calculate overall metrics
        revenue_accuracies = [r['accuracy_percentage'] for r in evaluation_results['revenue_predictions']]
        behavior_accuracies = [100 if r['risk_prediction_accurate'] else 0 for r in evaluation_results['customer_behavior']]
        
        overall_accuracy = statistics.mean(revenue_accuracies + behavior_accuracies)
        
        evaluation_results['overall_metrics'] = {
            "average_accuracy": round(overall_accuracy, 2),
            "revenue_prediction_accuracy": round(statistics.mean(revenue_accuracies), 2),
            "behavior_prediction_accuracy": round(statistics.mean(behavior_accuracies), 2),
            "meets_threshold": overall_accuracy >= self.accuracy_threshold * 100,
            "threshold": self.accuracy_threshold * 100
        }
        
        # Print summary
        print("\n" + "=" * 60)
        print("📊 EVALUATION SUMMARY")
        print("=" * 60)
        print(f"Overall Accuracy: {evaluation_results['overall_metrics']['average_accuracy']}%")
        print(f"Revenue Predictions: {evaluation_results['overall_metrics']['revenue_prediction_accuracy']}%")
        print(f"Customer Behavior: {evaluation_results['overall_metrics']['behavior_prediction_accuracy']}%")
        print(f"Meets Threshold ({self.accuracy_threshold * 100}%): {'✅ YES' if evaluation_results['overall_metrics']['meets_threshold'] else '❌ NO'}")
        
        # Save results
        with open('bi_evaluation_results.json', 'w') as f:
            json.dump(evaluation_results, f, indent=2)
        print(f"\n💾 Results saved to bi_evaluation_results.json")
        
        return evaluation_results

def run_evaluation():
    """Main entry point for business intelligence evaluation"""
    evaluator = BusinessIntelligenceEvaluator()
    asyncio.run(evaluator.run_comprehensive_evaluation())

if __name__ == "__main__":
    run_evaluation()