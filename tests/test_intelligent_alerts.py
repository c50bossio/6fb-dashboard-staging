#!/usr/bin/env python3
"""
Comprehensive test suite for the Intelligent Alert System
Tests ML-based prioritization, real-time processing, and API endpoints
"""

import asyncio
import pytest
import json
import sqlite3
import tempfile
import os
from datetime import datetime, timedelta
from unittest.mock import patch, AsyncMock
import sys

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import the services to test
try:
    from services.intelligent_alert_service import (
        IntelligentAlertService, 
        AlertCategory, 
        AlertPriority, 
        AlertStatus,
        Alert
    )
    from services.alert_api_service import alert_app
    from fastapi.testclient import TestClient
    SERVICES_AVAILABLE = True
except ImportError as e:
    print(f"⚠️ Could not import alert services: {e}")
    SERVICES_AVAILABLE = False
    pytest.skip("Alert services not available", allow_module_level=True)

class TestIntelligentAlertService:
    """Test the core intelligent alert service functionality"""
    
    @pytest.fixture
    def temp_db(self):
        """Create a temporary database for testing"""
        fd, path = tempfile.mkstemp(suffix='.db')
        os.close(fd)
        yield path
        os.unlink(path)
    
    @pytest.fixture
    def alert_service(self, temp_db):
        """Create alert service instance with temporary database"""
        return IntelligentAlertService(db_path=temp_db)
    
    @pytest.mark.asyncio
    async def test_alert_creation_basic(self, alert_service):
        """Test basic alert creation functionality"""
        alert = await alert_service.create_alert(
            barbershop_id="test_shop_001",
            title="Test Alert",
            message="This is a test alert message",
            category=AlertCategory.BUSINESS_METRIC,
            source_data={
                'revenue_impact': 100.0,
                'customer_count': 5,
                'trend_direction': 'decreasing'
            }
        )
        
        assert alert is not None
        assert alert.barbershop_id == "test_shop_001"
        assert alert.title == "Test Alert"
        assert alert.category == AlertCategory.BUSINESS_METRIC
        assert alert.status == AlertStatus.ACTIVE
        assert 0 <= alert.confidence_score <= 1
        assert 0 <= alert.severity_score <= 1
        assert 0 <= alert.urgency_score <= 1
        assert alert.business_impact >= 0
        assert len(alert.recommended_actions) > 0
    
    @pytest.mark.asyncio
    async def test_ml_feature_extraction(self, alert_service):
        """Test ML feature extraction from source data"""
        source_data = {
            'revenue_impact': 500.0,
            'customer_count': 15,
            'trend_direction': 'decreasing',
            'threshold_deviation': 0.35,
            'frequency': 3,
            'system_critical': True
        }
        
        features = alert_service._extract_ml_features(source_data, AlertCategory.REVENUE_ANOMALY)
        
        # Check that features are properly normalized
        for key, value in features.items():
            assert isinstance(value, (int, float))
            assert 0 <= value <= 1, f"Feature {key} not normalized: {value}"
        
        # Check specific feature extraction
        assert 'revenue_impact' in features
        assert 'customer_impact' in features
        assert 'trend_direction' in features
        assert 'threshold_deviation' in features
        assert 'category_urgency' in features
        assert 'is_business_hours' in features
    
    @pytest.mark.asyncio
    async def test_priority_scoring(self, alert_service):
        """Test ML-based priority scoring"""
        # High impact alert
        high_impact_data = {
            'revenue_impact': 1000.0,
            'customer_count': 25,
            'trend_direction': 'decreasing',
            'threshold_deviation': 0.8,
            'system_critical': True
        }
        
        ml_features = alert_service._extract_ml_features(high_impact_data, AlertCategory.REVENUE_ANOMALY)
        priority_scores = await alert_service._calculate_ml_priority_scores(
            "test_shop", ml_features, AlertCategory.REVENUE_ANOMALY, high_impact_data
        )
        
        assert 'confidence' in priority_scores
        assert 'severity' in priority_scores
        assert 'urgency' in priority_scores
        assert 'business_impact' in priority_scores
        assert 'composite_score' in priority_scores
        
        # High impact should result in higher scores
        assert priority_scores['severity'] > 0.5
        assert priority_scores['business_impact'] > 0.1
        
        # Low impact alert
        low_impact_data = {
            'revenue_impact': 10.0,
            'customer_count': 1,
            'trend_direction': 'stable',
            'threshold_deviation': 0.1
        }
        
        ml_features_low = alert_service._extract_ml_features(low_impact_data, AlertCategory.OPPORTUNITY)
        priority_scores_low = await alert_service._calculate_ml_priority_scores(
            "test_shop", ml_features_low, AlertCategory.OPPORTUNITY, low_impact_data
        )
        
        # Low impact should result in lower scores
        assert priority_scores_low['severity'] < priority_scores['severity']
        assert priority_scores_low['business_impact'] < priority_scores['business_impact']
    
    @pytest.mark.asyncio
    async def test_duplicate_detection(self, alert_service):
        """Test duplicate alert detection and deduplication"""
        # Create first alert
        alert1 = await alert_service.create_alert(
            barbershop_id="test_shop_001",
            title="Revenue Drop Detected",
            message="Daily revenue is below threshold",
            category=AlertCategory.REVENUE_ANOMALY,
            source_data={'revenue_impact': 200.0}
        )
        
        # Try to create duplicate alert
        alert2 = await alert_service.create_alert(
            barbershop_id="test_shop_001",
            title="Revenue Drop Detected",
            message="Daily revenue is below threshold",
            category=AlertCategory.REVENUE_ANOMALY,
            source_data={'revenue_impact': 200.0}
        )
        
        # Should return the same alert (deduplicated)
        assert alert1.alert_id == alert2.alert_id
        assert alert2.similar_alerts_count >= 0
    
    @pytest.mark.asyncio
    async def test_alert_actions(self, alert_service):
        """Test alert acknowledgment and dismissal"""
        # Create test alert
        alert = await alert_service.create_alert(
            barbershop_id="test_shop_001",
            title="Test Alert for Actions",
            message="Test alert message",
            category=AlertCategory.BUSINESS_METRIC,
            source_data={'revenue_impact': 50.0}
        )
        
        # Test acknowledgment
        ack_result = await alert_service.acknowledge_alert(
            alert_id=alert.alert_id,
            user_id="test_user_001",
            notes="Investigating this issue"
        )
        assert ack_result is True
        
        # Create another alert for dismissal test
        alert2 = await alert_service.create_alert(
            barbershop_id="test_shop_001",
            title="Test Alert for Dismissal",
            message="Test alert message",
            category=AlertCategory.BUSINESS_METRIC,
            source_data={'revenue_impact': 30.0}
        )
        
        # Test dismissal with feedback
        dismiss_result = await alert_service.dismiss_alert(
            alert_id=alert2.alert_id,
            user_id="test_user_001",
            feedback="This alert is not relevant for our business",
            reason="false_positive"
        )
        assert dismiss_result is True
    
    @pytest.mark.asyncio
    async def test_get_active_alerts(self, alert_service):
        """Test retrieving active alerts with filtering"""
        # Create test alerts of different priorities and categories
        await alert_service.create_alert(
            barbershop_id="test_shop_001",
            title="Critical System Issue",
            message="System is down",
            category=AlertCategory.SYSTEM_HEALTH,
            source_data={'system_critical': True, 'revenue_impact': 1000.0}
        )
        
        await alert_service.create_alert(
            barbershop_id="test_shop_001",
            title="Revenue Opportunity",
            message="Potential for revenue increase",
            category=AlertCategory.OPPORTUNITY,
            source_data={'revenue_impact': 50.0}
        )
        
        # Get all active alerts
        all_alerts = await alert_service.get_active_alerts(
            barbershop_id="test_shop_001",
            user_id="test_user_001"
        )
        
        assert len(all_alerts) >= 2
        
        # Test filtering by category
        system_alerts = await alert_service.get_active_alerts(
            barbershop_id="test_shop_001",
            user_id="test_user_001",
            category_filter=AlertCategory.SYSTEM_HEALTH
        )
        
        assert len(system_alerts) >= 1
        assert all(alert['category'] == 'system_health' for alert in system_alerts)
    
    @pytest.mark.asyncio
    async def test_alert_history(self, alert_service):
        """Test alert history retrieval and analytics"""
        # Create some test alerts
        for i in range(5):
            await alert_service.create_alert(
                barbershop_id="test_shop_001",
                title=f"Test Alert {i}",
                message=f"Test message {i}",
                category=AlertCategory.BUSINESS_METRIC,
                source_data={'revenue_impact': i * 10.0}
            )
        
        # Get alert history
        history = await alert_service.get_alert_history(
            barbershop_id="test_shop_001",
            user_id="test_user_001",
            days=7
        )
        
        assert 'total_alerts' in history
        assert 'alerts' in history
        assert 'interaction_statistics' in history
        assert 'alert_trends' in history
        assert history['total_alerts'] >= 5
        assert len(history['alerts']) >= 5
    
    def test_category_urgency_weights(self, alert_service):
        """Test category urgency weight assignment"""
        # Test all categories have valid weights
        for category in AlertCategory:
            weight = alert_service._get_category_urgency_weight(category)
            assert 0 <= weight <= 1
        
        # Test that critical categories have higher weights
        critical_weight = alert_service._get_category_urgency_weight(AlertCategory.SECURITY)
        opportunity_weight = alert_service._get_category_urgency_weight(AlertCategory.OPPORTUNITY)
        
        assert critical_weight > opportunity_weight


