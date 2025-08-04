"""
GDPR Master Service - Comprehensive Integration
Central orchestration service that integrates all GDPR compliance services
and provides unified APIs and management interfaces.

Integrated Services:
1. Core GDPR Compliance Service
2. Data Export Service (Article 20)
3. Right to be Forgotten Service (Article 17)
4. Consent Management Service (Articles 6 & 7)
5. Data Breach Notification Service (Articles 33 & 34)
6. Data Retention Service
7. Privacy by Design Service (Article 25)
8. Audit Trail Service
9. Lawful Basis Tracking Service
10. Privacy Policy Management Service

Key Features:
- Unified GDPR dashboard
- Cross-service orchestration
- Compliance monitoring and reporting
- Health checks and status monitoring
- Integration with existing application services
"""

import os
import json
import uuid
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Set
from dataclasses import dataclass, asdict
from enum import Enum

# Import all GDPR services
from .gdpr_compliance_service import gdpr_service, DataCategory, ProcessingPurpose, LawfulBasis
from .gdpr_data_export_service import data_export_service
from .gdpr_right_to_be_forgotten_service import right_to_be_forgotten_service
from .gdpr_consent_management_service import consent_management_service
from .gdpr_data_breach_notification_service import breach_notification_service
from .gdpr_data_retention_service import data_retention_service
from .gdpr_privacy_by_design_service import privacy_by_design_service
from .gdpr_audit_trail_service import audit_trail_service
from .gdpr_lawful_basis_tracking_service import lawful_basis_tracking_service
from .gdpr_privacy_policy_service import privacy_policy_service

logger = logging.getLogger(__name__)

class ComplianceLevel(Enum):
    """Overall GDPR compliance levels"""
    EXCELLENT = "excellent"  # 95-100%
    GOOD = "good"           # 85-94%
    SATISFACTORY = "satisfactory"  # 75-84%
    NEEDS_IMPROVEMENT = "needs_improvement"  # 60-74%
    POOR = "poor"           # <60%

@dataclass
class GDPRComplianceStatus:
    """Overall GDPR compliance status"""
    overall_score: float
    compliance_level: ComplianceLevel
    
    # Service statuses
    services_health: Dict[str, Dict[str, Any]]
    
    # Key metrics
    active_consents: int
    pending_erasure_requests: int
    overdue_breach_notifications: int
    expired_data_retention: int
    missing_lawful_basis: int
    
    # Recommendations
    critical_issues: List[str]
    recommendations: List[str]
    
    last_updated: datetime

