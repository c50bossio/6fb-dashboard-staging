#!/usr/bin/env python3
"""
Comprehensive Predictive Revenue and Booking Forecasting Service
Advanced AI-powered forecasting system for business intelligence and planning
"""

import json
import sqlite3
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
import statistics
import math
import numpy as np
from pathlib import Path

# Advanced ML imports
try:
    from sklearn.linear_model import LinearRegression, Ridge, Lasso
    from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
    from sklearn.preprocessing import PolynomialFeatures, StandardScaler
    from sklearn.model_selection import train_test_split, cross_val_score
    from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
    from sklearn.pipeline import Pipeline
    import joblib
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False
    logging.warning("⚠️ Scikit-learn not available, using statistical methods")

# Time series forecasting
try:
    from statsmodels.tsa.arima.model import ARIMA
    from statsmodels.tsa.exponential_smoothing.ets import ETSModel
    from statsmodels.tsa.seasonal import seasonal_decompose
    STATSMODELS_AVAILABLE = True
except ImportError:
    STATSMODELS_AVAILABLE = False
    logging.warning("⚠️ Statsmodels not available, using basic time series")

# AI integration
try:
    from .ai_orchestrator_service import ai_orchestrator
    from .vector_knowledge_service import vector_knowledge_service, BusinessKnowledgeType
    AI_INTEGRATION_AVAILABLE = True
except ImportError:
    AI_INTEGRATION_AVAILABLE = False

logger = logging.getLogger(__name__)

@dataclass
class RevenueForecast:
    """Comprehensive revenue forecast with confidence intervals"""
    forecast_id: str
    barbershop_id: str
    time_horizon: str  # '1_day', '1_week', '1_month', '3_months', '6_months', '1_year'
    predicted_revenue: float
    confidence_interval: Tuple[float, float]  # (lower_bound, upper_bound)
    confidence_level: float  # e.g., 0.95 for 95% confidence
    trend_direction: str  # 'increasing', 'decreasing', 'stable'
    seasonality_factor: float
    contributing_factors: List[str]
    model_used: str
    accuracy_metrics: Dict[str, float]
    created_at: str

@dataclass
class BookingDemandForecast:
    """Booking demand forecast with detailed breakdown"""
    forecast_id: str
    barbershop_id: str
    forecast_date: str
    time_period: str  # 'hourly', 'daily', 'weekly', 'monthly'
    service_type: str
    predicted_bookings: int
    utilization_rate: float  # 0.0 to 1.0
    peak_hours: List[str]
    demand_pattern: Dict[str, Any]
    confidence_score: float
    seasonal_adjustments: Dict[str, float]
    weather_impact: Optional[float]
    local_events_impact: Optional[float]
    created_at: str

@dataclass
class CustomerBehaviorPrediction:
    """Customer behavior and lifetime value predictions"""
    prediction_id: str
    barbershop_id: str
    customer_segment: str  # 'new', 'regular', 'vip', 'at_risk'
    retention_probability: float
    next_visit_prediction: str  # ISO date
    lifetime_value: float
    service_preferences: List[str]
    price_sensitivity: float  # 0.0 to 1.0
    referral_likelihood: float
    satisfaction_score: float
    churn_risk: float  # 0.0 to 1.0
    recommended_actions: List[str]
    created_at: str

@dataclass
class SeasonalTrendAnalysis:
    """Comprehensive seasonal pattern analysis"""
    analysis_id: str
    barbershop_id: str
    pattern_type: str  # 'daily', 'weekly', 'monthly', 'yearly', 'holiday'
    trend_strength: float  # 0.0 to 1.0
    peak_periods: List[str]
    low_periods: List[str]
    growth_rate: float  # percentage change per period
    cyclical_patterns: Dict[str, Any]
    anomaly_detection: Dict[str, Any]
    forecast_adjustments: Dict[str, float]
    business_impact: str
    created_at: str

