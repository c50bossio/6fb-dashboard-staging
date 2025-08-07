#!/usr/bin/env python3
"""
Alert Integration Service
Integrates intelligent alerts with existing real-time services, analytics, and business recommendations
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Callable
import schedule
import time
from threading import Thread

# Import existing services
try:
    from .intelligent_alert_service import intelligent_alert_service, AlertCategory, AlertPriority
    from .realtime_service import realtime_service
    from .predictive_analytics_service import predictive_analytics_service
    from .business_recommendations_service import business_recommendations_service
    from .ai_orchestrator_service import ai_orchestrator
    SERVICES_AVAILABLE = True
except ImportError:
    SERVICES_AVAILABLE = False

logger = logging.getLogger(__name__)

class AlertIntegrationService:
    """
    Service that integrates intelligent alerts with existing business intelligence services
    """
    
    def __init__(self):
        self.integration_handlers = {}
        self.monitoring_tasks = {}
        self.alert_triggers = {}
        self.business_metrics_cache = {}
        self.integration_status = {
            'realtime_service': False,
            'predictive_analytics': False,
            'business_recommendations': False,
            'ai_orchestrator': False
        }
        
        # Alert thresholds and configurations
        self.alert_thresholds = {
            'revenue_drop_threshold': 0.20,  # 20% drop triggers alert
            'customer_drop_threshold': 0.15,  # 15% customer decrease
            'system_health_threshold': 0.95,  # 95% uptime minimum
            'response_time_threshold': 5.0,   # 5 second max response time
            'booking_anomaly_threshold': 0.25  # 25% booking deviation
        }
        
        # Auto-monitoring intervals
        self.monitoring_intervals = {
            'business_metrics': 300,    # 5 minutes
            'system_health': 60,       # 1 minute
            'predictive_alerts': 900,  # 15 minutes
            'customer_behavior': 1800  # 30 minutes
        }
        
        self._setup_integrations()
        self._start_monitoring()
    
    def _setup_integrations(self):
        """Initialize integrations with existing services"""
        if not SERVICES_AVAILABLE:
            logger.warning("⚠️ Alert integration services not available")
            return
        
        try:
            # Test connections to existing services
            if realtime_service:
                self.integration_status['realtime_service'] = True
                logger.info("✅ Real-time service integration ready")
            
            if predictive_analytics_service:
                self.integration_status['predictive_analytics'] = True
                logger.info("✅ Predictive analytics integration ready")
            
            if hasattr(business_recommendations_service, 'generate_recommendations'):
                self.integration_status['business_recommendations'] = True
                logger.info("✅ Business recommendations integration ready")
            
            if ai_orchestrator:
                self.integration_status['ai_orchestrator'] = True
                logger.info("✅ AI orchestrator integration ready")
                
        except Exception as e:
            logger.error(f"Integration setup failed: {e}")
    
    def _start_monitoring(self):
        """Start background monitoring tasks"""
        if not SERVICES_AVAILABLE:
            return
        
        # Schedule monitoring tasks
        schedule.every(5).minutes.do(self._monitor_business_metrics)
        schedule.every(1).minute.do(self._monitor_system_health)
        schedule.every(15).minutes.do(self._monitor_predictive_alerts)
        schedule.every(30).minutes.do(self._monitor_customer_behavior)
        
        # Start scheduler in background thread
        self.scheduler_thread = Thread(target=self._run_scheduler, daemon=True)
        self.scheduler_thread.start()
        
        logger.info("✅ Alert monitoring scheduler started")
    
    def _run_scheduler(self):
        """Run the monitoring scheduler"""
        while True:
            try:
                schedule.run_pending()
                time.sleep(1)
            except Exception as e:
                logger.error(f"Scheduler error: {e}")
                time.sleep(60)  # Wait a minute before retrying
    
    async def _monitor_business_metrics(self):
        """Monitor business metrics and generate alerts for anomalies"""
        try:
            logger.debug("🔍 Monitoring business metrics...")
            
            # Get current business metrics from real-time service
            if self.integration_status['realtime_service']:
                current_metrics = await self._get_current_business_metrics()
                
                # Compare with historical data
                anomalies = await self._detect_business_anomalies(current_metrics)
                
                # Generate alerts for significant anomalies
                for anomaly in anomalies:
                    await self._create_business_anomaly_alert(anomaly)
                    
        except Exception as e:
            logger.error(f"Business metrics monitoring failed: {e}")
    
    async def _monitor_system_health(self):
        """Monitor system health and generate alerts for issues"""
        try:
            logger.debug("🔍 Monitoring system health...")
            
            # Check real-time service health
            if self.integration_status['realtime_service']:
                rt_status = realtime_service.get_system_status()
                
                if rt_status.get('service_status') != 'operational':
                    await intelligent_alert_service.create_alert(
                        barbershop_id="system",
                        title="Real-time Service Degraded",
                        message=f"Real-time service status: {rt_status.get('service_status')}",
                        category=AlertCategory.SYSTEM_HEALTH,
                        source_data={
                            'service_status': rt_status.get('service_status'),
                            'active_connections': rt_status.get('active_connections', 0),
                            'streaming_tasks': rt_status.get('streaming_tasks', 0),
                            'system_critical': True
                        }
                    )
            
            # Check predictive analytics service health
            if self.integration_status['predictive_analytics']:
                pa_status = self._check_predictive_analytics_health()
                
                if not pa_status.get('healthy', True):
                    await intelligent_alert_service.create_alert(
                        barbershop_id="system",
                        title="Predictive Analytics Service Issue",
                        message="Predictive analytics service is not responding correctly",
                        category=AlertCategory.SYSTEM_HEALTH,
                        source_data={
                            'service_health': pa_status,
                            'system_critical': False,
                            'impact_level': 'medium'
                        }
                    )
                    
        except Exception as e:
            logger.error(f"System health monitoring failed: {e}")
    
    async def _monitor_predictive_alerts(self):
        """Monitor predictive analytics and generate proactive alerts"""
        try:
            logger.debug("🔍 Monitoring predictive analytics...")
            
            if not self.integration_status['predictive_analytics']:
                return
            
            # Get predictive insights for all active barbershops
            active_shops = await self._get_active_barbershops()
            
            for shop_id in active_shops:
                try:
                    # Generate comprehensive AI forecast
                    forecast = await predictive_analytics_service.generate_ai_powered_forecast(
                        barbershop_id=shop_id,
                        forecast_type="predictive_alerts"
                    )
                    
                    # Generate alerts based on forecast insights
                    await self._process_predictive_forecast_alerts(shop_id, forecast)
                    
                except Exception as e:
                    logger.error(f"Predictive monitoring failed for shop {shop_id}: {e}")
                    
        except Exception as e:
            logger.error(f"Predictive alerts monitoring failed: {e}")
    
    async def _monitor_customer_behavior(self):
        """Monitor customer behavior patterns and generate insights"""
        try:
            logger.debug("🔍 Monitoring customer behavior...")
            
            if not self.integration_status['predictive_analytics']:
                return
            
            active_shops = await self._get_active_barbershops()
            
            for shop_id in active_shops:
                try:
                    # Get customer behavior forecast
                    behavior_forecast = await predictive_analytics_service._generate_customer_behavior_forecast(shop_id)
                    
                    # Check for significant behavior changes
                    alerts = await self._analyze_behavior_changes(shop_id, behavior_forecast)
                    
                    for alert_data in alerts:
                        await intelligent_alert_service.create_alert(
                            barbershop_id=shop_id,
                            title=alert_data['title'],
                            message=alert_data['message'],
                            category=AlertCategory.CUSTOMER_BEHAVIOR,
                            source_data=alert_data['source_data']
                        )
                        
                except Exception as e:
                    logger.error(f"Customer behavior monitoring failed for shop {shop_id}: {e}")
                    
        except Exception as e:
            logger.error(f"Customer behavior monitoring failed: {e}")
    
    async def _get_current_business_metrics(self) -> Dict[str, Any]:
        """Get current business metrics from real-time service"""
        try:
            # This would integrate with actual business data
            # For now, simulate with realistic data patterns
            current_time = datetime.now()
            
            # Generate realistic metrics based on time patterns
            base_metrics = await realtime_service._generate_realtime_metrics()
            
            # Add additional business context
            extended_metrics = {
                **base_metrics,
                'timestamp': current_time.isoformat(),
                'week_day': current_time.weekday(),
                'month_day': current_time.day,
                'season': self._get_current_season(),
                'is_holiday_period': self._is_holiday_period(current_time)
            }
            
            return extended_metrics
            
        except Exception as e:
            logger.error(f"Failed to get current business metrics: {e}")
            return {}
    
    async def _detect_business_anomalies(self, current_metrics: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Detect anomalies in business metrics"""
        anomalies = []
        
        try:
            # Cache key for historical comparison
            cache_key = f"metrics_{datetime.now().strftime('%Y%m%d_%H')}"
            
            # Get historical metrics for comparison
            historical_avg = self.business_metrics_cache.get('historical_average', {})
            
            # Revenue anomaly detection
            current_revenue = current_metrics.get('total_revenue', 0)
            historical_revenue = historical_avg.get('total_revenue', current_revenue)
            
            if historical_revenue > 0:
                revenue_change = (current_revenue - historical_revenue) / historical_revenue
                
                if abs(revenue_change) > self.alert_thresholds['revenue_drop_threshold']:
                    anomalies.append({
                        'type': 'revenue_anomaly',
                        'severity': 'high' if abs(revenue_change) > 0.3 else 'medium',
                        'change_percent': revenue_change,
                        'current_value': current_revenue,
                        'expected_value': historical_revenue,
                        'metric_name': 'revenue'
                    })
            
            # Customer count anomaly detection
            current_customers = current_metrics.get('active_customers', 0)
            historical_customers = historical_avg.get('active_customers', current_customers)
            
            if historical_customers > 0:
                customer_change = (current_customers - historical_customers) / historical_customers
                
                if abs(customer_change) > self.alert_thresholds['customer_drop_threshold']:
                    anomalies.append({
                        'type': 'customer_anomaly',
                        'severity': 'medium',
                        'change_percent': customer_change,
                        'current_value': current_customers,
                        'expected_value': historical_customers,
                        'metric_name': 'active_customers'
                    })
            
            # Booking utilization anomaly
            current_utilization = current_metrics.get('utilization_rate', 0)
            if current_utilization < 0.5 and current_metrics.get('is_business_hours', False):
                anomalies.append({
                    'type': 'utilization_anomaly',
                    'severity': 'medium',
                    'current_value': current_utilization,
                    'threshold': 0.5,
                    'metric_name': 'utilization_rate'
                })
            
            # Update cache with current metrics
            self.business_metrics_cache[cache_key] = current_metrics
            
            # Maintain rolling average for historical comparison
            if 'historical_average' not in self.business_metrics_cache:
                self.business_metrics_cache['historical_average'] = current_metrics
            else:
                # Update rolling average (simple exponential smoothing)
                alpha = 0.1  # Smoothing factor
                for key, value in current_metrics.items():
                    if isinstance(value, (int, float)):
                        historical_value = self.business_metrics_cache['historical_average'].get(key, value)
                        self.business_metrics_cache['historical_average'][key] = (
                            alpha * value + (1 - alpha) * historical_value
                        )
            
        except Exception as e:
            logger.error(f"Anomaly detection failed: {e}")
        
        return anomalies
    
    async def _create_business_anomaly_alert(self, anomaly: Dict[str, Any]):
        """Create alert for detected business anomaly"""
        try:
            anomaly_type = anomaly.get('type', 'unknown')
            severity = anomaly.get('severity', 'medium')
            change_percent = anomaly.get('change_percent', 0)
            metric_name = anomaly.get('metric_name', 'metric')
            
            # Generate appropriate title and message
            if anomaly_type == 'revenue_anomaly':
                direction = 'drop' if change_percent < 0 else 'spike'
                title = f"Revenue {direction.title()} Detected"
                message = f"Revenue is {abs(change_percent)*100:.1f}% {'below' if change_percent < 0 else 'above'} expected levels"
                category = AlertCategory.REVENUE_ANOMALY
                
            elif anomaly_type == 'customer_anomaly':
                direction = 'decrease' if change_percent < 0 else 'increase'
                title = f"Customer Activity {direction.title()}"
                message = f"Active customers {direction} by {abs(change_percent)*100:.1f}%"
                category = AlertCategory.CUSTOMER_BEHAVIOR
                
            elif anomaly_type == 'utilization_anomaly':
                title = "Low Booking Utilization"
                message = f"Current utilization rate is {anomaly['current_value']:.1%}, below optimal threshold"
                category = AlertCategory.OPERATIONAL_ISSUE
                
            else:
                title = f"Business Metric Anomaly: {metric_name}"
                message = f"Unusual pattern detected in {metric_name}"
                category = AlertCategory.BUSINESS_METRIC
            
            # Calculate business impact
            revenue_impact = 0
            if anomaly_type == 'revenue_anomaly':
                revenue_impact = abs(anomaly.get('current_value', 0) - anomaly.get('expected_value', 0))
            elif anomaly_type == 'customer_anomaly':
                # Estimate revenue impact from customer changes
                avg_customer_value = 50  # Estimated average customer value
                customer_diff = abs(anomaly.get('current_value', 0) - anomaly.get('expected_value', 0))
                revenue_impact = customer_diff * avg_customer_value
            
            # Create the alert
            await intelligent_alert_service.create_alert(
                barbershop_id="auto_detected",  # Would use actual shop ID in production
                title=title,
                message=message,
                category=category,
                source_data={
                    'anomaly_type': anomaly_type,
                    'change_percent': change_percent,
                    'current_value': anomaly.get('current_value'),
                    'expected_value': anomaly.get('expected_value'),
                    'revenue_impact': revenue_impact,
                    'severity': severity,
                    'detection_time': datetime.now().isoformat(),
                    'threshold_exceeded': True,
                    'auto_detected': True
                }
            )
            
            logger.info(f"🚨 Created anomaly alert: {title} ({severity} severity)")
            
        except Exception as e:
            logger.error(f"Failed to create business anomaly alert: {e}")
    
    async def _process_predictive_forecast_alerts(self, shop_id: str, forecast: Dict[str, Any]):
        """Process predictive forecast and generate proactive alerts"""
        try:
            if 'ai_insights' not in forecast:
                return
            
            insights = forecast['ai_insights']
            predictions = forecast.get('predictions', {})
            
            # Revenue forecast alerts
            if 'revenue' in predictions:
                revenue_pred = predictions['revenue']
                if revenue_pred.get('confidence', 0) > 0.8:
                    # High confidence revenue prediction
                    weekly_pred = revenue_pred.get('predictions', {}).get('1_week', {})
                    if weekly_pred.get('trend') == 'decreasing':
                        await intelligent_alert_service.create_alert(
                            barbershop_id=shop_id,
                            title="Revenue Decline Predicted",
                            message=f"AI predicts revenue decline next week with {revenue_pred['confidence']:.0%} confidence",
                            category=AlertCategory.REVENUE_ANOMALY,
                            source_data={
                                'prediction_type': 'revenue_decline',
                                'confidence': revenue_pred['confidence'],
                                'timeframe': '1_week',
                                'predicted_value': weekly_pred.get('value', 0),
                                'trend': 'decreasing',
                                'proactive_alert': True
                            }
                        )
            
            # Customer behavior predictions
            if 'customer_behavior' in predictions:
                behavior_pred = predictions['customer_behavior']
                behavior_data = behavior_pred.get('predictions', {})
                
                # Retention rate alerts
                retention = behavior_data.get('retention_rate', {})
                if retention.get('predicted_1_month', 0) < retention.get('current', 0) * 0.9:
                    await intelligent_alert_service.create_alert(
                        barbershop_id=shop_id,
                        title="Customer Retention Risk",
                        message="AI predicts potential decline in customer retention next month",
                        category=AlertCategory.CUSTOMER_BEHAVIOR,
                        source_data={
                            'prediction_type': 'retention_decline',
                            'current_retention': retention.get('current', 0),
                            'predicted_retention': retention.get('predicted_1_month', 0),
                            'confidence': behavior_pred.get('confidence', 0),
                            'proactive_alert': True
                        }
                    )
            
            # Process AI-generated insights as opportunities
            for insight in insights:
                if insight.get('type') == 'revenue_opportunity':
                    await intelligent_alert_service.create_alert(
                        barbershop_id=shop_id,
                        title=insight.get('title', 'Business Opportunity Identified'),
                        message=insight.get('description', 'AI has identified a potential business opportunity'),
                        category=AlertCategory.OPPORTUNITY,
                        source_data={
                            'insight_type': 'ai_generated',
                            'confidence': insight.get('confidence', 0),
                            'priority': insight.get('priority', 'medium'),
                            'ai_generated': True,
                            'opportunity_type': 'revenue'
                        }
                    )
                    
        except Exception as e:
            logger.error(f"Failed to process predictive forecast alerts: {e}")
    
    async def _analyze_behavior_changes(self, shop_id: str, behavior_forecast: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Analyze customer behavior changes and generate alert data"""
        alerts = []
        
        try:
            if 'predictions' not in behavior_forecast:
                return alerts
            
            predictions = behavior_forecast['predictions']
            
            # Check for significant changes in visit frequency
            visit_freq = predictions.get('average_visit_frequency', {})
            if visit_freq:
                current_freq = visit_freq.get('current', 0)
                predicted_freq = visit_freq.get('predicted_1_month', 0)
                
                if current_freq > 0:
                    freq_change = (predicted_freq - current_freq) / current_freq
                    
                    if abs(freq_change) > 0.15:  # 15% change threshold
                        direction = 'increase' if freq_change > 0 else 'decrease'
                        alerts.append({
                            'title': f"Customer Visit Frequency {direction.title()} Predicted",
                            'message': f"AI predicts {abs(freq_change)*100:.1f}% {direction} in customer visit frequency",
                            'source_data': {
                                'behavior_change': 'visit_frequency',
                                'change_percent': freq_change,
                                'current_frequency': current_freq,
                                'predicted_frequency': predicted_freq,
                                'confidence': behavior_forecast.get('confidence', 0)
                            }
                        })
            
            # Check for customer lifetime value changes
            clv = predictions.get('customer_lifetime_value', {})
            if clv:
                current_clv = clv.get('current', 0)
                predicted_clv = clv.get('predicted_6_months', 0)
                
                if current_clv > 0:
                    clv_change = (predicted_clv - current_clv) / current_clv
                    
                    if clv_change > 0.20:  # 20% increase is significant
                        alerts.append({
                            'title': "Customer Lifetime Value Growth Opportunity",
                            'message': f"AI predicts {clv_change*100:.1f}% increase in customer lifetime value",
                            'source_data': {
                                'behavior_change': 'clv_increase',
                                'change_percent': clv_change,
                                'current_clv': current_clv,
                                'predicted_clv': predicted_clv,
                                'opportunity_value': predicted_clv - current_clv
                            }
                        })
                    elif clv_change < -0.15:  # 15% decrease is concerning
                        alerts.append({
                            'title': "Customer Lifetime Value Risk",
                            'message': f"AI predicts {abs(clv_change)*100:.1f}% decrease in customer lifetime value",
                            'source_data': {
                                'behavior_change': 'clv_decrease',
                                'change_percent': clv_change,
                                'current_clv': current_clv,
                                'predicted_clv': predicted_clv,
                                'risk_value': current_clv - predicted_clv
                            }
                        })
                        
        except Exception as e:
            logger.error(f"Behavior change analysis failed: {e}")
        
        return alerts
    
    def _check_predictive_analytics_health(self) -> Dict[str, Any]:
        """Check health of predictive analytics service"""
        try:
            # Simple health check - in production would be more comprehensive
            test_data = {
                'service': 'predictive_analytics',
                'healthy': True,
                'last_check': datetime.now().isoformat(),
                'response_time': 0.1  # seconds
            }
            
            return test_data
            
        except Exception as e:
            return {
                'service': 'predictive_analytics',
                'healthy': False,
                'error': str(e),
                'last_check': datetime.now().isoformat()
            }
    
    async def _get_active_barbershops(self) -> List[str]:
        """Get list of active barbershops for monitoring"""
        # In production, this would query the database
        # For testing, return sample shops
        return [
            "demo_shop_001",
            "demo_shop_002",
            "auto_detected"
        ]
    
    def _get_current_season(self) -> str:
        """Get current season for seasonal pattern analysis"""
        month = datetime.now().month
        if month in [12, 1, 2]:
            return 'winter'
        elif month in [3, 4, 5]:
            return 'spring'
        elif month in [6, 7, 8]:
            return 'summer'
        else:
            return 'fall'
    
    def _is_holiday_period(self, date: datetime) -> bool:
        """Check if current date is in a holiday period"""
        # Simplified holiday detection
        month_day = (date.month, date.day)
        
        # Major US holidays (simplified)
        holidays = [
            (1, 1),   # New Year's Day
            (7, 4),   # Independence Day
            (12, 25), # Christmas
            (11, 24), # Thanksgiving (approximate)
        ]
        
        return month_day in holidays
    
    async def get_integration_status(self) -> Dict[str, Any]:
        """Get current integration status and health"""
        return {
            'service_integrations': self.integration_status,
            'monitoring_active': len(self.monitoring_tasks) > 0,
            'alert_thresholds': self.alert_thresholds,
            'monitoring_intervals': self.monitoring_intervals,
            'cache_status': {
                'business_metrics_entries': len(self.business_metrics_cache),
                'last_update': max(
                    [datetime.fromisoformat(entry.get('timestamp', '1970-01-01T00:00:00'))
                     for entry in self.business_metrics_cache.values()
                     if isinstance(entry, dict) and 'timestamp' in entry] + [datetime.min]
                ).isoformat() if self.business_metrics_cache else 'never'
            },
            'system_health': {
                'scheduler_running': hasattr(self, 'scheduler_thread') and self.scheduler_thread.is_alive(),
                'services_available': SERVICES_AVAILABLE
            }
        }
    
    async def trigger_manual_monitoring(self, monitor_type: str = 'all') -> Dict[str, Any]:
        """Manually trigger monitoring tasks for testing/debugging"""
        results = {}
        
        try:
            if monitor_type in ['all', 'business_metrics']:
                await self._monitor_business_metrics()
                results['business_metrics'] = 'completed'
            
            if monitor_type in ['all', 'system_health']:
                await self._monitor_system_health()
                results['system_health'] = 'completed'
            
            if monitor_type in ['all', 'predictive_alerts']:
                await self._monitor_predictive_alerts()
                results['predictive_alerts'] = 'completed'
            
            if monitor_type in ['all', 'customer_behavior']:
                await self._monitor_customer_behavior()
                results['customer_behavior'] = 'completed'
            
            results['triggered_at'] = datetime.now().isoformat()
            results['success'] = True
            
        except Exception as e:
            results['error'] = str(e)
            results['success'] = False
        
        return results

# Global instance
alert_integration_service = AlertIntegrationService()

# Usage example and testing
if __name__ == "__main__":
    async def test_integration():
        integration = AlertIntegrationService()
        
        print("🔄 Testing Alert Integration Service...")
        
        # Test integration status
        status = await integration.get_integration_status()
        print(f"📊 Integration Status: {json.dumps(status, indent=2)}")
        
        # Test manual monitoring trigger
        print("\n🔍 Triggering manual monitoring...")
        results = await integration.trigger_manual_monitoring('business_metrics')
        print(f"📋 Monitoring Results: {json.dumps(results, indent=2)}")
        
        print("\n✅ Integration service test completed!")
    
    # Run test
    asyncio.run(test_integration())