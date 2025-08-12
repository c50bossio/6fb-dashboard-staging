#!/usr/bin/env python3
"""
Production Monitoring and Drift Detection System
Monitors AI performance in production and detects quality degradation
"""

import json
import asyncio
import time
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
import statistics
from collections import deque
import warnings

from evaluation_config import get_config, get_ai_client, get_supabase_client
from metrics_collector import MetricsCollector

@dataclass
class PerformanceSnapshot:
    """Point-in-time performance metrics"""
    timestamp: str
    accuracy_score: float
    response_time_p50: float
    response_time_p95: float
    hallucination_rate: float
    error_rate: float
    cost_per_query: float
    queries_processed: int
    
@dataclass
class DriftAlert:
    """Alert for detected performance drift"""
    alert_id: str
    timestamp: str
    metric_name: str
    baseline_value: float
    current_value: float
    drift_percentage: float
    severity: str  # low, medium, high, critical
    recommended_action: str


class ProductionMonitor:
    """Monitors AI system performance in production"""
    
    def __init__(self, window_size: int = 100):
        self.config = get_config()
        self.metrics_collector = MetricsCollector()
        self.window_size = window_size
        
        # Rolling windows for metrics
        self.accuracy_window = deque(maxlen=window_size)
        self.response_time_window = deque(maxlen=window_size)
        self.hallucination_window = deque(maxlen=window_size)
        self.error_window = deque(maxlen=window_size)
        self.cost_window = deque(maxlen=window_size)
        
        # Baseline metrics (established during initial training)
        self.baseline_metrics = {
            "accuracy": 0.85,
            "response_time_p50": 2000,  # ms
            "response_time_p95": 5000,  # ms
            "hallucination_rate": 0.05,
            "error_rate": 0.02,
            "cost_per_query": 0.05
        }
        
        # Drift thresholds
        self.drift_thresholds = {
            "accuracy": {"warning": 0.05, "critical": 0.10},  # 5% and 10% degradation
            "response_time": {"warning": 0.20, "critical": 0.50},  # 20% and 50% increase
            "hallucination": {"warning": 0.03, "critical": 0.05},  # 3% and 5% increase
            "error_rate": {"warning": 0.02, "critical": 0.05},  # 2% and 5% increase
            "cost": {"warning": 0.20, "critical": 0.40}  # 20% and 40% increase
        }
        
        # Alert history
        self.alerts: List[DriftAlert] = []
        self.snapshots: List[PerformanceSnapshot] = []
        
    async def collect_production_metrics(self, 
                                        query: str,
                                        response: str,
                                        expected: Optional[Any] = None,
                                        response_time_ms: float = 0,
                                        model_used: str = "gpt-5") -> Dict[str, Any]:
        """Collect metrics from a production query"""
        
        # Calculate accuracy if expected output provided
        accuracy = 1.0
        if expected:
            # Simplified accuracy calculation
            if str(expected).lower() in response.lower():
                accuracy = 1.0
            else:
                accuracy = 0.5
        
        self.accuracy_window.append(accuracy)
        
        # Track response time
        self.response_time_window.append(response_time_ms)
        
        # Detect hallucination
        hallucination_score = self.metrics_collector.detect_hallucination(response)
        self.hallucination_window.append(hallucination_score)
        
        # Track errors
        is_error = "error" in response.lower() or "failed" in response.lower()
        self.error_window.append(1 if is_error else 0)
        
        # Calculate cost
        tokens = len(query.split()) + len(response.split())
        cost = self.metrics_collector.model_costs.get(model_used, 0.01) * (tokens / 1000)
        self.cost_window.append(cost)
        
        # Check for drift
        drift_detected = await self.check_for_drift()
        
        return {
            "accuracy": accuracy,
            "response_time_ms": response_time_ms,
            "hallucination_score": hallucination_score,
            "is_error": is_error,
            "cost": cost,
            "drift_detected": drift_detected
        }
    
    async def check_for_drift(self) -> List[DriftAlert]:
        """Check if performance has drifted from baseline"""
        alerts = []
        
        # Need minimum samples before checking drift
        if len(self.accuracy_window) < 20:
            return alerts
        
        # Check accuracy drift
        current_accuracy = statistics.mean(self.accuracy_window)
        accuracy_drift = (self.baseline_metrics["accuracy"] - current_accuracy) / self.baseline_metrics["accuracy"]
        
        if accuracy_drift > self.drift_thresholds["accuracy"]["critical"]:
            alert = DriftAlert(
                alert_id=f"drift_{datetime.now().timestamp()}",
                timestamp=datetime.now().isoformat(),
                metric_name="accuracy",
                baseline_value=self.baseline_metrics["accuracy"],
                current_value=current_accuracy,
                drift_percentage=accuracy_drift * 100,
                severity="critical",
                recommended_action="Immediate model retraining required"
            )
            alerts.append(alert)
            self.alerts.append(alert)
        elif accuracy_drift > self.drift_thresholds["accuracy"]["warning"]:
            alert = DriftAlert(
                alert_id=f"drift_{datetime.now().timestamp()}",
                timestamp=datetime.now().isoformat(),
                metric_name="accuracy",
                baseline_value=self.baseline_metrics["accuracy"],
                current_value=current_accuracy,
                drift_percentage=accuracy_drift * 100,
                severity="medium",
                recommended_action="Monitor closely, prepare for retraining"
            )
            alerts.append(alert)
            self.alerts.append(alert)
        
        # Check response time drift
        if self.response_time_window:
            current_p50 = np.percentile(list(self.response_time_window), 50)
            current_p95 = np.percentile(list(self.response_time_window), 95)
            
            p50_drift = (current_p50 - self.baseline_metrics["response_time_p50"]) / self.baseline_metrics["response_time_p50"]
            
            if p50_drift > self.drift_thresholds["response_time"]["critical"]:
                alert = DriftAlert(
                    alert_id=f"drift_{datetime.now().timestamp()}",
                    timestamp=datetime.now().isoformat(),
                    metric_name="response_time_p50",
                    baseline_value=self.baseline_metrics["response_time_p50"],
                    current_value=current_p50,
                    drift_percentage=p50_drift * 100,
                    severity="high",
                    recommended_action="Investigate infrastructure issues or model complexity"
                )
                alerts.append(alert)
                self.alerts.append(alert)
        
        # Check hallucination drift
        if self.hallucination_window:
            current_hallucination = statistics.mean(self.hallucination_window)
            hallucination_increase = current_hallucination - self.baseline_metrics["hallucination_rate"]
            
            if hallucination_increase > self.drift_thresholds["hallucination"]["critical"]:
                alert = DriftAlert(
                    alert_id=f"drift_{datetime.now().timestamp()}",
                    timestamp=datetime.now().isoformat(),
                    metric_name="hallucination_rate",
                    baseline_value=self.baseline_metrics["hallucination_rate"],
                    current_value=current_hallucination,
                    drift_percentage=hallucination_increase * 100,
                    severity="critical",
                    recommended_action="Review training data and model parameters immediately"
                )
                alerts.append(alert)
                self.alerts.append(alert)
        
        return alerts
    
    def calculate_current_snapshot(self) -> PerformanceSnapshot:
        """Calculate current performance snapshot"""
        return PerformanceSnapshot(
            timestamp=datetime.now().isoformat(),
            accuracy_score=statistics.mean(self.accuracy_window) if self.accuracy_window else 0,
            response_time_p50=np.percentile(list(self.response_time_window), 50) if self.response_time_window else 0,
            response_time_p95=np.percentile(list(self.response_time_window), 95) if self.response_time_window else 0,
            hallucination_rate=statistics.mean(self.hallucination_window) if self.hallucination_window else 0,
            error_rate=statistics.mean(self.error_window) if self.error_window else 0,
            cost_per_query=statistics.mean(self.cost_window) if self.cost_window else 0,
            queries_processed=len(self.accuracy_window)
        )
    
    async def run_continuous_monitoring(self, duration_minutes: int = 5):
        """Run continuous monitoring for specified duration"""
        print(f"📡 Starting Production Monitoring for {duration_minutes} minutes")
        print("=" * 60)
        
        start_time = time.time()
        end_time = start_time + (duration_minutes * 60)
        
        ai_client = await get_ai_client()
        monitoring_results = {
            "start_time": datetime.now().isoformat(),
            "snapshots": [],
            "alerts": [],
            "summary": {}
        }
        
        # Simulate production queries
        test_queries = [
            "What's the best price for a haircut?",
            "How can I increase customer retention?",
            "Analyze my revenue trends",
            "Should I hire another barber?",
            "What marketing strategy should I use?"
        ]
        
        query_count = 0
        
        while time.time() < end_time:
            # Simulate a production query
            query = test_queries[query_count % len(test_queries)]
            
            # Make real AI call
            start_query = time.time()
            response = await ai_client.query_ai_agent("master_coach", query)
            response_time = (time.time() - start_query) * 1000
            
            # Collect metrics
            metrics = await self.collect_production_metrics(
                query=query,
                response=response.get("response", ""),
                response_time_ms=response_time,
                model_used=response.get("model", "gpt-5")
            )
            
            # Check for alerts
            if metrics["drift_detected"]:
                print(f"⚠️ DRIFT DETECTED at query {query_count}!")
                for alert in metrics["drift_detected"]:
                    print(f"  - {alert.metric_name}: {alert.drift_percentage:.1f}% drift ({alert.severity})")
            
            query_count += 1
            
            # Take snapshot every 10 queries
            if query_count % 10 == 0:
                snapshot = self.calculate_current_snapshot()
                self.snapshots.append(snapshot)
                monitoring_results["snapshots"].append(asdict(snapshot))
                
                print(f"\n📊 Snapshot at {query_count} queries:")
                print(f"  Accuracy: {snapshot.accuracy_score:.2f}")
                print(f"  Response Time (p50): {snapshot.response_time_p50:.0f}ms")
                print(f"  Hallucination Rate: {snapshot.hallucination_rate:.3f}")
                print(f"  Error Rate: {snapshot.error_rate:.3f}")
            
            # Small delay to simulate realistic traffic
            await asyncio.sleep(2)
        
        await ai_client.close()
        
        # Final summary
        final_snapshot = self.calculate_current_snapshot()
        
        monitoring_results["summary"] = {
            "total_queries": query_count,
            "duration_minutes": duration_minutes,
            "final_accuracy": final_snapshot.accuracy_score,
            "final_response_time_p50": final_snapshot.response_time_p50,
            "final_hallucination_rate": final_snapshot.hallucination_rate,
            "total_alerts": len(self.alerts),
            "critical_alerts": sum(1 for a in self.alerts if a.severity == "critical")
        }
        
        monitoring_results["alerts"] = [asdict(a) for a in self.alerts]
        
        # Print summary
        print("\n" + "=" * 60)
        print("📡 MONITORING SUMMARY")
        print("=" * 60)
        print(f"Total Queries: {query_count}")
        print(f"Final Accuracy: {final_snapshot.accuracy_score:.2%}")
        print(f"Final Response Time (p50): {final_snapshot.response_time_p50:.0f}ms")
        print(f"Final Hallucination Rate: {final_snapshot.hallucination_rate:.3f}")
        print(f"Total Alerts: {len(self.alerts)}")
        
        if self.alerts:
            print("\n⚠️ DRIFT ALERTS:")
            for alert in self.alerts[-5:]:  # Show last 5 alerts
                print(f"  [{alert.severity.upper()}] {alert.metric_name}: {alert.drift_percentage:.1f}% drift")
                print(f"    Action: {alert.recommended_action}")
        
        # Save results
        with open('production_monitoring_results.json', 'w') as f:
            json.dump(monitoring_results, f, indent=2)
        print(f"\n💾 Results saved to production_monitoring_results.json")
        
        return monitoring_results