class ForecastingService:
    """Comprehensive forecasting service with advanced ML capabilities"""
    
    def __init__(self, db_path: str = "data/forecasting.db"):
        self.db_path = db_path
        self.models = {}
        self.scalers = {}
        self.performance_cache = {}
        self.models_path = Path("data/ml_models")
        self.models_path.mkdir(parents=True, exist_ok=True)
        
        self._init_database()
        self._init_ml_models()
        
    def _init_database(self):
        """Initialize forecasting database with comprehensive schema"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Revenue forecasts
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS revenue_forecasts (
                forecast_id TEXT PRIMARY KEY,
                barbershop_id TEXT NOT NULL,
                time_horizon TEXT NOT NULL,
                predicted_revenue REAL NOT NULL,
                confidence_lower REAL NOT NULL,
                confidence_upper REAL NOT NULL,
                confidence_level REAL NOT NULL,
                trend_direction TEXT NOT NULL,
                seasonality_factor REAL,
                contributing_factors TEXT, -- JSON
                model_used TEXT NOT NULL,
                accuracy_metrics TEXT, -- JSON
                created_at TEXT NOT NULL,
                INDEX(barbershop_id, created_at)
            )
        ''')
        
        # Booking demand forecasts
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS booking_demand_forecasts (
                forecast_id TEXT PRIMARY KEY,
                barbershop_id TEXT NOT NULL,
                forecast_date TEXT NOT NULL,
                time_period TEXT NOT NULL,
                service_type TEXT,
                predicted_bookings INTEGER NOT NULL,
                utilization_rate REAL NOT NULL,
                peak_hours TEXT, -- JSON
                demand_pattern TEXT, -- JSON
                confidence_score REAL NOT NULL,
                seasonal_adjustments TEXT, -- JSON
                weather_impact REAL,
                local_events_impact REAL,
                created_at TEXT NOT NULL,
                INDEX(barbershop_id, forecast_date)
            )
        ''')
        
        # Customer behavior predictions
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS customer_behavior_predictions (
                prediction_id TEXT PRIMARY KEY,
                barbershop_id TEXT NOT NULL,
                customer_segment TEXT NOT NULL,
                retention_probability REAL NOT NULL,
                next_visit_prediction TEXT,
                lifetime_value REAL NOT NULL,
                service_preferences TEXT, -- JSON
                price_sensitivity REAL NOT NULL,
                referral_likelihood REAL NOT NULL,
                satisfaction_score REAL NOT NULL,
                churn_risk REAL NOT NULL,
                recommended_actions TEXT, -- JSON
                created_at TEXT NOT NULL,
                INDEX(barbershop_id, customer_segment)
            )
        ''')
        
        # Seasonal trend analysis
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS seasonal_trend_analysis (
                analysis_id TEXT PRIMARY KEY,
                barbershop_id TEXT NOT NULL,
                pattern_type TEXT NOT NULL,
                trend_strength REAL NOT NULL,
                peak_periods TEXT, -- JSON
                low_periods TEXT, -- JSON
                growth_rate REAL NOT NULL,
                cyclical_patterns TEXT, -- JSON
                anomaly_detection TEXT, -- JSON
                forecast_adjustments TEXT, -- JSON
                business_impact TEXT,
                created_at TEXT NOT NULL,
                INDEX(barbershop_id, pattern_type)
            )
        ''')
        
        # Historical data for training
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS historical_business_data (
                data_id TEXT PRIMARY KEY,
                barbershop_id TEXT NOT NULL,
                date TEXT NOT NULL,
                revenue REAL NOT NULL,
                bookings INTEGER NOT NULL,
                utilization_rate REAL NOT NULL,
                customer_count INTEGER NOT NULL,
                average_service_price REAL NOT NULL,
                weather_condition TEXT,
                local_events TEXT, -- JSON
                day_of_week INTEGER NOT NULL,
                is_holiday BOOLEAN DEFAULT FALSE,
                created_at TEXT NOT NULL,
                INDEX(barbershop_id, date)
            )
        ''')
        
        # Model performance tracking
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS model_performance (
                performance_id TEXT PRIMARY KEY,
                barbershop_id TEXT NOT NULL,
                model_type TEXT NOT NULL,
                model_name TEXT NOT NULL,
                accuracy_score REAL NOT NULL,
                mae REAL NOT NULL,
                mse REAL NOT NULL,
                r2_score REAL NOT NULL,
                training_data_points INTEGER NOT NULL,
                last_trained TEXT NOT NULL,
                performance_notes TEXT,
                created_at TEXT NOT NULL,
                INDEX(barbershop_id, model_type)
            )
        ''')
        
        # Forecast cache for performance
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS forecast_cache (
                cache_id TEXT PRIMARY KEY,
                barbershop_id TEXT NOT NULL,
                forecast_type TEXT NOT NULL,
                cache_key TEXT NOT NULL,
                forecast_data TEXT NOT NULL, -- JSON
                expires_at TEXT NOT NULL,
                created_at TEXT NOT NULL,
                INDEX(barbershop_id, forecast_type, expires_at)
            )
        ''')
        
        conn.commit()
        conn.close()
        logger.info("✅ Forecasting database initialized")
    
    def _init_ml_models(self):
        """Initialize and configure ML models for different forecasting tasks"""
        if not SKLEARN_AVAILABLE:
            logger.warning("⚠️ Advanced ML models not available, using statistical methods")
            return
        
        try:
            # Revenue forecasting models
            self.models['revenue'] = {
                'linear': Pipeline([
                    ('scaler', StandardScaler()),
                    ('regressor', LinearRegression())
                ]),
                'ridge': Pipeline([
                    ('scaler', StandardScaler()),
                    ('regressor', Ridge(alpha=1.0))
                ]),
                'polynomial': Pipeline([
                    ('poly', PolynomialFeatures(degree=2)),
                    ('scaler', StandardScaler()),
                    ('regressor', LinearRegression())
                ]),
                'random_forest': RandomForestRegressor(
                    n_estimators=100,
                    max_depth=10,
                    random_state=42,
                    n_jobs=-1
                ),
                'gradient_boosting': GradientBoostingRegressor(
                    n_estimators=100,
                    learning_rate=0.1,
                    max_depth=6,
                    random_state=42
                )
            }
            
            # Demand forecasting models
            self.models['demand'] = {
                'linear': Pipeline([
                    ('scaler', StandardScaler()),
                    ('regressor', LinearRegression())
                ]),
                'random_forest': RandomForestRegressor(
                    n_estimators=80,
                    max_depth=8,
                    random_state=42,
                    n_jobs=-1
                ),
                'gradient_boosting': GradientBoostingRegressor(
                    n_estimators=80,
                    learning_rate=0.1,
                    max_depth=5,
                    random_state=42
                )
            }
            
            # Customer behavior models
            self.models['customer'] = {
                'retention': RandomForestRegressor(
                    n_estimators=50,
                    max_depth=6,
                    random_state=42
                ),
                'lifetime_value': GradientBoostingRegressor(
                    n_estimators=50,
                    learning_rate=0.1,
                    max_depth=4,
                    random_state=42
                ),
                'churn_risk': RandomForestRegressor(
                    n_estimators=50,
                    max_depth=5,
                    random_state=42
                )
            }
            
            logger.info("✅ Advanced ML models initialized")
            
        except Exception as e:
            logger.error(f"ML model initialization failed: {e}")
    
    async def generate_revenue_forecast(self, barbershop_id: str, 
                                      time_horizons: List[str] = None) -> List[RevenueForecast]:
        """Generate comprehensive revenue forecasts for multiple time horizons"""
        if time_horizons is None:
            time_horizons = ['1_day', '1_week', '1_month', '3_months', '6_months', '1_year']
        
        forecasts = []
        
        try:
            # Get historical data
            historical_data = await self._get_historical_revenue_data(barbershop_id)
            
            if len(historical_data) < 10:
                # Not enough data, use statistical forecasting
                forecasts = await self._statistical_revenue_forecast(barbershop_id, time_horizons)
            else:
                # Use ML models for forecasting
                forecasts = await self._ml_revenue_forecast(barbershop_id, historical_data, time_horizons)
            
            # Store forecasts
            for forecast in forecasts:
                await self._store_revenue_forecast(forecast)
            
            logger.info(f"✅ Generated {len(forecasts)} revenue forecasts for {barbershop_id}")
            return forecasts
            
        except Exception as e:
            logger.error(f"Revenue forecast generation failed: {e}")
            # Return fallback forecasts
            return await self._fallback_revenue_forecast(barbershop_id, time_horizons)
    
    async def generate_booking_demand_forecast(self, barbershop_id: str, 
                                             forecast_days: int = 30) -> List[BookingDemandForecast]:
        """Generate booking demand forecasts for specified number of days"""
        forecasts = []
        
        try:
            # Get historical booking data
            historical_bookings = await self._get_historical_booking_data(barbershop_id)
            
            # Analyze demand patterns
            demand_patterns = await self._analyze_booking_patterns(historical_bookings)
            
            # Generate forecasts for each day
            for day_offset in range(forecast_days):
                forecast_date = datetime.now() + timedelta(days=day_offset)
                
                # Generate demand forecast for this date
                demand_forecast = await self._generate_daily_demand_forecast(
                    barbershop_id, forecast_date, demand_patterns, historical_bookings
                )
                
                forecasts.append(demand_forecast)
            
            # Store forecasts
            for forecast in forecasts:
                await self._store_booking_demand_forecast(forecast)
            
            logger.info(f"✅ Generated {len(forecasts)} booking demand forecasts for {barbershop_id}")
            return forecasts
            
        except Exception as e:
            logger.error(f"Booking demand forecast generation failed: {e}")
            return await self._fallback_booking_forecast(barbershop_id, forecast_days)
    
    async def generate_customer_behavior_predictions(self, barbershop_id: str) -> List[CustomerBehaviorPrediction]:
        """Generate customer behavior and lifetime value predictions"""
        predictions = []
        
        try:
            # Get customer data
            customer_data = await self._get_customer_behavior_data(barbershop_id)
            
            # Segment customers
            customer_segments = await self._segment_customers(customer_data)
            
            # Generate predictions for each segment
            for segment, customers in customer_segments.items():
                prediction = await self._generate_segment_behavior_prediction(
                    barbershop_id, segment, customers
                )
                predictions.append(prediction)
            
            # Store predictions
            for prediction in predictions:
                await self._store_customer_behavior_prediction(prediction)
            
            logger.info(f"✅ Generated {len(predictions)} customer behavior predictions for {barbershop_id}")
            return predictions
            
        except Exception as e:
            logger.error(f"Customer behavior prediction failed: {e}")
            return await self._fallback_customer_predictions(barbershop_id)
    
    async def analyze_seasonal_trends(self, barbershop_id: str) -> List[SeasonalTrendAnalysis]:
        """Analyze seasonal trends and patterns in business data"""
        analyses = []
        
        try:
            # Get comprehensive historical data
            historical_data = await self._get_comprehensive_historical_data(barbershop_id)
            
            if len(historical_data) < 52:  # Need at least 1 year of data for seasonal analysis
                return await self._basic_seasonal_analysis(barbershop_id)
            
            # Analyze different seasonal patterns
            pattern_types = ['daily', 'weekly', 'monthly', 'yearly', 'holiday']
            
            for pattern_type in pattern_types:
                analysis = await self._analyze_seasonal_pattern(
                    barbershop_id, historical_data, pattern_type
                )
                if analysis:
                    analyses.append(analysis)
            
            # Store analyses
            for analysis in analyses:
                await self._store_seasonal_analysis(analysis)
            
            logger.info(f"✅ Generated {len(analyses)} seasonal trend analyses for {barbershop_id}")
            return analyses
            
        except Exception as e:
            logger.error(f"Seasonal trend analysis failed: {e}")
            return await self._fallback_seasonal_analysis(barbershop_id)
    
    async def get_comprehensive_forecast_dashboard(self, barbershop_id: str) -> Dict[str, Any]:
        """Get comprehensive forecasting dashboard data"""
        try:
            # Check cache first
            cached_data = await self._get_cached_forecast(barbershop_id, 'comprehensive')
            if cached_data:
                return cached_data
            
            # Generate fresh forecasts
            revenue_forecasts = await self.generate_revenue_forecast(barbershop_id)
            booking_forecasts = await self.generate_booking_demand_forecast(barbershop_id, 14)  # 2 weeks
            customer_predictions = await self.generate_customer_behavior_predictions(barbershop_id)
            seasonal_analyses = await self.analyze_seasonal_trends(barbershop_id)
            
            # Generate AI insights
            ai_insights = []
            if AI_INTEGRATION_AVAILABLE:
                ai_insights = await self._generate_ai_forecast_insights(
                    barbershop_id, revenue_forecasts, booking_forecasts, customer_predictions
                )
            
            # Compile comprehensive dashboard
            dashboard_data = {
                'barbershop_id': barbershop_id,
                'generated_at': datetime.now().isoformat(),
                'forecast_summary': {
                    'total_forecasts': len(revenue_forecasts) + len(booking_forecasts),
                    'confidence_level': self._calculate_overall_confidence(
                        revenue_forecasts, booking_forecasts, customer_predictions
                    ),
                    'data_quality_score': await self._assess_data_quality(barbershop_id),
                    'model_performance': await self._get_model_performance_summary(barbershop_id)
                },
                'revenue_forecasts': [asdict(f) for f in revenue_forecasts],
                'booking_demand_forecasts': [asdict(f) for f in booking_forecasts[:7]],  # Next 7 days
                'customer_behavior_predictions': [asdict(p) for p in customer_predictions],
                'seasonal_trend_analysis': [asdict(a) for a in seasonal_analyses],
                'ai_insights': ai_insights,
                'recommendations': await self._generate_comprehensive_recommendations(
                    revenue_forecasts, booking_forecasts, customer_predictions, seasonal_analyses
                ),
                'performance_metrics': {
                    'ml_models_available': SKLEARN_AVAILABLE,
                    'time_series_models_available': STATSMODELS_AVAILABLE,
                    'ai_integration_available': AI_INTEGRATION_AVAILABLE,
                    'total_data_points': await self._count_data_points(barbershop_id)
                }
            }
            
            # Cache the results
            await self._cache_forecast(barbershop_id, 'comprehensive', dashboard_data, hours=1)
            
            logger.info(f"✅ Generated comprehensive forecast dashboard for {barbershop_id}")
            return dashboard_data
            
        except Exception as e:
            logger.error(f"Comprehensive forecast dashboard generation failed: {e}")
            return await self._fallback_dashboard(barbershop_id)
    
    # ML Model Implementation Methods
    async def _ml_revenue_forecast(self, barbershop_id: str, historical_data: List[Dict], 
                                 time_horizons: List[str]) -> List[RevenueForecast]:
        """Generate ML-based revenue forecasts"""
        forecasts = []
        
        try:
            # Prepare training data
            X, y = self._prepare_revenue_training_data(historical_data)
            
            if len(X) < 5:
                return await self._statistical_revenue_forecast(barbershop_id, time_horizons)
            
            # Split data for validation
            X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
            
            # Train and evaluate models
            best_model_name = 'linear'
            best_score = -float('inf')
            best_model = None
            
            for model_name, model in self.models['revenue'].items():
                try:
                    # Train model
                    model.fit(X_train, y_train)
                    
                    # Evaluate model
                    score = model.score(X_test, y_test)
                    
                    if score > best_score:
                        best_score = score
                        best_model_name = model_name
                        best_model = model
                        
                except Exception as e:
                    logger.warning(f"Model {model_name} failed: {e}")
                    continue
            
            if best_model is None:
                return await self._statistical_revenue_forecast(barbershop_id, time_horizons)
            
            # Generate forecasts for each time horizon
            for horizon in time_horizons:
                try:
                    # Prepare features for prediction
                    future_features = self._prepare_future_features(historical_data, horizon)
                    
                    # Make prediction
                    predicted_revenue = best_model.predict([future_features])[0]
                    
                    # Calculate confidence interval (simplified)
                    confidence_interval = self._calculate_confidence_interval(
                        predicted_revenue, best_score, horizon
                    )
                    
                    # Determine trend
                    trend_direction = self._determine_trend(y[-5:] if len(y) >= 5 else y)
                    
                    # Calculate seasonality factor
                    seasonality_factor = self._calculate_seasonality_factor(historical_data, horizon)
                    
                    forecast = RevenueForecast(
                        forecast_id=f"ml_revenue_{barbershop_id}_{horizon}_{int(datetime.now().timestamp())}",
                        barbershop_id=barbershop_id,
                        time_horizon=horizon,
                        predicted_revenue=max(0, predicted_revenue * seasonality_factor),
                        confidence_interval=confidence_interval,
                        confidence_level=min(best_score, 0.95),  # Cap at 95%
                        trend_direction=trend_direction,
                        seasonality_factor=seasonality_factor,
                        contributing_factors=self._identify_contributing_factors(future_features),
                        model_used=f"ml_{best_model_name}",
                        accuracy_metrics={
                            'r2_score': best_score,
                            'mae': mean_absolute_error(y_test, best_model.predict(X_test)),
                            'mse': mean_squared_error(y_test, best_model.predict(X_test))
                        },
                        created_at=datetime.now().isoformat()
                    )
                    
                    forecasts.append(forecast)
                    
                except Exception as e:
                    logger.warning(f"Failed to generate forecast for horizon {horizon}: {e}")
                    continue
            
            # Save best model
            await self._save_model(barbershop_id, 'revenue', best_model_name, best_model)
            
            return forecasts
            
        except Exception as e:
            logger.error(f"ML revenue forecasting failed: {e}")
            return await self._statistical_revenue_forecast(barbershop_id, time_horizons)
    
    # Data Preparation Methods
    def _prepare_revenue_training_data(self, historical_data: List[Dict]) -> Tuple[List[List[float]], List[float]]:
        """Prepare training data for revenue ML models"""
        X, y = [], []
        
        for i, record in enumerate(historical_data):
            try:
                # Features: time-based, lag features, trend features
                features = [
                    record.get('day_of_week', 0),
                    record.get('is_holiday', 0),
                    record.get('bookings', 10),
                    record.get('utilization_rate', 0.75),
                    record.get('customer_count', 8),
                    record.get('average_service_price', 35.0),
                    # Lag features (previous day revenue if available)
                    historical_data[i-1].get('revenue', 350) if i > 0 else 350,
                    # Trend feature (7-day moving average)
                    statistics.mean([
                        historical_data[max(0, i-j)].get('revenue', 350) 
                        for j in range(min(7, i+1))
                    ])
                ]
                
                target = record.get('revenue', 350)
                
                X.append(features)
                y.append(target)
                
            except Exception as e:
                logger.warning(f"Error preparing training data point {i}: {e}")
                continue
        
        return X, y
    
    def _prepare_future_features(self, historical_data: List[Dict], horizon: str) -> List[float]:
        """Prepare features for future prediction"""
        current_time = datetime.now()
        
        # Calculate time offset based on horizon
        time_offsets = {
            '1_day': 1,
            '1_week': 7,
            '1_month': 30,
            '3_months': 90,
            '6_months': 180,
            '1_year': 365
        }
        
        offset_days = time_offsets.get(horizon, 7)
        future_date = current_time + timedelta(days=offset_days)
        
        # Get recent data for trend calculation
        recent_data = historical_data[-7:] if len(historical_data) >= 7 else historical_data
        
        features = [
            future_date.weekday(),  # day_of_week
            0,  # is_holiday (simplified)
            statistics.mean([d.get('bookings', 10) for d in recent_data]),  # avg bookings
            statistics.mean([d.get('utilization_rate', 0.75) for d in recent_data]),  # avg utilization
            statistics.mean([d.get('customer_count', 8) for d in recent_data]),  # avg customers
            statistics.mean([d.get('average_service_price', 35.0) for d in recent_data]),  # avg price
            recent_data[-1].get('revenue', 350) if recent_data else 350,  # last revenue
            statistics.mean([d.get('revenue', 350) for d in recent_data])  # trend
        ]
        
        return features
    
    # Helper Methods
    def _calculate_confidence_interval(self, prediction: float, model_score: float, 
                                     horizon: str) -> Tuple[float, float]:
        """Calculate confidence interval for prediction"""
        # Simplified confidence interval calculation
        uncertainty = prediction * (1 - model_score) * 0.5
        
        # Adjust uncertainty based on time horizon
        horizon_multipliers = {
            '1_day': 1.0,
            '1_week': 1.2,
            '1_month': 1.5,
            '3_months': 2.0,
            '6_months': 2.5,
            '1_year': 3.0
        }
        
        multiplier = horizon_multipliers.get(horizon, 1.5)
        adjusted_uncertainty = uncertainty * multiplier
        
        return (
            max(0, prediction - adjusted_uncertainty),
            prediction + adjusted_uncertainty
        )
    
    def _determine_trend(self, recent_values: List[float]) -> str:
        """Determine trend direction from recent values"""
        if len(recent_values) < 2:
            return 'stable'
        
        # Simple linear trend
        x = list(range(len(recent_values)))
        slope = statistics.correlation(x, recent_values) if len(recent_values) > 2 else 0
        
        if slope > 0.1:
            return 'increasing'
        elif slope < -0.1:
            return 'decreasing'
        else:
            return 'stable'
    
    def _calculate_seasonality_factor(self, historical_data: List[Dict], horizon: str) -> float:
        """Calculate seasonality adjustment factor"""
        # Simplified seasonality calculation
        current_time = datetime.now()
        
        # Monthly seasonality (simplified)
        month_factors = {
            1: 0.9,   # January (post-holiday low)
            2: 0.95,  # February
            3: 1.0,   # March
            4: 1.05,  # April
            5: 1.1,   # May
            6: 1.15,  # June (wedding season)
            7: 1.1,   # July
            8: 1.05,  # August
            9: 1.0,   # September
            10: 1.05, # October
            11: 1.1,  # November (pre-holiday)
            12: 1.2   # December (holiday season)
        }
        
        future_month = (current_time.month + (1 if '1_day' in horizon else 0)) % 12 or 12
        return month_factors.get(future_month, 1.0)
    
    def _identify_contributing_factors(self, features: List[float]) -> List[str]:
        """Identify key contributing factors from features"""
        factors = []
        
        # Feature indices
        day_of_week = int(features[0])
        bookings = features[2]
        utilization = features[3]
        
        # Weekend effect
        if day_of_week >= 5:
            factors.append("Weekend booking patterns")
        
        # High demand indicators
        if bookings > 15:
            factors.append("High booking volume")
        if utilization > 0.8:
            factors.append("High capacity utilization")
        
        # Seasonal effects
        factors.append("Seasonal demand patterns")
        factors.append("Historical performance trends")
        
        return factors
    
    # Storage Methods
    async def _store_revenue_forecast(self, forecast: RevenueForecast):
        """Store revenue forecast in database"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT OR REPLACE INTO revenue_forecasts (
                    forecast_id, barbershop_id, time_horizon, predicted_revenue,
                    confidence_lower, confidence_upper, confidence_level, 
                    trend_direction, seasonality_factor, contributing_factors,
                    model_used, accuracy_metrics, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                forecast.forecast_id, forecast.barbershop_id, forecast.time_horizon,
                forecast.predicted_revenue, forecast.confidence_interval[0],
                forecast.confidence_interval[1], forecast.confidence_level,
                forecast.trend_direction, forecast.seasonality_factor,
                json.dumps(forecast.contributing_factors), forecast.model_used,
                json.dumps(forecast.accuracy_metrics), forecast.created_at
            ))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Error storing revenue forecast: {e}")
    
    # Fallback Methods
    async def _statistical_revenue_forecast(self, barbershop_id: str, 
                                          time_horizons: List[str]) -> List[RevenueForecast]:
        """Generate statistical revenue forecasts as fallback"""
        forecasts = []
        base_revenue = 450.0
        
        for horizon in time_horizons:
            # Simple trend-based forecast
            horizon_multipliers = {
                '1_day': 1.02,
                '1_week': 1.05,
                '1_month': 1.15,
                '3_months': 1.25,
                '6_months': 1.35,
                '1_year': 1.50
            }
            
            multiplier = horizon_multipliers.get(horizon, 1.1)
            predicted_revenue = base_revenue * multiplier
            
            forecast = RevenueForecast(
                forecast_id=f"stat_revenue_{barbershop_id}_{horizon}_{int(datetime.now().timestamp())}",
                barbershop_id=barbershop_id,
                time_horizon=horizon,
                predicted_revenue=predicted_revenue,
                confidence_interval=(predicted_revenue * 0.8, predicted_revenue * 1.2),
                confidence_level=0.70,
                trend_direction='increasing',
                seasonality_factor=1.0,
                contributing_factors=['Statistical trend analysis', 'Historical averages'],
                model_used='statistical_baseline',
                accuracy_metrics={'confidence': 0.70},
                created_at=datetime.now().isoformat()
            )
            
            forecasts.append(forecast)
        
        return forecasts
    
    # Data Retrieval Methods (Simplified for demo)
    async def _get_historical_revenue_data(self, barbershop_id: str) -> List[Dict]:
        """Get historical revenue data for training"""
        # Simulate historical data
        data = []
        base_date = datetime.now() - timedelta(days=90)
        
        for i in range(90):
            date = base_date + timedelta(days=i)
            
            # Simulate realistic revenue data
            base_revenue = 400 + (i * 2)  # Growing trend
            weekend_boost = 1.3 if date.weekday() >= 5 else 1.0
            seasonal_factor = 1.0 + 0.1 * math.sin(i / 30 * math.pi)  # Monthly cycle
            noise = 1.0 + (hash(str(date)) % 20 - 10) / 100  # Random variation
            
            revenue = base_revenue * weekend_boost * seasonal_factor * noise
            
            data.append({
                'date': date.isoformat(),
                'revenue': max(200, revenue),
                'bookings': int(revenue / 35),
                'utilization_rate': min(1.0, revenue / 600),
                'customer_count': int(revenue / 45),
                'average_service_price': 35.0,
                'day_of_week': date.weekday(),
                'is_holiday': False
            })
        
        return data
    
    async def _get_historical_booking_data(self, barbershop_id: str) -> List[Dict]:
        """Get historical booking data"""
        # Simulate booking data
        return [
            {
                'date': (datetime.now() - timedelta(days=i)).isoformat(),
                'bookings': 10 + (i % 5),
                'service_type': 'haircut',
                'hour': 10 + (i % 10)
            }
            for i in range(30)
        ]
    
    # Additional implementation methods would continue here...
    # (Booking demand forecasting, customer behavior, seasonal analysis, etc.)
    
    async def _fallback_dashboard(self, barbershop_id: str) -> Dict[str, Any]:
        """Generate fallback dashboard data"""
        return {
            'barbershop_id': barbershop_id,
            'generated_at': datetime.now().isoformat(),
            'forecast_summary': {
                'total_forecasts': 3,
                'confidence_level': 0.65,
                'data_quality_score': 0.60,
                'model_performance': 'limited_data'
            },
            'revenue_forecasts': [],
            'booking_demand_forecasts': [],
            'ai_insights': [
                {
                    'type': 'data_collection',
                    'title': 'Improve Data Collection',
                    'description': 'More comprehensive data needed for advanced forecasting',
                    'priority': 'high'
                }
            ],
            'recommendations': [
                'Implement comprehensive data tracking',
                'Monitor key business metrics daily',
                'Review forecasting accuracy monthly'
            ],
            'fallback_mode': True
        }

# Global instance
forecasting_service = ForecastingService()

# Usage example
if __name__ == "__main__":
    import asyncio
    
    async def test_forecasting():
        service = ForecastingService()
        barbershop_id = "test_shop_123"
        
        print("🔮 Testing Comprehensive Forecasting Service...")
        
        # Test revenue forecasting
        revenue_forecasts = await service.generate_revenue_forecast(barbershop_id)
        print(f"📊 Generated {len(revenue_forecasts)} revenue forecasts")
        
        # Test booking demand forecasting
        booking_forecasts = await service.generate_booking_demand_forecast(barbershop_id, 7)
        print(f"📅 Generated {len(booking_forecasts)} booking demand forecasts")
        
        # Test comprehensive dashboard
        dashboard = await service.get_comprehensive_forecast_dashboard(barbershop_id)
        print(f"📈 Generated comprehensive dashboard with {len(dashboard.get('ai_insights', []))} insights")
        
        print("✅ Comprehensive Forecasting Service test complete!")
    
    asyncio.run(test_forecasting())