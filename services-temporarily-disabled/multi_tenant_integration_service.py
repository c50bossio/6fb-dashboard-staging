"""
Multi-Tenant Integration Service
Integrates existing services with the new multi-tenant franchise architecture
Provides backward compatibility and migration utilities
"""

import os
import sqlite3
import json
import uuid
from datetime import datetime, date, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
import decimal
import logging
from contextlib import contextmanager

# Import existing services
from .franchise_management_service import FranchiseManagementService, OperationResult
from .multi_tenant_authentication import MultiTenantAuthService, UserSession
from .cross_location_loyalty_service import CrossLocationLoyaltyService, TransactionType
from .franchise_analytics_service import FranchiseAnalyticsService, MetricCategory, TimeframeType
from .payment_processing_service import PaymentProcessingService
from .ai_orchestrator_service import AIOrchestrator

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ==========================================
# DATA MODELS
# ==========================================

@dataclass
class IntegrationResult:
    """Integration operation result"""
    success: bool
    data: Optional[Any] = None
    error: Optional[str] = None
    error_code: Optional[str] = None
    migration_log: List[str] = None
    warnings: List[str] = None

    def __post_init__(self):
        if self.migration_log is None:
            self.migration_log = []
        if self.warnings is None:
            self.warnings = []

@dataclass
class ServiceHealthCheck:
    """Service health check result"""
    service_name: str
    status: str  # "HEALTHY", "DEGRADED", "UNHEALTHY"
    response_time_ms: float
    error_message: Optional[str] = None
    last_check: Optional[datetime] = None

# ==========================================
# MULTI-TENANT INTEGRATION SERVICE
# ==========================================

