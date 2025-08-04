#!/usr/bin/env python3
"""
Intelligent Alert System with ML-based Prioritization
Advanced alert management with machine learning, adaptive learning, and real-time processing
"""

import asyncio
import json
import sqlite3
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple, Set
from dataclasses import dataclass, asdict
import statistics
import math
import hashlib
from enum import Enum

# ML and data processing
try:
    import numpy as np
    from sklearn.ensemble import RandomForestClassifier, IsolationForest
    from sklearn.preprocessing import StandardScaler
    from sklearn.cluster import DBSCAN
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False

# AI integration
try:
    from .ai_orchestrator_service import ai_orchestrator
    from .realtime_service import realtime_service
    from .predictive_analytics_service import predictive_analytics_service
    AI_INTEGRATION_AVAILABLE = True
except ImportError:
    AI_INTEGRATION_AVAILABLE = False

logger = logging.getLogger(__name__)

class AlertPriority(Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"

class AlertCategory(Enum):
    BUSINESS_METRIC = "business_metric"
    SYSTEM_HEALTH = "system_health"
    CUSTOMER_BEHAVIOR = "customer_behavior"
    REVENUE_ANOMALY = "revenue_anomaly"
    OPERATIONAL_ISSUE = "operational_issue"
    OPPORTUNITY = "opportunity"
    COMPLIANCE = "compliance"
    SECURITY = "security"

class AlertStatus(Enum):
    ACTIVE = "active"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"
    DISMISSED = "dismissed"
    SNOOZED = "snoozed"

@dataclass
class Alert:
    """Intelligent alert with ML-based prioritization"""
    alert_id: str
    barbershop_id: str
    title: str
    message: str
    category: AlertCategory
    priority: AlertPriority
    confidence_score: float  # 0.0 to 1.0
    severity_score: float    # 0.0 to 1.0
    urgency_score: float     # 0.0 to 1.0
    business_impact: float   # Estimated financial impact
    status: AlertStatus
    created_at: str
    updated_at: str
    expires_at: Optional[str]
    metadata: Dict[str, Any]
    source_data: Dict[str, Any]
    recommended_actions: List[str]
    similar_alerts_count: int
    user_interactions: List[Dict[str, Any]]
    ml_features: Dict[str, float]

@dataclass
class AlertRule:
    """Dynamic alert rule configuration"""
    rule_id: str
    barbershop_id: str
    name: str
    category: AlertCategory
    conditions: Dict[str, Any]
    threshold_config: Dict[str, Any]
    enabled: bool
    priority_weight: float
    last_triggered: Optional[str]
    trigger_count: int
    user_feedback_score: float  # User rating of alert usefulness
    created_at: str
    updated_at: str

@dataclass
class UserAlertPreferences:
    """User-specific alert configuration"""
    user_id: str
    barbershop_id: str
    email_enabled: bool
    sms_enabled: bool
    push_enabled: bool
    priority_threshold: AlertPriority
    quiet_hours_start: str
    quiet_hours_end: str
    category_preferences: Dict[str, bool]
    frequency_limits: Dict[str, int]  # Max alerts per category per day
    learning_preferences: Dict[str, Any]
    updated_at: str

class IntelligentAlertService:
    """ML-powered intelligent alert system with adaptive learning"""
    
    def __init__(self, db_path: str = "data/intelligent_alerts.db"):
        self.db_path = db_path
        self.ml_models = {}
        self.feature_scaler = StandardScaler() if SKLEARN_AVAILABLE else None
        self.alert_cache = {}
        self.user_interactions = {}
        self.clustering_model = None
        self.anomaly_detector = None
        
        # Alert fatigue prevention
        self.alert_frequency_tracker = {}
        self.user_feedback_history = {}
        
        # Real-time processing
        self.processing_queue = asyncio.Queue()
        self.batch_processor_task = None
        
        self._init_database()
        self._init_ml_models()
        self._start_background_processing()
    
    def _init_database(self):
        """Initialize intelligent alerts database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Alerts table with ML features
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS alerts (
                alert_id TEXT PRIMARY KEY,
                barbershop_id TEXT,
                title TEXT,
                message TEXT,
                category TEXT,
                priority TEXT,
                confidence_score REAL,
                severity_score REAL,
                urgency_score REAL,
                business_impact REAL,
                status TEXT,
                created_at TEXT,
                updated_at TEXT,
                expires_at TEXT,
                metadata TEXT,  -- JSON
                source_data TEXT,  -- JSON
                recommended_actions TEXT,  -- JSON
                similar_alerts_count INTEGER DEFAULT 0,
                user_interactions TEXT,  -- JSON
                ml_features TEXT,  -- JSON
                INDEX(barbershop_id, created_at),
                INDEX(status, priority),
                INDEX(category, created_at)
            )
        ''')
        
        # Alert rules
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS alert_rules (
                rule_id TEXT PRIMARY KEY,
                barbershop_id TEXT,
                name TEXT,
                category TEXT,
                conditions TEXT,  -- JSON
                threshold_config TEXT,  -- JSON
                enabled BOOLEAN DEFAULT TRUE,
                priority_weight REAL DEFAULT 1.0,
                last_triggered TEXT,
                trigger_count INTEGER DEFAULT 0,
                user_feedback_score REAL DEFAULT 0.5,
                created_at TEXT,
                updated_at TEXT,
                INDEX(barbershop_id, enabled),
                INDEX(category, enabled)
            )
        ''')
        
        # User preferences
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS user_alert_preferences (
                user_id TEXT,
                barbershop_id TEXT,
                email_enabled BOOLEAN DEFAULT TRUE,
                sms_enabled BOOLEAN DEFAULT FALSE,
                push_enabled BOOLEAN DEFAULT TRUE,
                priority_threshold TEXT DEFAULT 'medium',
                quiet_hours_start TEXT DEFAULT '22:00',
                quiet_hours_end TEXT DEFAULT '08:00',
                category_preferences TEXT,  -- JSON
                frequency_limits TEXT,  -- JSON
                learning_preferences TEXT,  -- JSON
                updated_at TEXT,
                PRIMARY KEY(user_id, barbershop_id)
            )
        ''')
        
        # Alert interactions and feedback
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS alert_interactions (
                interaction_id TEXT PRIMARY KEY,
                alert_id TEXT,
                user_id TEXT,
                interaction_type TEXT,  -- viewed, acknowledged, dismissed, rated
                interaction_data TEXT,  -- JSON
                timestamp TEXT,
                response_time REAL,  -- seconds to respond
                INDEX(alert_id),
                INDEX(user_id, timestamp)
            )
        ''')
        
        # ML training data
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS alert_ml_training (
                training_id TEXT PRIMARY KEY,
                barbershop_id TEXT,
                alert_features TEXT,  -- JSON
                user_response TEXT,  -- useful, spam, ignored
                feedback_score REAL,
                created_at TEXT,
                INDEX(barbershop_id, created_at)
            )
        ''')
        
        # Alert clustering and patterns
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS alert_patterns (
                pattern_id TEXT PRIMARY KEY,
                barbershop_id TEXT,
                pattern_type TEXT,  -- cluster, anomaly, trend
                pattern_data TEXT,  -- JSON
                alerts_in_pattern TEXT,  -- JSON array of alert_ids
                significance_score REAL,
                identified_at TEXT,
                INDEX(barbershop_id, pattern_type)
            )
        ''')
        
        conn.commit()
        conn.close()
        logger.info("✅ Intelligent alerts database initialized")
    
    def _init_ml_models(self):
        """Initialize machine learning models for alert prioritization"""
        if not SKLEARN_AVAILABLE:
            logger.warning("⚠️ Scikit-learn not available, using rule-based prioritization")
            return
        
        try:
            # Priority classification model
            self.ml_models['priority_classifier'] = RandomForestClassifier(
                n_estimators=100,
                max_depth=10,
                random_state=42,
                class_weight='balanced'
            )
            
            # Alert clustering for grouping similar alerts
            self.clustering_model = DBSCAN(eps=0.3, min_samples=2)
            
            # Anomaly detection for unusual alerts
            self.anomaly_detector = IsolationForest(
                contamination=0.1,
                random_state=42
            )
            
            # Load any existing trained models
            self._load_trained_models()
            
            logger.info("✅ Intelligent alert ML models initialized")
            
        except Exception as e:
            logger.error(f"ML model initialization failed: {e}")
    
    def _start_background_processing(self):
        """Start background task for real-time alert processing"""
        if self.batch_processor_task is None:
            self.batch_processor_task = asyncio.create_task(self._batch_processor())
            logger.info("✅ Background alert processing started")
    
    async def _batch_processor(self):
        """Background processor for batching and optimizing alerts"""
        while True:
            try:
                # Process alerts in batches every 30 seconds
                await asyncio.sleep(30)
                
                # Check for alert clustering opportunities
                await self._detect_alert_clusters()
                
                # Update ML models with new feedback
                await self._update_ml_models_with_feedback()
                
                # Clean up expired alerts
                await self._cleanup_expired_alerts()
                
                # Generate alert summary insights
                await self._generate_alert_insights()
                
            except Exception as e:
                logger.error(f"Batch processor error: {e}")
                await asyncio.sleep(60)  # Wait longer on error
    
    async def create_alert(self, barbershop_id: str, title: str, message: str, 
                          category: AlertCategory, source_data: Dict[str, Any],
                          metadata: Optional[Dict[str, Any]] = None) -> Alert:
        """Create and prioritize a new intelligent alert"""
        try:
            # Generate alert ID
            alert_id = self._generate_alert_id(barbershop_id, title, source_data)
            
            # Check for duplicate alerts (deduplication)
            if await self._is_duplicate_alert(alert_id, barbershop_id):
                existing_alert = await self._get_similar_alert(alert_id, barbershop_id)
                if existing_alert:
                    await self._increment_similar_alert_count(existing_alert.alert_id)
                    return existing_alert
            
            # Extract ML features from source data
            ml_features = self._extract_ml_features(source_data, category)
            
            # Calculate priority scores using ML
            priority_scores = await self._calculate_ml_priority_scores(
                barbershop_id, ml_features, category, source_data
            )
            
            # Determine final priority
            priority = self._determine_priority(priority_scores)
            
            # Generate recommended actions
            recommended_actions = await self._generate_recommended_actions(
                category, source_data, priority_scores
            )
            
            # Create alert object
            alert = Alert(
                alert_id=alert_id,
                barbershop_id=barbershop_id,
                title=title,
                message=message,
                category=category,
                priority=priority,
                confidence_score=priority_scores['confidence'],
                severity_score=priority_scores['severity'],
                urgency_score=priority_scores['urgency'],
                business_impact=priority_scores['business_impact'],
                status=AlertStatus.ACTIVE,
                created_at=datetime.now().isoformat(),
                updated_at=datetime.now().isoformat(),
                expires_at=self._calculate_expiry_time(priority, category),
                metadata=metadata or {},
                source_data=source_data,
                recommended_actions=recommended_actions,
                similar_alerts_count=0,
                user_interactions=[],
                ml_features=ml_features
            )
            
            # Store alert in database
            await self._store_alert(alert)
            
            # Check alert fatigue and frequency limits
            if await self._should_suppress_alert(alert):
                alert.status = AlertStatus.DISMISSED
                await self._update_alert_status(alert_id, AlertStatus.DISMISSED, "Auto-suppressed: frequency limit")
                logger.info(f"🔕 Alert {alert_id} auto-suppressed due to frequency limits")
                return alert
            
            # Send real-time notification
            await self._send_realtime_alert(alert)
            
            # Queue for ML pattern analysis
            await self.processing_queue.put(alert)
            
            logger.info(f"✅ Created intelligent alert: {alert_id} ({priority.value})")
            return alert
            
        except Exception as e:
            logger.error(f"Alert creation failed: {e}")
            raise
    
    def _extract_ml_features(self, source_data: Dict[str, Any], category: AlertCategory) -> Dict[str, float]:
        """Extract ML features from source data for prioritization"""
        features = {}
        
        try:
            # Time-based features
            current_time = datetime.now()
            features['hour_of_day'] = current_time.hour / 24.0
            features['day_of_week'] = current_time.weekday() / 6.0
            features['is_weekend'] = 1.0 if current_time.weekday() >= 5 else 0.0
            features['is_business_hours'] = 1.0 if 9 <= current_time.hour <= 17 else 0.0
            
            # Category-specific features
            features['category_urgency'] = self._get_category_urgency_weight(category)
            
            # Business context features
            if 'revenue_impact' in source_data:
                features['revenue_impact'] = min(float(source_data['revenue_impact']) / 1000.0, 1.0)
            
            if 'customer_count' in source_data:
                features['customer_impact'] = min(float(source_data['customer_count']) / 100.0, 1.0)
            
            if 'trend_direction' in source_data:
                trend_map = {'increasing': 1.0, 'decreasing': -1.0, 'stable': 0.0}
                features['trend_direction'] = trend_map.get(source_data['trend_direction'], 0.0)
            
            # Frequency features
            if 'frequency' in source_data:
                features['event_frequency'] = min(float(source_data['frequency']) / 10.0, 1.0)
            
            # Threshold deviation features
            if 'threshold_deviation' in source_data:
                features['threshold_deviation'] = min(float(source_data['threshold_deviation']), 1.0)
            
            # Historical context
            features['similar_alerts_24h'] = self._count_similar_alerts_recent(source_data, 24)
            features['alert_frequency_score'] = self._calculate_frequency_score(source_data)
            
            # System health features
            if category == AlertCategory.SYSTEM_HEALTH:
                features['system_critical'] = 1.0 if source_data.get('system_critical') else 0.0
                features['service_uptime'] = float(source_data.get('uptime_percentage', 100)) / 100.0
            
            # Ensure all features are normalized
            for key, value in features.items():
                if not isinstance(value, (int, float)):
                    features[key] = 0.0
                else:
                    features[key] = max(0.0, min(1.0, float(value)))
            
        except Exception as e:
            logger.error(f"Feature extraction failed: {e}")
            # Return default features
            features = {
                'hour_of_day': 0.5,
                'day_of_week': 0.5,
                'is_weekend': 0.0,
                'is_business_hours': 1.0,
                'category_urgency': 0.5,
                'revenue_impact': 0.0,
                'customer_impact': 0.0,
                'trend_direction': 0.0,
                'event_frequency': 0.0,
                'threshold_deviation': 0.0,
                'similar_alerts_24h': 0.0,
                'alert_frequency_score': 0.0
            }
        
        return features
    
    async def _calculate_ml_priority_scores(self, barbershop_id: str, ml_features: Dict[str, float], 
                                          category: AlertCategory, source_data: Dict[str, Any]) -> Dict[str, float]:
        """Calculate priority scores using machine learning models"""
        try:
            # Base scores from business rules
            base_scores = self._calculate_rule_based_scores(ml_features, category, source_data)
            
            if SKLEARN_AVAILABLE and len(self.ml_models) > 0:
                # Use ML model if available and trained
                ml_scores = await self._apply_ml_scoring(barbershop_id, ml_features)
                
                # Combine rule-based and ML scores
                confidence = 0.7 * base_scores['confidence'] + 0.3 * ml_scores.get('confidence', 0.5)
                severity = 0.6 * base_scores['severity'] + 0.4 * ml_scores.get('severity', 0.5)
                urgency = 0.6 * base_scores['urgency'] + 0.4 * ml_scores.get('urgency', 0.5)
                business_impact = 0.5 * base_scores['business_impact'] + 0.5 * ml_scores.get('business_impact', 0.5)
            else:
                # Fall back to rule-based scoring
                confidence = base_scores['confidence']
                severity = base_scores['severity']
                urgency = base_scores['urgency']
                business_impact = base_scores['business_impact']
            
            # Apply user feedback adjustments
            feedback_adjustment = await self._get_user_feedback_adjustment(barbershop_id, category)
            
            return {
                'confidence': max(0.0, min(1.0, confidence * feedback_adjustment)),
                'severity': max(0.0, min(1.0, severity * feedback_adjustment)),
                'urgency': max(0.0, min(1.0, urgency * feedback_adjustment)),
                'business_impact': max(0.0, min(1.0, business_impact)),
                'composite_score': (confidence + severity + urgency + business_impact) / 4.0
            }
            
        except Exception as e:
            logger.error(f"ML priority scoring failed: {e}")
            return {
                'confidence': 0.5,
                'severity': 0.5,
                'urgency': 0.5,
                'business_impact': 0.0,
                'composite_score': 0.5
            }
    
    def _calculate_rule_based_scores(self, ml_features: Dict[str, float], 
                                   category: AlertCategory, source_data: Dict[str, Any]) -> Dict[str, float]:
        """Calculate base priority scores using business rules"""
        
        # Category-based base scores
        category_scores = {
            AlertCategory.CRITICAL: {'severity': 0.9, 'urgency': 0.9},
            AlertCategory.REVENUE_ANOMALY: {'severity': 0.8, 'urgency': 0.7},
            AlertCategory.SYSTEM_HEALTH: {'severity': 0.7, 'urgency': 0.8},
            AlertCategory.CUSTOMER_BEHAVIOR: {'severity': 0.6, 'urgency': 0.5},
            AlertCategory.OPPORTUNITY: {'severity': 0.4, 'urgency': 0.3},
            AlertCategory.BUSINESS_METRIC: {'severity': 0.5, 'urgency': 0.4}
        }
        
        base = category_scores.get(category, {'severity': 0.5, 'urgency': 0.5})
        
        # Time-based urgency adjustments
        urgency_modifier = 1.0
        if ml_features.get('is_business_hours', 0) > 0.5:
            urgency_modifier *= 1.2
        if ml_features.get('is_weekend', 0) < 0.5:  # Weekday
            urgency_modifier *= 1.1
        
        # Business impact calculations
        business_impact = 0.0
        if 'revenue_impact' in ml_features:
            business_impact += ml_features['revenue_impact'] * 0.4
        if 'customer_impact' in ml_features:
            business_impact += ml_features['customer_impact'] * 0.3
        if 'threshold_deviation' in ml_features:
            business_impact += ml_features['threshold_deviation'] * 0.3
        
        # Confidence based on data quality and completeness
        confidence = 0.7  # Base confidence
        if len(source_data) > 5:  # Rich data
            confidence += 0.2
        if ml_features.get('similar_alerts_24h', 0) == 0:  # Unique alert
            confidence += 0.1
        
        return {
            'confidence': min(1.0, confidence),
            'severity': min(1.0, base['severity'] + business_impact * 0.2),
            'urgency': min(1.0, base['urgency'] * urgency_modifier),
            'business_impact': business_impact
        }
    
    async def _apply_ml_scoring(self, barbershop_id: str, ml_features: Dict[str, float]) -> Dict[str, float]:
        """Apply trained ML models for priority scoring"""
        try:
            if 'priority_classifier' not in self.ml_models:
                return {}
            
            # Prepare features for ML model
            feature_vector = [ml_features.get(key, 0.0) for key in sorted(ml_features.keys())]
            
            if self.feature_scaler:
                feature_vector = self.feature_scaler.transform([feature_vector])[0]
            
            # Get ML predictions (probability scores)
            model = self.ml_models['priority_classifier']
            
            # For trained model, predict probabilities for each priority class
            if hasattr(model, 'predict_proba'):
                proba = model.predict_proba([feature_vector])[0]
                
                # Map probabilities to priority scores
                return {
                    'confidence': float(np.max(proba)),
                    'severity': float(proba[min(2, len(proba)-1)]),  # Assume high priority class
                    'urgency': float(proba[min(1, len(proba)-1)]),   # Assume medium priority class
                    'business_impact': float(ml_features.get('revenue_impact', 0) + ml_features.get('customer_impact', 0)) / 2.0
                }
            
        except Exception as e:
            logger.error(f"ML scoring application failed: {e}")
        
        return {}
    
    def _determine_priority(self, priority_scores: Dict[str, float]) -> AlertPriority:
        """Determine final alert priority from ML scores"""
        composite_score = priority_scores.get('composite_score', 0.5)
        
        if composite_score >= 0.8:
            return AlertPriority.CRITICAL
        elif composite_score >= 0.65:
            return AlertPriority.HIGH
        elif composite_score >= 0.4:
            return AlertPriority.MEDIUM
        elif composite_score >= 0.2:
            return AlertPriority.LOW
        else:
            return AlertPriority.INFO
    
    async def _generate_recommended_actions(self, category: AlertCategory, 
                                          source_data: Dict[str, Any], 
                                          priority_scores: Dict[str, float]) -> List[str]:
        """Generate AI-powered recommended actions for alerts"""
        actions = []
        
        try:
            # Category-specific actions
            if category == AlertCategory.REVENUE_ANOMALY:
                actions.extend([
                    "Review recent pricing changes and competitor analysis",
                    "Analyze customer booking patterns for unusual behavior",
                    "Check marketing campaign performance and ROI"
                ])
            
            elif category == AlertCategory.SYSTEM_HEALTH:
                actions.extend([
                    "Check system logs for error patterns",
                    "Verify backup systems and failover procedures",
                    "Monitor resource utilization trends"
                ])
            
            elif category == AlertCategory.CUSTOMER_BEHAVIOR:
                actions.extend([
                    "Review customer satisfaction surveys",
                    "Analyze service quality metrics",
                    "Check for seasonal behavior patterns"
                ])
            
            elif category == AlertCategory.OPPORTUNITY:
                actions.extend([
                    "Evaluate potential for service expansion",
                    "Consider targeted marketing campaigns",
                    "Analyze optimal pricing strategies"
                ])
            
            # Priority-based actions
            if priority_scores.get('urgency', 0) > 0.7:
                actions.insert(0, "Take immediate action - high urgency detected")
            
            if priority_scores.get('business_impact', 0) > 0.6:
                actions.append("Calculate and track financial impact of resolution")
            
            # AI-generated contextual actions
            if AI_INTEGRATION_AVAILABLE:
                ai_actions = await self._generate_ai_actions(category, source_data, priority_scores)
                actions.extend(ai_actions)
            
        except Exception as e:
            logger.error(f"Action generation failed: {e}")
            actions.append("Review alert details and take appropriate action")
        
        return actions[:5]  # Limit to top 5 actions
    
    async def _generate_ai_actions(self, category: AlertCategory, 
                                 source_data: Dict[str, Any], 
                                 priority_scores: Dict[str, float]) -> List[str]:
        """Generate AI-powered contextual actions"""
        try:
            context = {
                'category': category.value,
                'source_data': source_data,
                'priority_scores': priority_scores,
                'timestamp': datetime.now().isoformat()
            }
            
            ai_response = await ai_orchestrator.enhanced_chat(
                message=f"Generate 2-3 specific actionable recommendations for this {category.value} alert",
                session_id=f"alert_actions_{int(time.time())}",
                business_context=context
            )
            
            if ai_response.get('response'):
                # Extract actions from AI response
                response_text = ai_response['response']
                actions = []
                
                # Simple extraction (could be enhanced with NLP)
                lines = response_text.split('\n')
                for line in lines:
                    line = line.strip()
                    if any(word in line.lower() for word in ['recommend', 'suggest', 'should', 'consider']):
                        if len(line) > 10 and len(line) < 150:  # Reasonable action length
                            actions.append(line)
                
                return actions[:3]  # Return top 3 AI actions
                
        except Exception as e:
            logger.error(f"AI action generation failed: {e}")
        
        return []
    
    async def get_active_alerts(self, barbershop_id: str, user_id: str, 
                              priority_filter: Optional[AlertPriority] = None,
                              category_filter: Optional[AlertCategory] = None,
                              limit: int = 50) -> List[Dict[str, Any]]:
        """Get active alerts with intelligent filtering and prioritization"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Build query with filters
            query = '''
                SELECT * FROM alerts 
                WHERE barbershop_id = ? AND status = 'active'
            '''
            params = [barbershop_id]
            
            if priority_filter:
                query += ' AND priority = ?'
                params.append(priority_filter.value)
            
            if category_filter:
                query += ' AND category = ?'
                params.append(category_filter.value)
            
            # Apply user preferences for filtering
            user_prefs = await self._get_user_preferences(user_id, barbershop_id)
            if user_prefs and user_prefs.priority_threshold:
                priority_order = {p.value: i for i, p in enumerate(AlertPriority)}
                threshold_level = priority_order.get(user_prefs.priority_threshold.value, 2)
                
                priority_filter_clause = ' OR '.join([
                    f"priority = '{p.value}'" for p in AlertPriority 
                    if priority_order[p.value] <= threshold_level
                ])
                query += f' AND ({priority_filter_clause})'
            
            # Order by intelligent priority (composite score + urgency + created_at)
            query += '''
                ORDER BY 
                    CASE priority 
                        WHEN 'critical' THEN 4
                        WHEN 'high' THEN 3  
                        WHEN 'medium' THEN 2
                        WHEN 'low' THEN 1
                        ELSE 0
                    END DESC,
                    urgency_score DESC,
                    created_at DESC
                LIMIT ?
            '''
            params.append(limit)
            
            cursor.execute(query, params)
            results = cursor.fetchall()
            
            # Convert to dictionaries and enrich with additional data
            alerts = []
            for row in results:
                alert_dict = self._row_to_alert_dict(row)
                
                # Add user interaction history
                alert_dict['user_interactions'] = await self._get_alert_interactions(row[0], user_id)
                
                # Add similarity clustering information
                alert_dict['similar_alerts'] = await self._get_similar_alerts(row[0], barbershop_id)
                
                # Add predicted resolution time
                alert_dict['estimated_resolution_time'] = await self._predict_resolution_time(alert_dict)
                
                alerts.append(alert_dict)
            
            conn.close()
            
            # Apply ML-based re-ranking if available
            if SKLEARN_AVAILABLE and len(alerts) > 1:
                alerts = await self._ml_rerank_alerts(alerts, user_id)
            
            logger.info(f"📊 Retrieved {len(alerts)} active alerts for user {user_id}")
            return alerts
            
        except Exception as e:
            logger.error(f"Error retrieving active alerts: {e}")
            return []
    
    async def acknowledge_alert(self, alert_id: str, user_id: str, 
                              notes: Optional[str] = None) -> bool:
        """Acknowledge alert and record user interaction"""
        try:
            # Record interaction
            interaction_id = f"ack_{alert_id}_{user_id}_{int(time.time())}"
            await self._record_interaction(
                interaction_id, alert_id, user_id, 'acknowledged',
                {'notes': notes, 'timestamp': datetime.now().isoformat()}
            )
            
            # Update alert status
            success = await self._update_alert_status(alert_id, AlertStatus.ACKNOWLEDGED, notes)
            
            if success:
                # Update ML training data with positive feedback
                await self._add_ml_training_data(alert_id, user_id, 'acknowledged', 0.7)
                
                # Send real-time update
                if AI_INTEGRATION_AVAILABLE:
                    await realtime_service.send_business_event(
                        user_id, 'alert_acknowledged', 
                        {'alert_id': alert_id, 'status': 'acknowledged'}
                    )
                
                logger.info(f"✅ Alert {alert_id} acknowledged by user {user_id}")
            
            return success
            
        except Exception as e:
            logger.error(f"Error acknowledging alert: {e}")
            return False
    
    async def dismiss_alert(self, alert_id: str, user_id: str, 
                           feedback: Optional[str] = None,
                           reason: Optional[str] = None) -> bool:
        """Dismiss alert with feedback for ML learning"""
        try:
            # Record interaction with feedback
            interaction_data = {
                'feedback': feedback,
                'reason': reason,
                'timestamp': datetime.now().isoformat()
            }
            
            interaction_id = f"dismiss_{alert_id}_{user_id}_{int(time.time())}"
            await self._record_interaction(
                interaction_id, alert_id, user_id, 'dismissed', interaction_data
            )
            
            # Update alert status
            success = await self._update_alert_status(alert_id, AlertStatus.DISMISSED, reason)
            
            if success:
                # Determine feedback score for ML training
                feedback_score = 0.2  # Default for dismissed
                if feedback and 'useful' in feedback.lower():
                    feedback_score = 0.6
                elif feedback and any(word in feedback.lower() for word in ['spam', 'noise', 'irrelevant']):
                    feedback_score = 0.1
                
                await self._add_ml_training_data(alert_id, user_id, 'dismissed', feedback_score)
                
                # Update alert rule feedback if applicable
                await self._update_rule_feedback(alert_id, feedback_score)
                
                logger.info(f"🗑️ Alert {alert_id} dismissed by user {user_id} (feedback: {feedback_score})")
            
            return success
            
        except Exception as e:
            logger.error(f"Error dismissing alert: {e}")
            return False
    
    async def get_alert_history(self, barbershop_id: str, user_id: str,
                               days: int = 7, limit: int = 100) -> Dict[str, Any]:
        """Get alert history with analytics and insights"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Get alerts from the specified time period
            since_date = (datetime.now() - timedelta(days=days)).isoformat()
            
            cursor.execute('''
                SELECT * FROM alerts 
                WHERE barbershop_id = ? AND created_at >= ?
                ORDER BY created_at DESC
                LIMIT ?
            ''', (barbershop_id, since_date, limit))
            
            alerts = [self._row_to_alert_dict(row) for row in cursor.fetchall()]
            
            # Get interaction statistics
            cursor.execute('''
                SELECT 
                    interaction_type,
                    COUNT(*) as count,
                    AVG(response_time) as avg_response_time
                FROM alert_interactions ai
                JOIN alerts a ON ai.alert_id = a.alert_id
                WHERE a.barbershop_id = ? AND ai.timestamp >= ?
                GROUP BY interaction_type
            ''', (barbershop_id, since_date))
            
            interaction_stats = {row[0]: {'count': row[1], 'avg_response_time': row[2]} 
                               for row in cursor.fetchall()}
            
            # Calculate alert trends and patterns
            alert_trends = self._calculate_alert_trends(alerts)
            
            # Get most effective alerts (high acknowledgment rate)
            effective_alerts = self._identify_effective_alerts(alerts, interaction_stats)
            
            # Get alert fatigue indicators
            fatigue_indicators = await self._calculate_fatigue_indicators(barbershop_id, alerts)
            
            conn.close()
            
            return {
                'barbershop_id': barbershop_id,
                'time_period_days': days,
                'total_alerts': len(alerts),
                'alerts': alerts,
                'interaction_statistics': interaction_stats,
                'alert_trends': alert_trends,
                'effective_alerts': effective_alerts,
                'fatigue_indicators': fatigue_indicators,
                'generated_at': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting alert history: {e}")
            return {'error': str(e)}
    
    # Helper methods for internal operations
    
    def _generate_alert_id(self, barbershop_id: str, title: str, source_data: Dict) -> str:
        """Generate unique alert ID based on content"""
        content = f"{barbershop_id}:{title}:{json.dumps(sorted(source_data.items()))}"
        return f"alert_{hashlib.md5(content.encode()).hexdigest()[:16]}"
    
    async def _is_duplicate_alert(self, alert_id: str, barbershop_id: str) -> bool:
        """Check if alert is a duplicate of recent alert"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Check for same alert in last 24 hours
            since_time = (datetime.now() - timedelta(hours=24)).isoformat()
            cursor.execute('''
                SELECT COUNT(*) FROM alerts 
                WHERE alert_id = ? AND barbershop_id = ? AND created_at >= ?
            ''', (alert_id, barbershop_id, since_time))
            
            count = cursor.fetchone()[0]
            conn.close()
            
            return count > 0
            
        except Exception as e:
            logger.error(f"Duplicate check failed: {e}")
            return False
    
    def _get_category_urgency_weight(self, category: AlertCategory) -> float:
        """Get urgency weight for alert category"""
        weights = {
            AlertCategory.CRITICAL: 1.0,
            AlertCategory.SYSTEM_HEALTH: 0.9,
            AlertCategory.SECURITY: 0.95,
            AlertCategory.REVENUE_ANOMALY: 0.8,
            AlertCategory.OPERATIONAL_ISSUE: 0.7,
            AlertCategory.CUSTOMER_BEHAVIOR: 0.6,
            AlertCategory.BUSINESS_METRIC: 0.5,
            AlertCategory.OPPORTUNITY: 0.3,
            AlertCategory.COMPLIANCE: 0.4
        }
        return weights.get(category, 0.5)
    
    async def _store_alert(self, alert: Alert):
        """Store alert in database"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT OR REPLACE INTO alerts (
                    alert_id, barbershop_id, title, message, category, priority,
                    confidence_score, severity_score, urgency_score, business_impact,
                    status, created_at, updated_at, expires_at, metadata,
                    source_data, recommended_actions, similar_alerts_count,
                    user_interactions, ml_features
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                alert.alert_id, alert.barbershop_id, alert.title, alert.message,
                alert.category.value, alert.priority.value, alert.confidence_score,
                alert.severity_score, alert.urgency_score, alert.business_impact,
                alert.status.value, alert.created_at, alert.updated_at, alert.expires_at,
                json.dumps(alert.metadata), json.dumps(alert.source_data),
                json.dumps(alert.recommended_actions), alert.similar_alerts_count,
                json.dumps(alert.user_interactions), json.dumps(alert.ml_features)
            ))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Error storing alert: {e}")
            raise

# Global instance
intelligent_alert_service = IntelligentAlertService()

# Usage example for testing
if __name__ == "__main__":
    async def test_intelligent_alerts():
        service = IntelligentAlertService()
        
        # Test alert creation
        sample_alert = await service.create_alert(
            barbershop_id="test_shop_001",
            title="Revenue Anomaly Detected",
            message="Daily revenue is 25% below expected based on historical patterns",
            category=AlertCategory.REVENUE_ANOMALY,
            source_data={
                'revenue_impact': 150.0,
                'customer_count': 8,
                'trend_direction': 'decreasing',
                'threshold_deviation': 0.25,
                'time_period': '24h'
            },
            metadata={'analysis_confidence': 0.87}
        )
        
        print(f"✅ Created test alert: {sample_alert.alert_id}")
        print(f"   Priority: {sample_alert.priority.value}")
        print(f"   Confidence: {sample_alert.confidence_score:.2f}")
        
        # Test getting active alerts
        active_alerts = await service.get_active_alerts("test_shop_001", "test_user_001")
        print(f"📊 Retrieved {len(active_alerts)} active alerts")
        
        # Test acknowledging alert
        if active_alerts:
            ack_result = await service.acknowledge_alert(
                active_alerts[0]['alert_id'], 
                "test_user_001", 
                "Investigating revenue drop"
            )
            print(f"✅ Acknowledge result: {ack_result}")
    
    # Run test
    asyncio.run(test_intelligent_alerts())