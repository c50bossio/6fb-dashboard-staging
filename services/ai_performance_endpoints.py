#!/usr/bin/env python3
"""
FastAPI endpoints for AI Performance Monitoring System
Integrates with the FastAPI backend to provide AI performance APIs
"""

from fastapi import FastAPI, HTTPException, Query, Body
from pydantic import BaseModel
from typing import Dict, List, Optional, Any
from datetime import datetime
import asyncio
import json

from .ai_performance_monitor import (
    ai_performance_monitor,
    AIProvider,
    ModelType,
    PerformanceMetric,
    MetricType,
    ABTestConfiguration
)
from .ai_performance_tracker import ai_performance_middleware

# Pydantic models for API requests/responses
class MetricRequest(BaseModel):
    provider: str
    model: str
    metric_type: str
    value: float
    unit: str = ""
    session_id: str = ""
    user_id: str = ""
    metadata: Dict[str, Any] = {}
    request_context: Dict[str, Any] = {}

class AIRequestLog(BaseModel):
    provider: str
    model: str
    start_time: float
    end_time: float
    success: bool
    tokens_used: int = 0
    cost: float = 0.0
    confidence_score: float = 0.0
    context_data: Dict[str, Any] = {}
    session_id: str = ""
    user_id: str = ""

class ABTestRequest(BaseModel):
    name: str
    description: str
    model_a: str
    model_b: str
    traffic_split: float = 0.5
    end_time: Optional[datetime] = None
    success_criteria: Dict[str, float] = {}