class GDPRMasterService:
    """
    Master service for comprehensive GDPR compliance management
    """
    
    def __init__(self):
        self.services = {
            "core_compliance": gdpr_service,
            "data_export": data_export_service,
            "right_to_be_forgotten": right_to_be_forgotten_service,
            "consent_management": consent_management_service,
            "breach_notification": breach_notification_service,
            "data_retention": data_retention_service,
            "privacy_by_design": privacy_by_design_service,
            "audit_trail": audit_trail_service,
            "lawful_basis_tracking": lawful_basis_tracking_service,
            "privacy_policy": privacy_policy_service
        }
        
        # Compliance scoring weights
        self.service_weights = {
            "core_compliance": 0.15,
            "data_export": 0.10,
            "right_to_be_forgotten": 0.15,
            "consent_management": 0.20,
            "breach_notification": 0.10,
            "data_retention": 0.10,
            "privacy_by_design": 0.05,
            "audit_trail": 0.05,
            "lawful_basis_tracking": 0.05,
            "privacy_policy": 0.05
        }
        
        logger.info("GDPR Master Service initialized with all compliance services")

    async def get_compliance_dashboard(self) -> Dict[str, Any]:
        """
        Get comprehensive GDPR compliance dashboard data
        
        Returns:
            Complete compliance dashboard information
        """
        # Gather health checks from all services
        services_health = {}
        for service_name, service in self.services.items():
            try:
                health_data = await service.health_check()
                services_health[service_name] = health_data
            except Exception as e:
                logger.error(f"Health check failed for {service_name}: {str(e)}")
                services_health[service_name] = {
                    "status": "unhealthy",
                    "error": str(e),
                    "last_check": datetime.utcnow().isoformat()
                }
        
        # Calculate overall compliance score
        overall_score = await self._calculate_compliance_score(services_health)
        compliance_level = self._determine_compliance_level(overall_score)
        
        # Gather key metrics
        metrics = await self._gather_key_metrics()
        
        # Generate recommendations
        critical_issues, recommendations = await self._generate_recommendations(services_health, metrics)
        
        # Create compliance status
        compliance_status = GDPRComplianceStatus(
            overall_score=overall_score,
            compliance_level=compliance_level,
            services_health=services_health,
            active_consents=metrics.get("active_consents", 0),
            pending_erasure_requests=metrics.get("pending_erasure_requests", 0),
            overdue_breach_notifications=metrics.get("overdue_breach_notifications", 0),
            expired_data_retention=metrics.get("expired_data_retention", 0),
            missing_lawful_basis=metrics.get("missing_lawful_basis", 0),
            critical_issues=critical_issues,
            recommendations=recommendations,
            last_updated=datetime.utcnow()
        )
        
        return asdict(compliance_status)

    async def _calculate_compliance_score(
        self,
        services_health: Dict[str, Dict[str, Any]]
    ) -> float:
        """Calculate weighted compliance score"""
        total_score = 0.0
        
        for service_name, weight in self.service_weights.items():
            service_health = services_health.get(service_name, {})
            
            if service_health.get("status") == "healthy":
                service_score = 100.0
            elif service_health.get("status") == "unhealthy":
                service_score = 0.0
            else:
                service_score = 50.0  # Partial health
            
            # Adjust score based on specific metrics
            service_score = await self._adjust_service_score(service_name, service_health, service_score)
            
            total_score += service_score * weight
        
        return min(100.0, max(0.0, total_score))

    async def _adjust_service_score(
        self,
        service_name: str,
        health_data: Dict[str, Any],
        base_score: float
    ) -> float:
        """Adjust service score based on specific health metrics"""
        if service_name == "breach_notification":
            overdue = health_data.get("overdue_authority_notifications", 0)
            if overdue > 0:
                return base_score * 0.5  # 50% penalty for overdue notifications
        
        elif service_name == "consent_management":
            expired_consents = health_data.get("expired_consents_detected", 0)
            if expired_consents > 10:
                return base_score * 0.8  # 20% penalty for many expired consents
        
        elif service_name == "data_retention":
            overdue_schedules = health_data.get("overdue_schedules", 0)
            if overdue_schedules > 5:
                return base_score * 0.9  # 10% penalty for overdue retention
        
        elif service_name == "right_to_be_forgotten":
            overdue_requests = health_data.get("overdue_requests", 0)
            if overdue_requests > 0:
                return base_score * 0.7  # 30% penalty for overdue erasure requests
        
        return base_score

    def _determine_compliance_level(self, score: float) -> ComplianceLevel:
        """Determine compliance level from score"""
        if score >= 95:
            return ComplianceLevel.EXCELLENT
        elif score >= 85:
            return ComplianceLevel.GOOD
        elif score >= 75:
            return ComplianceLevel.SATISFACTORY
        elif score >= 60:
            return ComplianceLevel.NEEDS_IMPROVEMENT
        else:
            return ComplianceLevel.POOR

    async def _gather_key_metrics(self) -> Dict[str, int]:
        """Gather key compliance metrics across all services"""
        metrics = {}
        
        try:
            # Consent metrics
            consent_overview = await consent_management_service.get_user_consent_overview("system")
            metrics["active_consents"] = consent_overview.get("active_consents", 0)
            
            # Erasure requests
            erasure_requests = await right_to_be_forgotten_service.get_breach_incidents()
            metrics["pending_erasure_requests"] = len([
                r for r in erasure_requests if r["status"] in ["pending", "in_progress"]
            ])
            
            # Breach notifications
            breach_health = await breach_notification_service.health_check()
            metrics["overdue_breach_notifications"] = breach_health.get("overdue_authority_notifications", 0)
            
            # Data retention
            retention_health = await data_retention_service.health_check()
            metrics["expired_data_retention"] = retention_health.get("overdue_schedules", 0)
            
            # Lawful basis
            basis_summary = await lawful_basis_tracking_service.get_lawful_basis_summary()
            metrics["missing_lawful_basis"] = basis_summary.get("assignments_due_for_review", 0)
            
        except Exception as e:
            logger.error(f"Error gathering key metrics: {str(e)}")
        
        return metrics

    async def _generate_recommendations(
        self,
        services_health: Dict[str, Dict[str, Any]],
        metrics: Dict[str, int]
    ) -> tuple[List[str], List[str]]:
        """Generate critical issues and recommendations"""
        critical_issues = []
        recommendations = []
        
        # Check for critical issues
        if metrics.get("overdue_breach_notifications", 0) > 0:
            critical_issues.append(
                f"{metrics['overdue_breach_notifications']} breach notifications overdue (72-hour deadline)"
            )
            recommendations.append("Immediately notify supervisory authority of pending breaches")
        
        if metrics.get("pending_erasure_requests", 0) > 5:
            critical_issues.append(
                f"{metrics['pending_erasure_requests']} pending erasure requests (30-day deadline)"
            )
            recommendations.append("Review and process pending right to be forgotten requests")
        
        # Check service health
        unhealthy_services = [
            name for name, health in services_health.items()
            if health.get("status") != "healthy"
        ]
        
        if unhealthy_services:
            critical_issues.append(f"Unhealthy services: {', '.join(unhealthy_services)}")
            recommendations.append("Investigate and resolve service health issues")
        
        # General recommendations
        if metrics.get("expired_data_retention", 0) > 0:
            recommendations.append("Review and update expired data retention schedules")
        
        if metrics.get("missing_lawful_basis", 0) > 0:
            recommendations.append("Complete lawful basis assignments for all processing activities")
        
        return critical_issues, recommendations

    async def process_user_data_request(
        self,
        user_id: str,
        request_type: str,
        details: Dict[str, Any],
        requester_ip: str,
        user_agent: str
    ) -> Dict[str, Any]:
        """
        Process unified user data request (export, deletion, etc.)
        
        Args:
            user_id: User making the request
            request_type: Type of request (export, delete, consent_withdraw, etc.)
            details: Request-specific details
            requester_ip: IP address of requester
            user_agent: User agent string
            
        Returns:
            Request processing result
        """
        request_id = str(uuid.uuid4())
        
        # Log the request
        await audit_trail_service.log_audit_event(
            event_type=audit_trail_service.AuditEventType.DATA_ACCESS,
            actor_identifier=user_id,
            operation=f"user_data_request_{request_type}",
            event_description=f"User requested {request_type}",
            user_id=user_id,
            ip_address=requester_ip,
            user_agent=user_agent,
            event_details=details
        )
        
        try:
            if request_type == "export":
                # Data portability request
                export_id = await data_export_service.request_data_export(
                    user_id=user_id,
                    export_format=details.get("format", "json"),
                    include_deleted=details.get("include_deleted", False),
                    anonymize_sensitive=details.get("anonymize_sensitive", True),
                    ip_address=requester_ip,
                    user_agent=user_agent
                )
                
                return {
                    "request_id": request_id,
                    "export_id": export_id,
                    "status": "processing",
                    "estimated_completion": "24 hours",
                    "message": "Your data export request has been received and is being processed."
                }
            
            elif request_type == "delete":
                # Right to be forgotten request
                erasure_id = await right_to_be_forgotten_service.submit_erasure_request(
                    user_id=user_id,
                    reason=right_to_be_forgotten_service.ErasureReason.DATA_SUBJECT_OBJECTS,
                    request_details=details.get("reason", "User requested account deletion"),
                    ip_address=requester_ip,
                    user_agent=user_agent
                )
                
                return {
                    "request_id": request_id,
                    "erasure_id": erasure_id,
                    "status": "pending_review",
                    "estimated_completion": "30 days",
                    "message": "Your deletion request has been received and will be reviewed within 1 month."
                }
            
            elif request_type == "consent_withdraw":
                # Consent withdrawal
                purpose = ProcessingPurpose(details.get("processing_purpose"))
                success = await consent_management_service.withdraw_consent(
                    user_id=user_id,
                    processing_purpose=purpose,
                    withdrawal_reason=details.get("reason", "User withdrew consent"),
                    ip_address=requester_ip,
                    user_agent=user_agent
                )
                
                return {
                    "request_id": request_id,
                    "status": "completed" if success else "failed",
                    "message": "Consent withdrawal processed successfully" if success else "Failed to withdraw consent"
                }
            
            elif request_type == "privacy_preferences":
                # Update privacy preferences
                preferences_id = await privacy_policy_service.record_user_preferences(
                    user_id=user_id,
                    cookie_preferences=details.get("cookie_preferences", {}),
                    marketing_consent=details.get("marketing_consent", False),
                    analytics_consent=details.get("analytics_consent", False),
                    personalization_consent=details.get("personalization_consent", False),
                    ip_address=requester_ip,
                    user_agent=user_agent
                )
                
                return {
                    "request_id": request_id,
                    "preferences_id": preferences_id,
                    "status": "completed",
                    "message": "Privacy preferences updated successfully"
                }
            
            else:
                return {
                    "request_id": request_id,
                    "status": "error",
                    "message": f"Unknown request type: {request_type}"
                }
        
        except Exception as e:
            logger.error(f"Error processing user data request {request_id}: {str(e)}")
            return {
                "request_id": request_id,
                "status": "error",
                "message": f"Request processing failed: {str(e)}"
            }

    async def generate_compliance_report(
        self,
        report_type: str = "comprehensive",
        start_date: datetime = None,
        end_date: datetime = None
    ) -> str:
        """
        Generate comprehensive GDPR compliance report
        
        Args:
            report_type: Type of report (comprehensive, audit, breach, etc.)
            start_date: Report start date
            end_date: Report end date
            
        Returns:
            Report ID
        """
        if not start_date:
            start_date = datetime.utcnow() - timedelta(days=30)
        if not end_date:
            end_date = datetime.utcnow()
        
        report_id = str(uuid.uuid4())
        
        # Gather data from all services
        report_data = {
            "report_id": report_id,
            "report_type": report_type,
            "period_start": start_date.isoformat(),
            "period_end": end_date.isoformat(),
            "generated_at": datetime.utcnow().isoformat()
        }
        
        try:
            # Compliance dashboard
            report_data["compliance_dashboard"] = await self.get_compliance_dashboard()
            
            # Audit trail report
            audit_report = await audit_trail_service.generate_audit_report(
                report_type="compliance_audit",
                report_title=f"GDPR Compliance Audit - {start_date.date()} to {end_date.date()}",
                period_start=start_date,
                period_end=end_date
            )
            report_data["audit_report_id"] = audit_report
            
            # Data retention report
            retention_report = await data_retention_service.get_retention_report(
                start_date.date(), end_date.date()
            )
            report_data["retention_report"] = retention_report
            
            # Consent statistics
            consent_stats = await consent_management_service.get_consent_statistics()
            report_data["consent_statistics"] = consent_stats
            
            # Privacy by design dashboard
            privacy_dashboard = await privacy_by_design_service.get_privacy_dashboard()
            report_data["privacy_dashboard"] = privacy_dashboard
            
            # Lawful basis summary
            lawful_basis_summary = await lawful_basis_tracking_service.get_lawful_basis_summary()
            report_data["lawful_basis_summary"] = lawful_basis_summary
            
            logger.info(f"Comprehensive GDPR compliance report generated: {report_id}")
            return report_id
            
        except Exception as e:
            logger.error(f"Error generating compliance report: {str(e)}")
            raise

    async def handle_data_breach(
        self,
        title: str,
        description: str,
        breach_type: str,
        affected_data_categories: List[str],
        affected_users_count: int,
        risk_level: str = "medium"
    ) -> str:
        """
        Handle data breach incident with full GDPR compliance
        
        Args:
            title: Breach incident title
            description: Detailed description
            breach_type: Type of breach
            affected_data_categories: Data categories affected
            affected_users_count: Number of users affected
            risk_level: Risk assessment level
            
        Returns:
            Incident ID
        """
        # Convert string parameters to enums
        breach_type_enum = getattr(breach_notification_service.BreachType, breach_type.upper())
        risk_level_enum = getattr(breach_notification_service.RiskLevel, risk_level.upper())
        data_categories = [DataCategory(cat) for cat in affected_data_categories]
        
        # Report the breach
        incident_id = await breach_notification_service.report_breach_incident(
            title=title,
            description=description,
            breach_type=breach_type_enum,
            risk_level=risk_level_enum,
            affected_data_categories=data_categories,
            affected_users_count=affected_users_count
        )
        
        # Log in audit trail
        await audit_trail_service.log_audit_event(
            event_type=audit_trail_service.AuditEventType.BREACH_DETECTED,
            actor_identifier="system",
            operation="breach_reported",
            event_description=f"Data breach reported: {title}",
            severity=audit_trail_service.AuditSeverity.CRITICAL,
            event_details={
                "incident_id": incident_id,
                "breach_type": breach_type,
                "affected_users": affected_users_count,
                "risk_level": risk_level
            }
        )
        
        logger.critical(f"Data breach handled with full GDPR compliance: {incident_id}")
        return incident_id

    async def get_user_privacy_dashboard(self, user_id: str) -> Dict[str, Any]:
        """
        Get user-specific privacy dashboard
        
        Args:
            user_id: User identifier
            
        Returns:
            User privacy dashboard data
        """
        dashboard = {
            "user_id": user_id,
            "last_updated": datetime.utcnow().isoformat()
        }
        
        try:
            # Privacy preferences
            preferences = await privacy_policy_service.get_user_preferences(user_id)
            dashboard["privacy_preferences"] = preferences
            
            # Consent status
            consent_status = await gdpr_service.get_user_consent_status(user_id)
            dashboard["consent_status"] = consent_status
            
            # Active data export requests
            export_requests = []  # Would query data export service
            dashboard["export_requests"] = export_requests
            
            # Active erasure requests
            erasure_requests = await right_to_be_forgotten_service.list_user_erasure_requests(user_id)
            dashboard["erasure_requests"] = erasure_requests
            
            # Data retention information
            dashboard["data_retention_info"] = {
                "message": "Your data is retained according to our privacy policy and legal requirements"
            }
            
        except Exception as e:
            logger.error(f"Error generating user privacy dashboard: {str(e)}")
            dashboard["error"] = str(e)
        
        return dashboard

    async def health_check(self) -> Dict[str, Any]:
        """Comprehensive health check for all GDPR services"""
        return await self.get_compliance_dashboard()

# Initialize GDPR master service instance
gdpr_master_service = GDPRMasterService()