class AnomalyDetector:
    """Detects anomalies in AI responses"""
    
    def __init__(self):
        self.response_patterns = []
        self.anomaly_threshold = 3.0  # Standard deviations from mean
        
    def detect_response_anomaly(self, response: str, response_time: float, cost: float) -> Dict[str, Any]:
        """Detect if a response is anomalous"""
        anomalies = []
        
        # Check response length anomaly
        response_length = len(response)
        if self.response_patterns:
            avg_length = statistics.mean([len(r) for r in self.response_patterns[-100:]])
            std_length = statistics.stdev([len(r) for r in self.response_patterns[-100:]]) if len(self.response_patterns) > 1 else 1
            
            if abs(response_length - avg_length) > self.anomaly_threshold * std_length:
                anomalies.append({
                    "type": "response_length",
                    "severity": "medium",
                    "details": f"Response length {response_length} is unusual (avg: {avg_length:.0f})"
                })
        
        # Check for error patterns
        error_indicators = ["sorry", "cannot", "unable", "error", "failed", "exception"]
        error_count = sum(1 for indicator in error_indicators if indicator in response.lower())
        if error_count >= 3:
            anomalies.append({
                "type": "error_pattern",
                "severity": "high",
                "details": f"Multiple error indicators found ({error_count})"
            })
        
        # Check for empty or too short responses
        if len(response) < 10:
            anomalies.append({
                "type": "empty_response",
                "severity": "critical",
                "details": "Response is suspiciously short"
            })
        
        # Check for repetitive content
        sentences = response.split('.')
        if len(sentences) > 3:
            unique_sentences = set(sentences)
            if len(unique_sentences) < len(sentences) * 0.7:
                anomalies.append({
                    "type": "repetitive_content",
                    "severity": "medium",
                    "details": "Response contains repetitive content"
                })
        
        # Store pattern for future comparison
        self.response_patterns.append(response)
        
        return {
            "is_anomalous": len(anomalies) > 0,
            "anomaly_count": len(anomalies),
            "anomalies": anomalies
        }


async def run_monitoring_demo():
    """Demo production monitoring with short duration"""
    monitor = ProductionMonitor()
    await monitor.run_continuous_monitoring(duration_minutes=2)  # 2 minutes for demo

if __name__ == "__main__":
    asyncio.run(run_monitoring_demo())