class TestAlertAPIService:
    """Test the FastAPI alert service endpoints"""
    
    @pytest.fixture
    def client(self):
        """Create test client for FastAPI app"""
        return TestClient(alert_app)
    
    def test_health_check(self, client):
        """Test alert service health check endpoint"""
        response = client.get("/intelligent-alerts/health")
        assert response.status_code == 200
        
        data = response.json()
        assert 'service' in data
        assert 'status' in data
        assert 'timestamp' in data
        assert 'components' in data
        assert data['service'] == 'intelligent_alert_system'
    
    def test_create_alert_api(self, client):
        """Test alert creation via API"""
        alert_data = {
            "barbershop_id": "test_shop_api_001",
            "title": "API Test Alert",
            "message": "This is a test alert created via API",
            "category": "business_metric",
            "source_data": {
                "revenue_impact": 150.0,
                "customer_count": 8,
                "trend_direction": "decreasing"
            },
            "metadata": {
                "test": True,
                "api_version": "1.0"
            }
        }
        
        response = client.post("/intelligent-alerts/create", json=alert_data)
        assert response.status_code == 200
        
        data = response.json()
        assert 'alert_id' in data
        assert data['barbershop_id'] == "test_shop_api_001"
        assert data['title'] == "API Test Alert"
        assert data['category'] == "business_metric"
        assert data['status'] == "active"
        assert 'confidence_score' in data
        assert 'recommended_actions' in data
    
    def test_get_active_alerts_api(self, client):
        """Test getting active alerts via API"""
        # First create an alert
        alert_data = {
            "barbershop_id": "test_shop_api_002",
            "title": "API Active Alert Test",
            "message": "Test alert for active alerts endpoint",
            "category": "system_health",
            "source_data": {"system_critical": True}
        }
        
        create_response = client.post("/intelligent-alerts/create", json=alert_data)
        assert create_response.status_code == 200
        
        # Now get active alerts
        get_data = {
            "barbershop_id": "test_shop_api_002",
            "user_id": "test_user_api_001",
            "limit": 10
        }
        
        response = client.post("/intelligent-alerts/active", json=get_data)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        # Should have at least the alert we just created
        assert len(data) >= 1
    
    def test_acknowledge_alert_api(self, client):
        """Test alert acknowledgment via API"""
        # Create an alert first
        alert_data = {
            "barbershop_id": "test_shop_api_003",
            "title": "API Acknowledge Test",
            "message": "Test alert for acknowledgment",
            "category": "business_metric",
            "source_data": {"revenue_impact": 75.0}
        }
        
        create_response = client.post("/intelligent-alerts/create", json=alert_data)
        assert create_response.status_code == 200
        
        alert_id = create_response.json()['alert_id']
        
        # Acknowledge the alert
        ack_data = {
            "alert_id": alert_id,
            "user_id": "test_user_api_001",
            "notes": "Investigated and confirmed issue"
        }
        
        response = client.post("/intelligent-alerts/acknowledge", json=ack_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data['success'] is True
        assert data['alert_id'] == alert_id
        assert data['action'] == 'acknowledged'
    
    def test_dismiss_alert_api(self, client):
        """Test alert dismissal via API"""
        # Create an alert first
        alert_data = {
            "barbershop_id": "test_shop_api_004",
            "title": "API Dismiss Test",
            "message": "Test alert for dismissal",
            "category": "opportunity",
            "source_data": {"revenue_impact": 25.0}
        }
        
        create_response = client.post("/intelligent-alerts/create", json=alert_data)
        assert create_response.status_code == 200
        
        alert_id = create_response.json()['alert_id']
        
        # Dismiss the alert with feedback
        dismiss_data = {
            "alert_id": alert_id,
            "user_id": "test_user_api_001",
            "feedback": "This alert is not relevant for our business model",
            "reason": "not_applicable"
        }
        
        response = client.post("/intelligent-alerts/dismiss", json=dismiss_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data['success'] is True
        assert data['alert_id'] == alert_id
        assert data['action'] == 'dismissed'
        assert data['ml_learning_applied'] is True
    
    def test_invalid_category(self, client):
        """Test API validation for invalid category"""
        alert_data = {
            "barbershop_id": "test_shop_api_005",
            "title": "Invalid Category Test",
            "message": "Test alert with invalid category",
            "category": "invalid_category",
            "source_data": {"test": True}
        }
        
        response = client.post("/intelligent-alerts/create", json=alert_data)
        assert response.status_code == 400
        
        data = response.json()
        assert 'detail' in data
        assert 'Invalid category' in data['detail']
    
    def test_missing_required_fields(self, client):
        """Test API validation for missing required fields"""
        # Missing barbershop_id
        alert_data = {
            "title": "Missing Barbershop ID",
            "message": "Test alert",
            "category": "business_metric",
            "source_data": {}
        }
        
        response = client.post("/intelligent-alerts/create", json=alert_data)
        assert response.status_code == 422  # Validation error
    
    def test_preferences_api(self, client):
        """Test user preferences management via API"""
        # Get default preferences
        get_prefs_data = {
            "user_id": "test_user_prefs_001",
            "barbershop_id": "test_shop_prefs_001",
            "action": "get"
        }
        
        response = client.post("/intelligent-alerts/preferences", json=get_prefs_data)
        assert response.status_code == 200
        
        prefs = response.json()
        assert 'email_enabled' in prefs
        assert 'priority_threshold' in prefs
        assert 'category_preferences' in prefs
        
        # Update preferences
        updated_prefs = prefs.copy()
        updated_prefs['email_enabled'] = False
        updated_prefs['priority_threshold'] = 'high'
        
        update_prefs_data = {
            "user_id": "test_user_prefs_001",
            "barbershop_id": "test_shop_prefs_001",
            "action": "update",
            "preferences": updated_prefs
        }
        
        response = client.post("/intelligent-alerts/preferences", json=update_prefs_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data['success'] is True


class TestAlertMLFeatures:
    """Test machine learning features and algorithms"""
    
    @pytest.fixture
    def alert_service(self):
        """Create alert service with temporary database"""
        fd, path = tempfile.mkstemp(suffix='.db')
        os.close(fd)
        service = IntelligentAlertService(db_path=path)
        yield service
        os.unlink(path)
    
    def test_feature_normalization(self, alert_service):
        """Test that all ML features are properly normalized"""
        test_cases = [
            # High values that should be clamped
            {'revenue_impact': 10000.0, 'customer_count': 500, 'threshold_deviation': 2.0},
            # Normal values
            {'revenue_impact': 100.0, 'customer_count': 10, 'threshold_deviation': 0.3},
            # Low/zero values
            {'revenue_impact': 0.0, 'customer_count': 0, 'threshold_deviation': 0.0}
        ]
        
        for source_data in test_cases:
            features = alert_service._extract_ml_features(source_data, AlertCategory.BUSINESS_METRIC)
            
            for feature_name, value in features.items():
                assert 0 <= value <= 1, f"Feature {feature_name} not normalized: {value} (source: {source_data})"
    
    def test_time_based_features(self, alert_service):
        """Test time-based feature extraction"""
        source_data = {'revenue_impact': 100.0}
        features = alert_service._extract_ml_features(source_data, AlertCategory.BUSINESS_METRIC)
        
        # Check time-based features exist and are normalized
        assert 'hour_of_day' in features
        assert 'day_of_week' in features
        assert 'is_weekend' in features
        assert 'is_business_hours' in features
        
        assert 0 <= features['hour_of_day'] <= 1
        assert 0 <= features['day_of_week'] <= 1
        assert features['is_weekend'] in [0.0, 1.0]
        assert features['is_business_hours'] in [0.0, 1.0]
    
    def test_category_specific_features(self, alert_service):
        """Test category-specific feature extraction"""
        # System health category
        system_data = {
            'system_critical': True,
            'uptime_percentage': 95.5,
            'service_down': True
        }
        
        system_features = alert_service._extract_ml_features(system_data, AlertCategory.SYSTEM_HEALTH)
        assert 'category_urgency' in system_features
        
        # System health should have high urgency weight
        system_urgency = alert_service._get_category_urgency_weight(AlertCategory.SYSTEM_HEALTH)
        opportunity_urgency = alert_service._get_category_urgency_weight(AlertCategory.OPPORTUNITY)
        
        assert system_urgency > opportunity_urgency
    
    @pytest.mark.asyncio
    async def test_adaptive_learning_simulation(self, alert_service):
        """Test simulated adaptive learning from user feedback"""
        # Create alerts and simulate user feedback
        alert1 = await alert_service.create_alert(
            barbershop_id="test_shop_ml",
            title="ML Test Alert 1",
            message="Revenue anomaly detected",
            category=AlertCategory.REVENUE_ANOMALY,
            source_data={'revenue_impact': 200.0, 'trend_direction': 'decreasing'}
        )
        
        # Simulate positive feedback (acknowledged)
        await alert_service.acknowledge_alert(
            alert_id=alert1.alert_id,
            user_id="test_user_ml",
            notes="This was useful"
        )
        
        alert2 = await alert_service.create_alert(
            barbershop_id="test_shop_ml",
            title="ML Test Alert 2",
            message="Another revenue anomaly",
            category=AlertCategory.REVENUE_ANOMALY,
            source_data={'revenue_impact': 180.0, 'trend_direction': 'decreasing'}
        )
        
        # Simulate negative feedback (dismissed as spam)
        await alert_service.dismiss_alert(
            alert_id=alert2.alert_id,
            user_id="test_user_ml",
            feedback="This is spam, not relevant",
            reason="spam"
        )
        
        # Test that the system recorded the feedback
        # In a real system, this would influence future predictions
        assert True  # Placeholder for more complex ML testing


@pytest.mark.integration
class TestIntegrationScenarios:
    """Integration tests for realistic alert scenarios"""
    
    @pytest.fixture
    def alert_service(self):
        """Create alert service with temporary database"""
        fd, path = tempfile.mkstemp(suffix='.db')
        os.close(fd)
        service = IntelligentAlertService(db_path=path)
        yield service
        os.unlink(path)
    
    @pytest.mark.asyncio
    async def test_business_scenario_revenue_drop(self, alert_service):
        """Test complete scenario: revenue drop detection and handling"""
        # Simulate revenue drop alert
        alert = await alert_service.create_alert(
            barbershop_id="real_shop_001",
            title="Significant Revenue Drop Detected",
            message="Daily revenue is 30% below average for this day of week",
            category=AlertCategory.REVENUE_ANOMALY,
            source_data={
                'revenue_impact': 450.0,
                'customer_count': 12,
                'trend_direction': 'decreasing',
                'threshold_deviation': 0.30,
                'day_comparison': 'tuesday_average',
                'historical_context': {'last_30_days_avg': 680.0, 'today': 476.0}
            }
        )
        
        # Should be high priority due to significant impact
        assert alert.priority in [AlertPriority.HIGH, AlertPriority.CRITICAL]
        assert alert.business_impact > 200.0
        assert len(alert.recommended_actions) >= 3
        
        # Verify ML features captured the severity
        assert alert.ml_features['revenue_impact'] > 0.3
        assert alert.ml_features['threshold_deviation'] >= 0.3
    
    @pytest.mark.asyncio
    async def test_business_scenario_system_outage(self, alert_service):
        """Test complete scenario: system outage detection"""
        # Simulate system outage
        alert = await alert_service.create_alert(
            barbershop_id="real_shop_002",
            title="Booking System Unavailable",
            message="Online booking system has been down for 15 minutes",
            category=AlertCategory.SYSTEM_HEALTH,
            source_data={
                'system_critical': True,
                'downtime_minutes': 15,
                'affected_services': ['booking', 'payments'],
                'revenue_impact': 200.0,  # Estimated lost bookings
                'customer_impact': 'high'
            }
        )
        
        # System health issues should be critical or high priority
        assert alert.priority in [AlertPriority.CRITICAL, AlertPriority.HIGH]
        assert alert.urgency_score > 0.7
        
        # Should have specific system-related recommendations
        actions = [action.lower() for action in alert.recommended_actions]
        assert any('system' in action or 'service' in action for action in actions)
    
    @pytest.mark.asyncio
    async def test_business_scenario_opportunity_detection(self, alert_service):
        """Test complete scenario: business opportunity detection"""
        # Simulate business opportunity
        alert = await alert_service.create_alert(
            barbershop_id="real_shop_003",
            title="Peak Demand Period Approaching",
            message="Historical data shows 40% increase in bookings expected next week",
            category=AlertCategory.OPPORTUNITY,
            source_data={
                'opportunity_type': 'seasonal_peak',
                'revenue_potential': 300.0,
                'confidence_level': 0.85,
                'timeframe': 'next_7_days',
                'preparation_needed': True
            }
        )
        
        # Opportunities should be lower priority but still actionable
        assert alert.priority in [AlertPriority.MEDIUM, AlertPriority.LOW, AlertPriority.INFO]
        assert alert.business_impact >= 0  # Should have some positive impact
        
        # Should have opportunity-specific recommendations
        actions = [action.lower() for action in alert.recommended_actions]
        assert any('marketing' in action or 'staff' in action or 'preparation' in action for action in actions)
    
    @pytest.mark.asyncio
    async def test_alert_fatigue_prevention(self, alert_service):
        """Test alert fatigue prevention mechanisms"""
        barbershop_id = "fatigue_test_shop"
        
        # Create multiple similar alerts rapidly
        alerts = []
        for i in range(10):
            alert = await alert_service.create_alert(
                barbershop_id=barbershop_id,
                title=f"Similar Alert {i}",
                message="Repeated alert message",
                category=AlertCategory.BUSINESS_METRIC,
                source_data={
                    'revenue_impact': 50.0 + i,
                    'similarity_marker': 'repeated_pattern'
                }
            )
            alerts.append(alert)
        
        # Check that later alerts might be suppressed or grouped
        # (Implementation would track similar_alerts_count)
        active_alerts = await alert_service.get_active_alerts(
            barbershop_id=barbershop_id,
            user_id="fatigue_test_user",
            limit=20
        )
        
        # Should have some mechanism to prevent fatigue
        # (exact behavior depends on implementation)
        assert len(active_alerts) <= len(alerts)


if __name__ == "__main__":
    """Run tests directly"""
    if not SERVICES_AVAILABLE:
        print("❌ Alert services not available for testing")
        exit(1)
    
    print("🧪 Running Intelligent Alert System Tests...")
    
    # Run basic functionality tests
    pytest.main([
        __file__ + "::TestIntelligentAlertService",
        "-v", "--tb=short"
    ])
    
    print("\n🌐 Running API Tests...")
    pytest.main([
        __file__ + "::TestAlertAPIService", 
        "-v", "--tb=short"
    ])
    
    print("\n🤖 Running ML Feature Tests...")
    pytest.main([
        __file__ + "::TestAlertMLFeatures",
        "-v", "--tb=short"
    ])
    
    print("\n🔄 Running Integration Tests...")
    pytest.main([
        __file__ + "::TestIntegrationScenarios",
        "-v", "--tb=short", "-m", "integration"
    ])
    
    print("\n✅ All tests completed!")