def setup_performance_routes(app: FastAPI):
    """Setup AI performance monitoring routes in FastAPI app"""
    
    @app.get("/ai/performance/dashboard")
    async def get_performance_dashboard():
        """Get real-time dashboard data"""
        try:
            dashboard_data = await ai_performance_monitor.get_real_time_dashboard_data()
            return {
                "success": True,
                "data": dashboard_data
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to get dashboard data: {str(e)}")
    
    @app.get("/ai/performance/snapshots")
    async def get_model_snapshots(time_window_hours: int = Query(24, ge=1, le=168)):
        """Get performance snapshots for all models"""
        try:
            snapshots = {}
            
            # Get snapshots for all model combinations
            providers_models = [
                (AIProvider.OPENAI, ModelType.GPT_5),
                (AIProvider.OPENAI, ModelType.GPT_5_MINI),
                (AIProvider.OPENAI, ModelType.GPT_5_NANO),
                (AIProvider.ANTHROPIC, ModelType.CLAUDE_OPUS_4_1),
                (AIProvider.GOOGLE, ModelType.GEMINI_2_0_FLASH)
            ]
            
            for provider, model in providers_models:
                try:
                    snapshot = await ai_performance_monitor.get_model_performance_snapshot(
                        model, provider, time_window_hours
                    )
                    key = f"{provider.value}_{model.value}"
                    snapshots[key] = {
                        "model": model.value,
                        "provider": provider.value,
                        "timestamp": snapshot.timestamp.isoformat(),
                        "avg_response_time": snapshot.avg_response_time,
                        "p95_response_time": snapshot.p95_response_time,
                        "p99_response_time": snapshot.p99_response_time,
                        "success_rate": snapshot.success_rate,
                        "error_rate": snapshot.error_rate,
                        "avg_confidence": snapshot.avg_confidence,
                        "context_accuracy": snapshot.context_accuracy,
                        "business_relevance": snapshot.business_relevance,
                        "tokens_per_second": snapshot.tokens_per_second,
                        "cost_per_token": snapshot.cost_per_token,
                        "cache_hit_rate": snapshot.cache_hit_rate,
                        "memory_usage_mb": snapshot.memory_usage_mb,
                        "cpu_utilization": snapshot.cpu_utilization,
                        "concurrent_requests": snapshot.concurrent_requests,
                        "user_satisfaction": snapshot.user_satisfaction,
                        "conversion_rate": snapshot.conversion_rate,
                        "overall_score": snapshot.overall_score,
                        "status": snapshot.status.value
                    }
                except Exception as model_error:
                    print(f"Failed to get snapshot for {provider.value}/{model.value}: {model_error}")
                    continue
            
            return {
                "success": True,
                "data": snapshots
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to get model snapshots: {str(e)}")
    
    @app.get("/ai/performance/costs")
    async def get_cost_analysis(time_window_hours: int = Query(24, ge=1, le=168)):
        """Get cost analysis and optimization recommendations"""
        try:
            cost_analysis = await ai_performance_monitor.get_cost_analysis(time_window_hours)
            
            return {
                "success": True,
                "data": cost_analysis
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to get cost analysis: {str(e)}")
    
    @app.get("/ai/performance/ab-tests")
    async def get_ab_tests():
        """Get all A/B tests"""
        try:
            # Get active A/B tests from monitor
            ab_tests = []
            for test_id, config in ai_performance_monitor.ab_tests.items():
                test_data = {
                    "id": test_id,
                    "name": config.name,
                    "description": config.description,
                    "model_a": config.model_a.value,
                    "model_b": config.model_b.value,
                    "traffic_split": config.traffic_split,
                    "start_time": config.start_time.isoformat(),
                    "end_time": config.end_time.isoformat() if config.end_time else None,
                    "active": config.active,
                    "success_criteria": config.success_criteria
                }
                
                # Get results if test is still active
                if config.active:
                    try:
                        results = await ai_performance_monitor.get_ab_test_results(test_id)
                        test_data["results"] = results
                    except Exception:
                        pass  # Results not ready yet
                
                ab_tests.append(test_data)
            
            return {
                "success": True,
                "data": ab_tests
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to get A/B tests: {str(e)}")
    
    @app.post("/ai/performance/ab-tests")
    async def create_ab_test(test_request: ABTestRequest):
        """Create a new A/B test"""
        try:
            # Convert string model names to ModelType enums
            model_a = ModelType(test_request.model_a)
            model_b = ModelType(test_request.model_b)
            
            config = ABTestConfiguration(
                name=test_request.name,
                description=test_request.description,
                model_a=model_a,
                model_b=model_b,
                traffic_split=test_request.traffic_split,
                end_time=test_request.end_time,
                success_criteria=test_request.success_criteria
            )
            
            test_id = await ai_performance_monitor.start_ab_test(config)
            
            return {
                "success": True,
                "test_id": test_id,
                "message": "A/B test created successfully"
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to create A/B test: {str(e)}")
    
    @app.get("/ai/performance/ab-tests/{test_id}/results")
    async def get_ab_test_results(test_id: str):
        """Get results for a specific A/B test"""
        try:
            results = await ai_performance_monitor.get_ab_test_results(test_id)
            return {
                "success": True,
                "data": results
            }
        except ValueError as e:
            raise HTTPException(status_code=404, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to get A/B test results: {str(e)}")
    
    @app.post("/ai/performance/metrics")
    async def record_metric(metric_request: MetricRequest):
        """Record a performance metric"""
        try:
            provider = AIProvider(metric_request.provider)
            model = ModelType(metric_request.model)
            metric_type = MetricType(metric_request.metric_type)
            
            metric = PerformanceMetric(
                provider=provider,
                model=model,
                metric_type=metric_type,
                value=metric_request.value,
                unit=metric_request.unit,
                metadata=metric_request.metadata,
                session_id=metric_request.session_id,
                user_id=metric_request.user_id,
                request_context=metric_request.request_context
            )
            
            success = await ai_performance_monitor.record_metric(metric)
            
            return {
                "success": success,
                "metric_id": metric.id
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to record metric: {str(e)}")
    
    @app.post("/ai/performance/log-request")
    async def log_ai_request(request_log: AIRequestLog):
        """Log a complete AI request with all metrics"""
        try:
            provider = AIProvider(request_log.provider)
            model = ModelType(request_log.model)
            
            request_id = await ai_performance_monitor.record_ai_request(
                provider=provider,
                model=model,
                start_time=request_log.start_time,
                end_time=request_log.end_time,
                success=request_log.success,
                tokens_used=request_log.tokens_used,
                cost=request_log.cost,
                confidence_score=request_log.confidence_score,
                context_data=request_log.context_data,
                session_id=request_log.session_id,
                user_id=request_log.user_id
            )
            
            return {
                "success": True,
                "request_id": request_id
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to log AI request: {str(e)}")
    
    @app.get("/ai/performance/alerts")
    async def get_active_alerts():
        """Get all active performance alerts"""
        try:
            alerts = []
            for alert in ai_performance_monitor.active_alerts.values():
                if not alert.resolved:
                    alerts.append({
                        "id": alert.id,
                        "timestamp": alert.timestamp.isoformat(),
                        "severity": alert.severity.value,
                        "title": alert.title,
                        "description": alert.description,
                        "model": alert.model.value if alert.model else None,
                        "provider": alert.provider.value if alert.provider else None,
                        "metric_type": alert.metric_type.value if alert.metric_type else None,
                        "current_value": alert.current_value,
                        "threshold_value": alert.threshold_value,
                        "suggested_actions": alert.suggested_actions
                    })
            
            return {
                "success": True,
                "data": alerts
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to get alerts: {str(e)}")
    
    @app.post("/ai/performance/alerts/{alert_id}/resolve")
    async def resolve_alert(alert_id: str):
        """Mark an alert as resolved"""
        try:
            if alert_id in ai_performance_monitor.active_alerts:
                alert = ai_performance_monitor.active_alerts[alert_id]
                alert.resolved = True
                alert.resolution_time = datetime.utcnow()
                
                return {
                    "success": True,
                    "message": "Alert resolved successfully"
                }
            else:
                raise HTTPException(status_code=404, detail="Alert not found")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to resolve alert: {str(e)}")
    
    @app.get("/ai/performance/models/select-optimal")
    async def select_optimal_model(
        task_type: str = Query("general"),
        priority: str = Query("balanced")  # speed, quality, cost, balanced
    ):
        """Select the optimal AI model based on current performance"""
        try:
            provider, model = await ai_performance_middleware.select_optimal_model(
                task_type=task_type,
                priority=priority
            )
            
            return {
                "success": True,
                "recommended_provider": provider,
                "recommended_model": model,
                "selection_criteria": {
                    "task_type": task_type,
                    "priority": priority
                }
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to select optimal model: {str(e)}")
    
    @app.get("/ai/performance/health")
    async def performance_monitoring_health():
        """Health check for performance monitoring system"""
        try:
            dashboard_data = await ai_performance_monitor.get_real_time_dashboard_data()
            
            return {
                "success": True,
                "status": "healthy",
                "monitoring_active": True,
                "database_connected": True,
                "last_update": dashboard_data.get("timestamp"),
                "active_monitors": len(ai_performance_monitor.monitoring_tasks),
                "metrics_buffer_size": len(ai_performance_monitor.metrics_buffer)
            }
        except Exception as e:
            return {
                "success": False,
                "status": "degraded",
                "error": str(e)
            }
    
    # Initialize monitoring when routes are set up
    if not ai_performance_monitor.monitoring_tasks:
        # Start monitoring in the background
        asyncio.create_task(ai_performance_monitor.start_monitoring())
    
    return app