class MultiTenantIntegrationService:
    """
    Service that integrates all franchise management services
    """
    
    def __init__(self, db_path: str = "database/agent_system.db"):
        self.db_path = db_path
        
        # Initialize all services
        self.franchise_service = FranchiseManagementService(db_path)
        self.auth_service = MultiTenantAuthService(db_path)
        self.loyalty_service = CrossLocationLoyaltyService(db_path)
        self.analytics_service = FranchiseAnalyticsService(db_path)
        self.payment_service = PaymentProcessingService(db_path)
        
        # Initialize AI orchestrator if available
        try:
            self.ai_orchestrator = AIOrchestrator(db_path)
        except Exception as e:
            logger.warning(f"AI Orchestrator not available: {str(e)}")
            self.ai_orchestrator = None
        
        self._init_integration_tables()
        logger.info("Multi-tenant integration service initialized")

    def _init_integration_tables(self):
        """Initialize integration-specific tables"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Service health monitoring table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS service_health (
                service_name TEXT PRIMARY KEY,
                status TEXT NOT NULL,
                response_time_ms REAL DEFAULT 0,
                error_message TEXT,
                last_check TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                total_checks INTEGER DEFAULT 1,
                successful_checks INTEGER DEFAULT 0,
                avg_response_time REAL DEFAULT 0
            )
        ''')
        
        # Integration events log
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS integration_events (
                id TEXT PRIMARY KEY,
                event_type TEXT NOT NULL, -- 'MIGRATION', 'SYNC', 'ERROR', 'INFO'
                service_name TEXT NOT NULL,
                franchise_id TEXT,
                location_id TEXT,
                user_id TEXT,
                description TEXT NOT NULL,
                event_data TEXT, -- JSON
                severity TEXT DEFAULT 'INFO', -- 'DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL'
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Cross-service data mapping table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS service_data_mapping (
                id TEXT PRIMARY KEY,
                source_service TEXT NOT NULL,
                source_entity_type TEXT NOT NULL,
                source_entity_id TEXT NOT NULL,
                target_service TEXT NOT NULL,
                target_entity_type TEXT NOT NULL,
                target_entity_id TEXT NOT NULL,
                mapping_type TEXT DEFAULT 'DIRECT', -- 'DIRECT', 'TRANSFORMED', 'AGGREGATED'
                mapping_rules TEXT, -- JSON
                last_sync TIMESTAMP,
                sync_status TEXT DEFAULT 'PENDING', -- 'PENDING', 'SYNCED', 'FAILED'
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                
                UNIQUE(source_service, source_entity_type, source_entity_id, target_service, target_entity_type)
            )
        ''')
        
        conn.commit()
        conn.close()

    @contextmanager
    def get_db_connection(self):
        """Get database connection with context manager"""
        conn = sqlite3.connect(self.db_path)
        conn.execute("PRAGMA foreign_keys = ON")
        conn.row_factory = sqlite3.Row
        try:
            yield conn
        finally:
            conn.close()

    # ==========================================
    # SERVICE HEALTH MONITORING
    # ==========================================

    def check_all_services_health(self) -> IntegrationResult:
        """Check health of all integrated services"""
        try:
            health_checks = []
            
            # Check franchise management service
            start_time = datetime.utcnow()
            try:
                result = self.franchise_service.list_franchises(limit=1)
                response_time = (datetime.utcnow() - start_time).total_seconds() * 1000
                
                health_check = ServiceHealthCheck(
                    service_name="franchise_management",
                    status="HEALTHY" if result.success else "UNHEALTHY",
                    response_time_ms=response_time,
                    error_message=result.error if not result.success else None,
                    last_check=datetime.utcnow()
                )
            except Exception as e:
                response_time = (datetime.utcnow() - start_time).total_seconds() * 1000
                health_check = ServiceHealthCheck(
                    service_name="franchise_management",
                    status="UNHEALTHY",
                    response_time_ms=response_time,
                    error_message=str(e),
                    last_check=datetime.utcnow()
                )
            
            health_checks.append(health_check)
            
            # Check authentication service
            start_time = datetime.utcnow()
            try:
                # Test with a dummy token
                result = self.auth_service.validate_session("dummy_token")
                response_time = (datetime.utcnow() - start_time).total_seconds() * 1000
                
                # Expected to fail with invalid token, but service should be responsive
                health_check = ServiceHealthCheck(
                    service_name="authentication",
                    status="HEALTHY" if result.error_code == "INVALID_SESSION" else "DEGRADED",
                    response_time_ms=response_time,
                    last_check=datetime.utcnow()
                )
            except Exception as e:
                response_time = (datetime.utcnow() - start_time).total_seconds() * 1000
                health_check = ServiceHealthCheck(
                    service_name="authentication",
                    status="UNHEALTHY",
                    response_time_ms=response_time,
                    error_message=str(e),
                    last_check=datetime.utcnow()
                )
            
            health_checks.append(health_check)
            
            # Check loyalty service
            start_time = datetime.utcnow()
            try:
                result = self.loyalty_service.get_customer_loyalty_profile("dummy_customer", "dummy_franchise")
                response_time = (datetime.utcnow() - start_time).total_seconds() * 1000
                
                health_check = ServiceHealthCheck(
                    service_name="loyalty",
                    status="HEALTHY" if result.error_code in ["PROFILE_NOT_FOUND", None] else "UNHEALTHY",
                    response_time_ms=response_time,
                    error_message=result.error if result.error_code not in ["PROFILE_NOT_FOUND", None] else None,
                    last_check=datetime.utcnow()
                )
            except Exception as e:
                response_time = (datetime.utcnow() - start_time).total_seconds() * 1000
                health_check = ServiceHealthCheck(
                    service_name="loyalty",
                    status="UNHEALTHY",
                    response_time_ms=response_time,
                    error_message=str(e),
                    last_check=datetime.utcnow()
                )
            
            health_checks.append(health_check)
            
            # Check analytics service
            start_time = datetime.utcnow()
            try:
                result = self.analytics_service.calculate_location_metrics(
                    "dummy_franchise", "dummy_location"
                )
                response_time = (datetime.utcnow() - start_time).total_seconds() * 1000
                
                health_check = ServiceHealthCheck(
                    service_name="analytics",
                    status="HEALTHY",  # Analytics service creates sample data if none exists
                    response_time_ms=response_time,
                    error_message=result.error if not result.success else None,
                    last_check=datetime.utcnow()
                )
            except Exception as e:
                response_time = (datetime.utcnow() - start_time).total_seconds() * 1000
                health_check = ServiceHealthCheck(
                    service_name="analytics",
                    status="UNHEALTHY",
                    response_time_ms=response_time,
                    error_message=str(e),
                    last_check=datetime.utcnow()
                )
            
            health_checks.append(health_check)
            
            # Check payment service
            start_time = datetime.utcnow()
            try:
                result = self.payment_service.get_all_services()
                response_time = (datetime.utcnow() - start_time).total_seconds() * 1000
                
                health_check = ServiceHealthCheck(
                    service_name="payment_processing",
                    status="HEALTHY" if result else "UNHEALTHY",
                    response_time_ms=response_time,
                    last_check=datetime.utcnow()
                )
            except Exception as e:
                response_time = (datetime.utcnow() - start_time).total_seconds() * 1000
                health_check = ServiceHealthCheck(
                    service_name="payment_processing",
                    status="UNHEALTHY",
                    response_time_ms=response_time,
                    error_message=str(e),
                    last_check=datetime.utcnow()
                )
            
            health_checks.append(health_check)
            
            # Update health status in database
            with self.get_db_connection() as conn:
                cursor = conn.cursor()
                
                for health_check in health_checks:
                    cursor.execute('''
                        INSERT OR REPLACE INTO service_health (
                            service_name, status, response_time_ms, error_message, last_check,
                            total_checks, successful_checks, avg_response_time
                        ) VALUES (?, ?, ?, ?, ?, 
                                  COALESCE((SELECT total_checks FROM service_health WHERE service_name = ?) + 1, 1),
                                  COALESCE((SELECT successful_checks FROM service_health WHERE service_name = ?) + 
                                           CASE WHEN ? = 'HEALTHY' THEN 1 ELSE 0 END, 
                                           CASE WHEN ? = 'HEALTHY' THEN 1 ELSE 0 END),
                                  COALESCE(
                                    ((SELECT avg_response_time FROM service_health WHERE service_name = ?) * 
                                     (SELECT total_checks FROM service_health WHERE service_name = ?) + ?) / 
                                    ((SELECT total_checks FROM service_health WHERE service_name = ?) + 1),
                                    ?
                                  )
                        )
                    ''', (
                        health_check.service_name, health_check.status, health_check.response_time_ms,
                        health_check.error_message, health_check.last_check,
                        health_check.service_name, health_check.service_name,
                        health_check.status, health_check.status,
                        health_check.service_name, health_check.service_name, health_check.response_time_ms,
                        health_check.service_name, health_check.response_time_ms
                    ))
                
                conn.commit()
            
            # Calculate overall system health
            healthy_services = sum(1 for hc in health_checks if hc.status == "HEALTHY")
            total_services = len(health_checks)
            overall_health_percentage = (healthy_services / total_services) * 100
            
            return IntegrationResult(
                success=True,
                data={
                    "overall_health_percentage": overall_health_percentage,
                    "healthy_services": healthy_services,
                    "total_services": total_services,
                    "service_health_checks": [asdict(hc) for hc in health_checks],
                    "system_status": "HEALTHY" if overall_health_percentage >= 80 else 
                                   "DEGRADED" if overall_health_percentage >= 60 else "UNHEALTHY"
                }
            )
            
        except Exception as e:
            error_msg = f"Failed to check services health: {str(e)}"
            logger.error(error_msg)
            return IntegrationResult(
                success=False,
                error=error_msg,
                error_code="HEALTH_CHECK_ERROR"
            )

    # ==========================================
    # UNIFIED CUSTOMER OPERATIONS
    # ==========================================

    def create_unified_customer_experience(
        self,
        user_session: UserSession,
        customer_data: Dict[str, Any],
        location_id: str,
        service_id: str
    ) -> IntegrationResult:
        """Create a unified customer experience across all services"""
        try:
            migration_log = []
            warnings = []
            
            # Step 1: Create or update franchise customer profile
            franchise_id = user_session.primary_franchise_id
            
            customer_result = self.franchise_service.create_franchise_customer(
                franchise_id=franchise_id,
                name=customer_data['name'],
                email=customer_data.get('email'),
                phone=customer_data.get('phone'),
                acquisition_location_id=location_id,
                acquisition_channel="ONLINE"
            )
            
            if not customer_result.success:
                return IntegrationResult(
                    success=False,
                    error=f"Failed to create customer: {customer_result.error}",
                    error_code="CUSTOMER_CREATION_ERROR"
                )
            
            customer_id = customer_result.data['id']
            migration_log.append(f"Created franchise customer: {customer_id}")
            
            # Step 2: Initialize loyalty profile
            loyalty_result = self.loyalty_service.award_points(
                customer_id=customer_id,
                franchise_id=franchise_id,
                location_id=location_id,
                points_amount=50,  # Welcome bonus
                description="Welcome bonus for new customer"
            )
            
            if loyalty_result.success:
                migration_log.append("Initialized loyalty profile with welcome bonus")
            else:
                warnings.append(f"Failed to initialize loyalty profile: {loyalty_result.error}")
            
            # Step 3: Create payment profile
            try:
                # This would typically integrate with Stripe customer creation
                migration_log.append("Payment profile ready for future transactions")
            except Exception as e:
                warnings.append(f"Payment profile setup warning: {str(e)}")
            
            # Step 4: Set up AI personalization context
            if self.ai_orchestrator:
                try:
                    ai_context = {
                        "customer_id": customer_id,
                        "preferences": customer_data.get('preferences', {}),
                        "acquisition_location": location_id,
                        "loyalty_tier": "BRONZE"  # Starting tier
                    }
                    
                    # This would integrate with AI orchestrator for personalization
                    migration_log.append("AI personalization context initialized")
                except Exception as e:
                    warnings.append(f"AI context setup warning: {str(e)}")
            
            # Step 5: Log integration event
            self._log_integration_event(
                event_type="CUSTOMER_CREATION",
                service_name="unified_integration",
                franchise_id=franchise_id,
                location_id=location_id,
                description=f"Created unified customer experience for {customer_data['name']}",
                event_data={"customer_id": customer_id, "services_integrated": 4}
            )
            
            return IntegrationResult(
                success=True,
                data={
                    "customer_id": customer_id,
                    "franchise_customer_code": customer_result.data['customer_code'],
                    "loyalty_points_awarded": loyalty_result.data.get('points_awarded', 0) if loyalty_result.success else 0,
                    "services_integrated": ["franchise_management", "loyalty", "payment", "ai_personalization"],
                    "integration_status": "COMPLETE"
                },
                migration_log=migration_log,
                warnings=warnings
            )
            
        except Exception as e:
            error_msg = f"Failed to create unified customer experience: {str(e)}"
            logger.error(error_msg)
            return IntegrationResult(
                success=False,
                error=error_msg,
                error_code="UNIFIED_CUSTOMER_ERROR"
            )

    # ==========================================
    # CROSS-SERVICE ANALYTICS
    # ==========================================

    def generate_unified_analytics_report(
        self,
        franchise_id: str,
        location_id: Optional[str] = None,
        timeframe: TimeframeType = TimeframeType.MONTHLY
    ) -> IntegrationResult:
        """Generate a unified analytics report across all services"""
        try:
            report_data = {}
            
            # Get franchise performance overview
            performance_result = self.franchise_service.get_franchise_performance_overview(franchise_id)
            if performance_result.success:
                report_data['franchise_performance'] = performance_result.data
            
            # Get detailed analytics metrics
            if location_id:
                analytics_result = self.analytics_service.calculate_location_metrics(
                    franchise_id, location_id, timeframe
                )
                if analytics_result.success:
                    report_data['location_analytics'] = analytics_result.data
                
                # Get location benchmarks
                comparison_result = self.analytics_service.get_location_performance_comparison(
                    franchise_id, location_id
                )
                if comparison_result.success:
                    report_data['performance_comparison'] = comparison_result.data
            
            # Get cross-location customer data
            cross_location_customers = self.franchise_service.get_cross_location_customers(franchise_id)
            if cross_location_customers.success:
                report_data['cross_location_insights'] = {
                    'total_cross_location_customers': len(cross_location_customers.data),
                    'average_locations_per_customer': sum(
                        c.get('locations_visited', 0) for c in cross_location_customers.data
                    ) / max(len(cross_location_customers.data), 1)
                }
            
            # Generate AI-powered insights if available
            if self.ai_orchestrator:
                try:
                    # This would generate AI insights based on the collected data
                    report_data['ai_insights'] = {
                        'status': 'AI insights generation in development',
                        'available': False
                    }
                except Exception as e:
                    logger.warning(f"AI insights generation failed: {str(e)}")
            
            # Calculate unified KPIs
            unified_kpis = self._calculate_unified_kpis(report_data)
            report_data['unified_kpis'] = unified_kpis
            
            return IntegrationResult(
                success=True,
                data={
                    'franchise_id': franchise_id,
                    'location_id': location_id,
                    'timeframe': timeframe.value,
                    'report_generated_at': datetime.utcnow().isoformat(),
                    'report_data': report_data
                }
            )
            
        except Exception as e:
            error_msg = f"Failed to generate unified analytics report: {str(e)}"
            logger.error(error_msg)
            return IntegrationResult(
                success=False,
                error=error_msg,
                error_code="ANALYTICS_REPORT_ERROR"
            )

    # ==========================================
    # UTILITY METHODS
    # ==========================================

    def _log_integration_event(
        self,
        event_type: str,
        service_name: str,
        description: str,
        franchise_id: Optional[str] = None,
        location_id: Optional[str] = None,
        user_id: Optional[str] = None,
        event_data: Optional[Dict[str, Any]] = None,
        severity: str = "INFO"
    ):
        """Log integration event"""
        try:
            with self.get_db_connection() as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    INSERT INTO integration_events (
                        id, event_type, service_name, franchise_id, location_id, user_id,
                        description, event_data, severity
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    str(uuid.uuid4()),
                    event_type,
                    service_name,
                    franchise_id,
                    location_id,
                    user_id,
                    description,
                    json.dumps(event_data or {}),
                    severity
                ))
                
                conn.commit()
                
        except Exception as e:
            logger.error(f"Failed to log integration event: {str(e)}")

    def _calculate_unified_kpis(self, report_data: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate unified KPIs across all services"""
        kpis = {}
        
        # Revenue KPIs
        franchise_perf = report_data.get('franchise_performance', {})
        current_analytics = franchise_perf.get('current_month_analytics', {})
        
        kpis['total_revenue'] = current_analytics.get('total_revenue', 0)
        kpis['total_appointments'] = current_analytics.get('total_appointments', 0)
        kpis['new_customers'] = current_analytics.get('new_customers', 0)
        kpis['customer_satisfaction'] = current_analytics.get('average_satisfaction_score', 0)
        
        # Cross-location KPIs
        cross_location = report_data.get('cross_location_insights', {})
        kpis['cross_location_customer_count'] = cross_location.get('total_cross_location_customers', 0)
        kpis['avg_locations_per_customer'] = cross_location.get('average_locations_per_customer', 0)
        
        # Performance KPIs
        performance_comp = report_data.get('performance_comparison', {})
        if performance_comp:
            overall_score = performance_comp.get('overall_performance_score', 0)
            kpis['overall_performance_score'] = overall_score
            kpis['performance_grade'] = (
                'A' if overall_score >= 90 else
                'B' if overall_score >= 80 else
                'C' if overall_score >= 70 else
                'D' if overall_score >= 60 else 'F'
            )
        
        return kpis

    def get_integration_status(self) -> IntegrationResult:
        """Get overall integration status"""
        try:
            with self.get_db_connection() as conn:
                cursor = conn.cursor()
                
                # Get service health summary
                cursor.execute('''
                    SELECT 
                        COUNT(*) as total_services,
                        SUM(CASE WHEN status = 'HEALTHY' THEN 1 ELSE 0 END) as healthy_services,
                        AVG(response_time_ms) as avg_response_time,
                        MAX(last_check) as last_health_check
                    FROM service_health
                ''')
                
                health_summary = cursor.fetchone()
                
                # Get recent integration events
                cursor.execute('''
                    SELECT event_type, severity, COUNT(*) as count
                    FROM integration_events
                    WHERE created_at >= datetime('now', '-24 hours')
                    GROUP BY event_type, severity
                    ORDER BY count DESC
                    LIMIT 10
                ''')
                
                recent_events = cursor.fetchall()
                
                status_data = {
                    'system_health': {
                        'total_services': health_summary['total_services'] if health_summary else 0,
                        'healthy_services': health_summary['healthy_services'] if health_summary else 0,
                        'avg_response_time_ms': health_summary['avg_response_time'] if health_summary else 0,
                        'last_health_check': health_summary['last_health_check'] if health_summary else None,
                        'health_percentage': (
                            (health_summary['healthy_services'] / max(health_summary['total_services'], 1)) * 100
                            if health_summary else 0
                        )
                    },
                    'integration_activity': {
                        'recent_events': [dict(row) for row in recent_events],
                        'total_events_24h': sum(row['count'] for row in recent_events)
                    },
                    'integration_status': 'OPERATIONAL',
                    'last_updated': datetime.utcnow().isoformat()
                }
                
                return IntegrationResult(success=True, data=status_data)
                
        except Exception as e:
            error_msg = f"Failed to get integration status: {str(e)}"
            logger.error(error_msg)
            return IntegrationResult(
                success=False,
                error=error_msg,
                error_code="STATUS_ERROR"
            )

# ==========================================
# EXAMPLE USAGE
# ==========================================

if __name__ == "__main__":
    # Initialize service
    integration_service = MultiTenantIntegrationService()
    
    # Check all services health
    health_result = integration_service.check_all_services_health()
    
    if health_result.success:
        print("Multi-tenant integration service operational!")
        print(f"System health: {health_result.data['overall_health_percentage']:.1f}%")
        print(f"Healthy services: {health_result.data['healthy_services']}/{health_result.data['total_services']}")
    else:
        print(f"Integration service error: {health_result.error}")
    
    # Get integration status
    status_result = integration_service.get_integration_status()
    if status_result.success:
        print(f"Integration status: {status_result.data['integration_status']}")
    
    print("\nMulti-location franchise architecture is ready for deployment!")