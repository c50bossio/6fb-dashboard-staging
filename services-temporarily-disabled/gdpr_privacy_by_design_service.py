"""
GDPR Privacy by Design and DPIA Service - Article 25 Implementation
Implements data protection by design and by default principles,
including Data Protection Impact Assessment (DPIA) framework.

Key Features:
- Privacy by Design implementation and monitoring
- Data Protection Impact Assessment (DPIA) automation
- Privacy engineering guidelines and controls
- Risk assessment and mitigation tracking
- Technical and organizational measures evaluation
- Automated privacy control verification
- DPIA template management and workflow
- Privacy metrics and compliance scoring
"""

import os
import json
import uuid
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Set, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
import hashlib
import aiosqlite
from pathlib import Path

# Import GDPR service components
from .gdpr_compliance_service import (
    gdpr_service, GDPRComplianceService, DataCategory, 
    ProcessingPurpose, LawfulBasis
)

logger = logging.getLogger(__name__)

class PrivacyRisk(Enum):
    """Privacy risk levels for DPIA"""
    MINIMAL = "minimal"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    VERY_HIGH = "very_high"

class DPIAStatus(Enum):
    """DPIA completion status"""
    NOT_REQUIRED = "not_required"
    REQUIRED = "required"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    APPROVED = "approved"
    REJECTED = "rejected"
    UNDER_REVIEW = "under_review"

class PrivacyControl(Enum):
    """Privacy by design controls"""
    DATA_MINIMIZATION = "data_minimization"
    PURPOSE_LIMITATION = "purpose_limitation"
    STORAGE_LIMITATION = "storage_limitation"
    ACCURACY = "accuracy"
    SECURITY = "security"
    TRANSPARENCY = "transparency"
    ACCOUNTABILITY = "accountability"

class TechnicalMeasure(Enum):
    """Technical privacy measures"""
    ENCRYPTION_AT_REST = "encryption_at_rest"
    ENCRYPTION_IN_TRANSIT = "encryption_in_transit"
    ACCESS_CONTROLS = "access_controls"
    AUDIT_LOGGING = "audit_logging"
    DATA_MASKING = "data_masking"
    PSEUDONYMIZATION = "pseudonymization"
    ANONYMIZATION = "anonymization"
    SECURE_DELETION = "secure_deletion"

class OrganizationalMeasure(Enum):
    """Organizational privacy measures"""
    PRIVACY_POLICIES = "privacy_policies"
    STAFF_TRAINING = "staff_training"
    ACCESS_MANAGEMENT = "access_management"
    INCIDENT_RESPONSE = "incident_response"
    VENDOR_MANAGEMENT = "vendor_management"
    DATA_GOVERNANCE = "data_governance"
    PRIVACY_IMPACT_ASSESSMENTS = "privacy_impact_assessments"
    REGULAR_AUDITS = "regular_audits"

@dataclass
class DPIAAssessment:
    """Data Protection Impact Assessment"""
    id: str
    title: str
    description: str
    processing_activity: str
    data_controller: str
    data_processor: Optional[str]
    
    # Scope
    data_categories: List[DataCategory]
    processing_purposes: List[ProcessingPurpose]
    data_subjects: List[str]
    data_sources: List[str]
    data_recipients: List[str]
    
    # Legal basis
    lawful_basis: List[LawfulBasis]
    legitimate_interests: Optional[str]
    
    # Risk assessment
    necessity_assessment: str
    proportionality_assessment: str
    privacy_risks: List[Dict[str, Any]]
    overall_risk_level: PrivacyRisk
    
    # Measures
    technical_measures: List[TechnicalMeasure]
    organizational_measures: List[OrganizationalMeasure]
    safeguards: List[str]
    
    # Consultation
    stakeholders_consulted: List[str]
    dpo_consultation: bool
    supervisory_authority_consultation: bool
    
    # Status and approval
    status: DPIAStatus
    completed_at: Optional[datetime]
    approved_by: Optional[str]
    approved_at: Optional[datetime]
    review_date: Optional[datetime]
    
    # Metadata
    created_by: str
    created_at: datetime
    updated_at: datetime

@dataclass
class PrivacyByDesignAssessment:
    """Privacy by Design compliance assessment"""
    id: str
    system_name: str
    assessment_date: datetime
    assessor: str
    
    # Seven foundational principles scoring (0-100)
    proactive_not_reactive: int
    privacy_as_default: int
    full_functionality: int
    end_to_end_security: int
    visibility_transparency: int
    respect_user_privacy: int
    privacy_embedded_design: int
    
    # Control implementation status
    controls_implemented: Dict[PrivacyControl, bool]
    technical_measures: Dict[TechnicalMeasure, bool]
    organizational_measures: Dict[OrganizationalMeasure, bool]
    
    # Overall scores
    overall_score: float
    compliance_level: str  # excellent, good, satisfactory, needs_improvement, poor
    
    # Recommendations
    recommendations: List[str]
    action_items: List[Dict[str, Any]]
    
    created_at: datetime
    updated_at: datetime

class GDPRPrivacyByDesignService:
    """
    Service implementing Privacy by Design and DPIA framework
    """
    
    def __init__(self, db_path: str = None):
        self.db_path = db_path or "/Users/bossio/6FB AI Agent System/agent_system.db"
        
        # DPIA requirement triggers
        self.dpia_triggers = {
            "high_risk_processing": [
                "systematic_monitoring",
                "large_scale_processing",
                "special_categories",
                "automated_decision_making",  
                "profiling_legal_effects",
                "biometric_identification",
                "genetic_data_processing",
                "location_tracking",
                "children_data_processing",
                "innovative_technology"
            ],
            "data_volume_thresholds": {
                "personal_data_records": 10000,
                "special_category_records": 1000,
                "children_records": 100
            },
            "processing_criteria": {
                "cross_border_transfers": True,
                "ai_automated_processing": True,
                "public_space_monitoring": True,
                "vulnerable_individuals": True
            }
        }
        
        # Privacy by Design principles scoring criteria
        self.privacy_principles = {
            "proactive_not_reactive": {
                "description": "Anticipate and prevent privacy invasions before they occur",
                "indicators": [
                    "privacy_requirements_analysis",
                    "threat_modeling_completed",
                    "privacy_controls_implemented",
                    "proactive_monitoring"
                ]
            },
            "privacy_as_default": {
                "description": "Maximum privacy protection without requiring action from individual",
                "indicators": [
                    "default_privacy_settings",
                    "opt_in_not_opt_out",
                    "minimal_data_collection",
                    "automatic_data_deletion"
                ]
            },
            "full_functionality": {
                "description": "Privacy does not compromise system functionality",
                "indicators": [
                    "feature_completeness",
                    "performance_maintained",
                    "user_experience_preserved",
                    "business_objectives_met"
                ]
            }
        }
        
        # Initialize database and background tasks
        asyncio.create_task(self._init_privacy_tables())
        asyncio.create_task(self._start_privacy_monitoring())
        
        logger.info("GDPR Privacy by Design Service initialized")

    async def _init_privacy_tables(self):
        """Initialize privacy by design database tables"""
        schema_queries = [
            """
            CREATE TABLE IF NOT EXISTS gdpr_dpia_assessments (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT,
                processing_activity TEXT NOT NULL,
                data_controller TEXT NOT NULL,
                data_processor TEXT,
                
                -- Scope
                data_categories TEXT NOT NULL, -- JSON array
                processing_purposes TEXT NOT NULL, -- JSON array
                data_subjects TEXT, -- JSON array
                data_sources TEXT, -- JSON array
                data_recipients TEXT, -- JSON array
                
                -- Legal basis
                lawful_basis TEXT NOT NULL, -- JSON array
                legitimate_interests TEXT,
                
                -- Risk assessment
                necessity_assessment TEXT,
                proportionality_assessment TEXT,
                privacy_risks TEXT, -- JSON array
                overall_risk_level TEXT NOT NULL,
                
                -- Measures
                technical_measures TEXT, -- JSON array
                organizational_measures TEXT, -- JSON array
                safeguards TEXT, -- JSON array
                
                -- Consultation
                stakeholders_consulted TEXT, -- JSON array
                dpo_consultation BOOLEAN DEFAULT 0,
                supervisory_authority_consultation BOOLEAN DEFAULT 0,
                
                -- Status and approval
                status TEXT DEFAULT 'required',
                completed_at TIMESTAMP,
                approved_by TEXT,
                approved_at TIMESTAMP,
                review_date TIMESTAMP,
                
                -- Metadata
                created_by TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS gdpr_privacy_by_design_assessments (
                id TEXT PRIMARY KEY,
                system_name TEXT NOT NULL,
                assessment_date TIMESTAMP NOT NULL,
                assessor TEXT NOT NULL,
                
                -- Seven foundational principles scoring (0-100)
                proactive_not_reactive INTEGER NOT NULL,
                privacy_as_default INTEGER NOT NULL,
                full_functionality INTEGER NOT NULL,
                end_to_end_security INTEGER NOT NULL,
                visibility_transparency INTEGER NOT NULL,
                respect_user_privacy INTEGER NOT NULL,
                privacy_embedded_design INTEGER NOT NULL,
                
                -- Control implementation status
                controls_implemented TEXT NOT NULL, -- JSON
                technical_measures TEXT NOT NULL, -- JSON
                organizational_measures TEXT NOT NULL, -- JSON
                
                -- Overall scores
                overall_score REAL NOT NULL,
                compliance_level TEXT NOT NULL,
                
                -- Recommendations
                recommendations TEXT, -- JSON array
                action_items TEXT, -- JSON array
                
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS gdpr_privacy_controls (
                id TEXT PRIMARY KEY,
                control_type TEXT NOT NULL,
                control_name TEXT NOT NULL,
                description TEXT,
                implementation_status TEXT DEFAULT 'not_implemented',
                implementation_date TIMESTAMP,
                responsible_party TEXT,
                verification_method TEXT,
                last_verified TIMESTAMP,
                verification_status TEXT,
                evidence_location TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS gdpr_privacy_metrics (
                id TEXT PRIMARY KEY,
                metric_name TEXT NOT NULL,
                metric_category TEXT NOT NULL,
                metric_value REAL NOT NULL,
                metric_unit TEXT,
                measurement_date TIMESTAMP NOT NULL,
                target_value REAL,
                threshold_min REAL,
                threshold_max REAL,
                status TEXT, -- meeting_target, below_threshold, above_threshold
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS gdpr_dpia_triggers (
                id TEXT PRIMARY KEY,
                trigger_name TEXT NOT NULL,
                trigger_type TEXT NOT NULL,
                trigger_criteria TEXT NOT NULL, -- JSON
                processing_activity TEXT,
                triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                dpia_required BOOLEAN DEFAULT 1,
                dpia_id TEXT,
                status TEXT DEFAULT 'pending',
                FOREIGN KEY (dpia_id) REFERENCES gdpr_dpia_assessments(id)
            )
            """
        ]
        
        async with aiosqlite.connect(self.db_path) as db:
            for query in schema_queries:
                await db.execute(query)
            await db.commit()

    async def _start_privacy_monitoring(self):
        """Start background privacy monitoring tasks"""
        # Wait for initialization
        await asyncio.sleep(30)
        
        while True:
            try:
                # Check for DPIA trigger conditions
                await self._check_dpia_triggers()
                
                # Monitor privacy controls
                await self._monitor_privacy_controls()
                
                # Update privacy metrics
                await self._update_privacy_metrics()
                
                # Sleep for 6 hours between monitoring cycles
                await asyncio.sleep(21600)
                
            except Exception as e:
                logger.error(f"Privacy monitoring error: {str(e)}")
                await asyncio.sleep(3600)  # Wait 1 hour on error

    async def conduct_dpia(
        self,
        title: str,
        processing_activity: str,
        data_controller: str,
        data_categories: List[DataCategory],
        processing_purposes: List[ProcessingPurpose],
        created_by: str,
        description: str = "",
        data_processor: str = None
    ) -> str:
        """
        Conduct a Data Protection Impact Assessment
        
        Args:
            title: DPIA title
            processing_activity: Description of processing activity
            data_controller: Data controller name
            data_categories: Categories of data being processed
            processing_purposes: Purposes for processing
            created_by: Person conducting the DPIA
            description: Detailed description
            data_processor: Data processor name (if applicable)
            
        Returns:
            DPIA ID
        """
        dpia_id = str(uuid.uuid4())
        now = datetime.utcnow()
        
        # Initial risk assessment
        risk_level = self._assess_initial_risk(data_categories, processing_purposes)
        
        # Create DPIA record
        dpia = DPIAAssessment(
            id=dpia_id,
            title=title,
            description=description,
            processing_activity=processing_activity,
            data_controller=data_controller,
            data_processor=data_processor,
            data_categories=data_categories,
            processing_purposes=processing_purposes,
            data_subjects=[],
            data_sources=[],
            data_recipients=[],
            lawful_basis=[],
            legitimate_interests=None,
            necessity_assessment="",
            proportionality_assessment="",
            privacy_risks=[],
            overall_risk_level=risk_level,
            technical_measures=[],
            organizational_measures=[],
            safeguards=[],
            stakeholders_consulted=[],
            dpo_consultation=False,
            supervisory_authority_consultation=False,
            status=DPIAStatus.IN_PROGRESS,
            completed_at=None,
            approved_by=None,
            approved_at=None,
            review_date=None,
            created_by=created_by,
            created_at=now,
            updated_at=now
        )
        
        # Save to database
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                """
                INSERT INTO gdpr_dpia_assessments
                (id, title, description, processing_activity, data_controller,
                 data_processor, data_categories, processing_purposes,
                 overall_risk_level, status, created_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    dpia_id, title, description, processing_activity,
                    data_controller, data_processor,
                    json.dumps([cat.value for cat in data_categories]),
                    json.dumps([purpose.value for purpose in processing_purposes]),
                    risk_level.value, DPIAStatus.IN_PROGRESS.value, created_by
                )
            )
            await db.commit()
        
        # Log DPIA creation
        await gdpr_service._log_gdpr_action(
            user_id=created_by,
            action="DPIA_CREATED",
            details={
                "dpia_id": dpia_id,
                "processing_activity": processing_activity,
                "risk_level": risk_level.value
            }
        )
        
        logger.info(f"DPIA created: {dpia_id} for processing activity '{processing_activity}'")
        return dpia_id

    def _assess_initial_risk(
        self,
        data_categories: List[DataCategory],
        processing_purposes: List[ProcessingPurpose]
    ) -> PrivacyRisk:
        """Assess initial privacy risk level"""
        risk_score = 0
        
        # High-risk data categories
        high_risk_categories = [
            DataCategory.SPECIAL_CATEGORY,
            DataCategory.FINANCIAL_DATA
        ]
        
        for category in data_categories:
            if category in high_risk_categories:
                risk_score += 30
            elif category == DataCategory.IDENTITY_DATA:
                risk_score += 20
            else:
                risk_score += 10
        
        # High-risk processing purposes
        high_risk_purposes = [
            ProcessingPurpose.AI_PERSONALIZATION,
            ProcessingPurpose.ANALYTICS_INSIGHTS
        ]
        
        for purpose in processing_purposes:
            if purpose in high_risk_purposes:
                risk_score += 25
            else:
                risk_score += 10
        
        # Determine risk level
        if risk_score >= 80:
            return PrivacyRisk.VERY_HIGH
        elif risk_score >= 60:
            return PrivacyRisk.HIGH
        elif risk_score >= 40:
            return PrivacyRisk.MEDIUM
        elif risk_score >= 20:
            return PrivacyRisk.LOW
        else:
            return PrivacyRisk.MINIMAL

    async def update_dpia(
        self,
        dpia_id: str,
        updates: Dict[str, Any],
        updated_by: str
    ) -> bool:
        """Update DPIA with additional information"""
        async with aiosqlite.connect(self.db_path) as db:
            # Build update query dynamically
            set_clauses = []
            params = []
            
            # Map update fields to database columns
            field_mapping = {
                "necessity_assessment": "necessity_assessment",
                "proportionality_assessment": "proportionality_assessment",
                "privacy_risks": "privacy_risks",
                "technical_measures": "technical_measures",
                "organizational_measures": "organizational_measures",
                "safeguards": "safeguards",
                "stakeholders_consulted": "stakeholders_consulted",
                "dpo_consultation": "dpo_consultation",
                "supervisory_authority_consultation": "supervisory_authority_consultation"
            }
            
            for key, value in updates.items():
                if key in field_mapping:
                    db_column = field_mapping[key]
                    set_clauses.append(f"{db_column} = ?")
                    
                    # JSON encode lists and dicts
                    if isinstance(value, (list, dict)):
                        params.append(json.dumps(value))
                    else:
                        params.append(value)
            
            if not set_clauses:
                return False
            
            # Add updated_at timestamp
            set_clauses.append("updated_at = ?")
            params.append(datetime.utcnow().isoformat())
            params.append(dpia_id)
            
            query = f"UPDATE gdpr_dpia_assessments SET {', '.join(set_clauses)} WHERE id = ?"
            await db.execute(query, params)
            affected_rows = db.total_changes
            await db.commit()
            
            if affected_rows > 0:
                # Log the update
                await gdpr_service._log_gdpr_action(
                    user_id=updated_by,
                    action="DPIA_UPDATED",
                    details={
                        "dpia_id": dpia_id,
                        "updated_fields": list(updates.keys())
                    }
                )
                return True
            
            return False

    async def complete_dpia(self, dpia_id: str, completed_by: str) -> bool:
        """Mark DPIA as completed"""
        now = datetime.utcnow()
        review_date = now + timedelta(days=365)  # Annual review
        
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                """
                UPDATE gdpr_dpia_assessments 
                SET status = ?, completed_at = ?, review_date = ?, updated_at = ?
                WHERE id = ?
                """,
                (
                    DPIAStatus.COMPLETED.value, now.isoformat(),
                    review_date.isoformat(), now.isoformat(), dpia_id
                )
            )
            affected_rows = db.total_changes
            await db.commit()
        
        if affected_rows > 0:
            # Log completion
            await gdpr_service._log_gdpr_action(
                user_id=completed_by,
                action="DPIA_COMPLETED",
                details={"dpia_id": dpia_id}
            )
            return True
        
        return False

    async def conduct_privacy_by_design_assessment(
        self,
        system_name: str,
        assessor: str
    ) -> str:
        """
        Conduct Privacy by Design assessment
        
        Args:
            system_name: Name of system being assessed
            assessor: Person conducting assessment
            
        Returns:
            Assessment ID
        """
        assessment_id = str(uuid.uuid4())
        now = datetime.utcnow()
        
        # Gather system information and score principles
        principle_scores = await self._assess_privacy_principles(system_name)
        control_status = await self._assess_privacy_controls(system_name)
        
        # Calculate overall score
        overall_score = sum(principle_scores.values()) / len(principle_scores)
        compliance_level = self._determine_compliance_level(overall_score)
        
        # Generate recommendations
        recommendations = self._generate_privacy_recommendations(
            principle_scores, control_status
        )
        
        assessment = PrivacyByDesignAssessment(
            id=assessment_id,
            system_name=system_name,
            assessment_date=now,
            assessor=assessor,
            proactive_not_reactive=principle_scores["proactive_not_reactive"],
            privacy_as_default=principle_scores["privacy_as_default"],
            full_functionality=principle_scores["full_functionality"],
            end_to_end_security=principle_scores["end_to_end_security"],
            visibility_transparency=principle_scores["visibility_transparency"],
            respect_user_privacy=principle_scores["respect_user_privacy"],
            privacy_embedded_design=principle_scores["privacy_embedded_design"],
            controls_implemented=control_status["controls"],
            technical_measures=control_status["technical"],
            organizational_measures=control_status["organizational"],
            overall_score=overall_score,
            compliance_level=compliance_level,
            recommendations=recommendations,
            action_items=[],  # Generated separately
            created_at=now,
            updated_at=now
        )
        
        # Save to database
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                """
                INSERT INTO gdpr_privacy_by_design_assessments
                (id, system_name, assessment_date, assessor,
                 proactive_not_reactive, privacy_as_default, full_functionality,
                 end_to_end_security, visibility_transparency, respect_user_privacy,
                 privacy_embedded_design, controls_implemented, technical_measures,
                 organizational_measures, overall_score, compliance_level,
                 recommendations)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    assessment_id, system_name, now.isoformat(), assessor,
                    assessment.proactive_not_reactive, assessment.privacy_as_default,
                    assessment.full_functionality, assessment.end_to_end_security,
                    assessment.visibility_transparency, assessment.respect_user_privacy,
                    assessment.privacy_embedded_design,
                    json.dumps({k.value: v for k, v in assessment.controls_implemented.items()}),
                    json.dumps({k.value: v for k, v in assessment.technical_measures.items()}),
                    json.dumps({k.value: v for k, v in assessment.organizational_measures.items()}),
                    assessment.overall_score, assessment.compliance_level,
                    json.dumps(assessment.recommendations)
                )
            )
            await db.commit()
        
        logger.info(f"Privacy by Design assessment completed for {system_name}: {compliance_level} ({overall_score:.1f}%)")
        return assessment_id

    async def _assess_privacy_principles(self, system_name: str) -> Dict[str, int]:
        """Assess the seven Privacy by Design principles"""
        # This would integrate with actual system monitoring
        # For demonstration, we'll use heuristic scoring based on implemented controls
        
        async with aiosqlite.connect(self.db_path) as db:
            # Check implemented controls
            cursor = await db.execute(
                """
                SELECT control_type, implementation_status, verification_status
                FROM gdpr_privacy_controls
                WHERE implementation_status = 'implemented'
                """
            )
            controls = await cursor.fetchall()
        
        implemented_controls = set(row[0] for row in controls if row[2] == 'verified')
        
        # Score each principle based on related controls
        scores = {
            "proactive_not_reactive": self._score_proactive_measures(implemented_controls),
            "privacy_as_default": self._score_default_privacy(implemented_controls),
            "full_functionality": self._score_functionality(implemented_controls),
            "end_to_end_security": self._score_security(implemented_controls),
            "visibility_transparency": self._score_transparency(implemented_controls),
            "respect_user_privacy": self._score_user_privacy(implemented_controls),
            "privacy_embedded_design": self._score_embedded_design(implemented_controls)
        }
        
        return scores

    def _score_proactive_measures(self, controls: Set[str]) -> int:
        """Score proactive privacy measures"""
        proactive_controls = [
            "privacy_impact_assessments", "audit_logging",
            "access_controls", "data_masking"
        ]
        implemented = sum(1 for control in proactive_controls if control in controls)
        return min(100, (implemented / len(proactive_controls)) * 100)

    def _score_default_privacy(self, controls: Set[str]) -> int:
        """Score privacy by default implementation"""
        default_controls = [
            "data_minimization", "purpose_limitation",
            "storage_limitation", "pseudonymization"
        ]
        implemented = sum(1 for control in default_controls if control in controls)
        return min(100, (implemented / len(default_controls)) * 100)

    def _score_functionality(self, controls: Set[str]) -> int:
        """Score full functionality preservation"""
        # This would check if privacy controls impact system functionality
        # For demo, assume good implementation maintains functionality
        return 85

    def _score_security(self, controls: Set[str]) -> int:
        """Score end-to-end security measures"""
        security_controls = [
            "encryption_at_rest", "encryption_in_transit",
            "secure_deletion", "access_controls"
        ]
        implemented = sum(1 for control in security_controls if control in controls)
        return min(100, (implemented / len(security_controls)) * 100)

    def _score_transparency(self, controls: Set[str]) -> int:
        """Score visibility and transparency"""
        transparency_controls = [
            "privacy_policies", "audit_logging", "transparency"
        ]
        implemented = sum(1 for control in transparency_controls if control in controls)
        return min(100, (implemented / len(transparency_controls)) * 100)

    def _score_user_privacy(self, controls: Set[str]) -> int:
        """Score respect for user privacy"""
        user_controls = [
            "data_minimization", "purpose_limitation", "transparency"
        ]
        implemented = sum(1 for control in user_controls if control in controls)
        return min(100, (implemented / len(user_controls)) * 100)

    def _score_embedded_design(self, controls: Set[str]) -> int:
        """Score privacy embedded in design"""
        design_controls = [
            "privacy_by_design", "data_protection_by_default",
            "privacy_impact_assessments"
        ]
        # This would check if privacy was considered in system architecture
        return 80  # Placeholder score

    async def _assess_privacy_controls(self, system_name: str) -> Dict[str, Dict]:
        """Assess implementation status of privacy controls"""
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                "SELECT control_type, control_name, implementation_status FROM gdpr_privacy_controls"
            )
            controls = await cursor.fetchall()
        
        # Group controls by type
        control_status = {
            "controls": {},
            "technical": {},
            "organizational": {}
        }
        
        for control_type, control_name, status in controls:
            implemented = status == "implemented"
            
            if control_type in [pc.value for pc in PrivacyControl]:
                control_status["controls"][PrivacyControl(control_type)] = implemented
            elif control_type in [tm.value for tm in TechnicalMeasure]:
                control_status["technical"][TechnicalMeasure(control_type)] = implemented
            elif control_type in [om.value for om in OrganizationalMeasure]:
                control_status["organizational"][OrganizationalMeasure(control_type)] = implemented
        
        return control_status

    def _determine_compliance_level(self, score: float) -> str:
        """Determine compliance level based on overall score"""
        if score >= 90:
            return "excellent"
        elif score >= 80:
            return "good"
        elif score >= 70:
            return "satisfactory"
        elif score >= 60:
            return "needs_improvement"
        else:
            return "poor"

    def _generate_privacy_recommendations(
        self,
        principle_scores: Dict[str, int],
        control_status: Dict[str, Dict]
    ) -> List[str]:
        """Generate privacy improvement recommendations"""
        recommendations = []
        
        # Check principle scores
        for principle, score in principle_scores.items():
            if score < 70:
                recommendations.append(
                    f"Improve {principle.replace('_', ' ')}: Current score {score}%. "
                    f"Consider implementing additional controls and measures."
                )
        
        # Check missing controls
        for control_type, controls in control_status.items():
            missing_controls = [
                control.value for control, implemented in controls.items()
                if not implemented
            ]
            
            if missing_controls:
                recommendations.append(
                    f"Implement missing {control_type}: {', '.join(missing_controls)}"
                )
        
        return recommendations

    async def _check_dpia_triggers(self):
        """Check for conditions that trigger DPIA requirement"""
        async with aiosqlite.connect(self.db_path) as db:
            # Check for high-risk processing activities
            
            # 1. Check data volume thresholds
            cursor = await db.execute("SELECT COUNT(*) FROM users")
            user_count = (await cursor.fetchone())[0]
            
            if user_count > self.dpia_triggers["data_volume_thresholds"]["personal_data_records"]:
                await self._create_dpia_trigger(
                    "high_volume_personal_data",
                    "data_volume",
                    {"threshold_exceeded": user_count},
                    "User database exceeds DPIA threshold"
                )
            
            # 2. Check for AI/automated processing
            cursor = await db.execute("SELECT COUNT(*) FROM ai_chat_sessions")
            ai_sessions = (await cursor.fetchone())[0]
            
            if ai_sessions > 1000:  # Significant AI processing
                await self._create_dpia_trigger(
                    "ai_automated_processing",
                    "processing_type",
                    {"ai_sessions": ai_sessions},
                    "AI processing activities require DPIA"
                )

    async def _create_dpia_trigger(
        self,
        trigger_name: str,
        trigger_type: str,
        criteria: Dict[str, Any],
        processing_activity: str
    ):
        """Create DPIA trigger record"""
        trigger_id = str(uuid.uuid4())
        
        async with aiosqlite.connect(self.db_path) as db:
            # Check if trigger already exists
            cursor = await db.execute(
                "SELECT id FROM gdpr_dpia_triggers WHERE trigger_name = ? AND status = 'pending'",
                (trigger_name,)
            )
            existing = await cursor.fetchone()
            
            if not existing:
                await db.execute(
                    """
                    INSERT INTO gdpr_dpia_triggers
                    (id, trigger_name, trigger_type, trigger_criteria, processing_activity)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    (
                        trigger_id, trigger_name, trigger_type,
                        json.dumps(criteria), processing_activity
                    )
                )
                await db.commit()
                
                logger.warning(f"DPIA trigger activated: {trigger_name} - {processing_activity}")

    async def _monitor_privacy_controls(self):
        """Monitor implementation status of privacy controls"""
        async with aiosqlite.connect(self.db_path) as db:
            # Check for controls that need verification
            cursor = await db.execute(
                """
                SELECT id, control_name, last_verified FROM gdpr_privacy_controls
                WHERE implementation_status = 'implemented'
                AND (last_verified IS NULL OR last_verified < DATE('now', '-30 days'))
                """
            )
            controls_to_verify = await cursor.fetchall()
            
            for control_id, control_name, last_verified in controls_to_verify:
                # In production, this would trigger actual verification procedures
                logger.info(f"Privacy control verification needed: {control_name}")

    async def _update_privacy_metrics(self):
        """Update privacy compliance metrics"""
        now = datetime.utcnow()
        
        async with aiosqlite.connect(self.db_path) as db:
            # Calculate various privacy metrics
            
            # 1. Data minimization ratio
            cursor = await db.execute("SELECT COUNT(*) FROM users WHERE is_active = 1")
            active_users = (await cursor.fetchone())[0]
            
            cursor = await db.execute("SELECT COUNT(*) FROM users")
            total_users = (await cursor.fetchone())[0]
            
            if total_users > 0:
                minimization_ratio = (active_users / total_users) * 100
                await self._record_privacy_metric(
                    "data_minimization_ratio", "compliance", minimization_ratio,
                    "%", 80.0, 70.0, 100.0, now
                )
            
            # 2. Consent coverage
            cursor = await db.execute(
                """
                SELECT COUNT(DISTINCT user_id) FROM gdpr_consent_records_enhanced
                WHERE consent_status = 'given'
                """
            )
            users_with_consent = (await cursor.fetchone())[0]
            
            if active_users > 0:
                consent_coverage = (users_with_consent / active_users) * 100
                await self._record_privacy_metric(
                    "consent_coverage", "compliance", consent_coverage,
                    "%", 95.0, 90.0, 100.0, now
                )
            
            # 3. Retention compliance
            cursor = await db.execute(
                """
                SELECT COUNT(*) FROM gdpr_retention_schedule
                WHERE status = 'active' AND retention_end_date < DATE('now')
                """
            )
            overdue_retentions = (await cursor.fetchone())[0]
            
            await self._record_privacy_metric(
                "overdue_retentions", "risk", overdue_retentions,
                "count", 0, 0, 10, now
            )

    async def _record_privacy_metric(
        self,
        metric_name: str,
        category: str,
        value: float,
        unit: str,
        target: float,
        threshold_min: float,
        threshold_max: float,
        measurement_date: datetime
    ):
        """Record privacy metric value"""
        metric_id = str(uuid.uuid4())
        
        # Determine status
        if threshold_min <= value <= threshold_max:
            if abs(value - target) <= (target * 0.05):  # Within 5% of target
                status = "meeting_target"
            else:
                status = "acceptable"
        elif value < threshold_min:
            status = "below_threshold"
        else:
            status = "above_threshold"
        
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                """
                INSERT INTO gdpr_privacy_metrics
                (id, metric_name, metric_category, metric_value, metric_unit,
                 measurement_date, target_value, threshold_min, threshold_max, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    metric_id, metric_name, category, value, unit,
                    measurement_date.isoformat(), target, threshold_min,
                    threshold_max, status
                )
            )
            await db.commit()

    async def get_privacy_dashboard(self) -> Dict[str, Any]:
        """Get privacy compliance dashboard data"""
        async with aiosqlite.connect(self.db_path) as db:
            # DPIA status
            cursor = await db.execute(
                """
                SELECT status, COUNT(*) FROM gdpr_dpia_assessments
                GROUP BY status
                """
            )
            dpia_status = dict(await cursor.fetchall())
            
            # Privacy by Design assessments
            cursor = await db.execute(
                """
                SELECT compliance_level, COUNT(*) FROM gdpr_privacy_by_design_assessments
                GROUP BY compliance_level
                """
            )
            pbd_assessments = dict(await cursor.fetchall())
            
            # Recent privacy metrics
            cursor = await db.execute(
                """
                SELECT metric_name, metric_value, status FROM gdpr_privacy_metrics
                WHERE measurement_date >= DATE('now', '-7 days')
                ORDER BY measurement_date DESC
                """
            )
            recent_metrics = await cursor.fetchall()
            
            # Privacy controls implementation
            cursor = await db.execute(
                """
                SELECT implementation_status, COUNT(*) FROM gdpr_privacy_controls
                GROUP BY implementation_status
                """
            )
            control_status = dict(await cursor.fetchall())
        
        return {
            "dpia_assessments": dpia_status,
            "privacy_by_design_assessments": pbd_assessments,
            "recent_metrics": [
                {"name": row[0], "value": row[1], "status": row[2]}
                for row in recent_metrics
            ],
            "privacy_controls": control_status,
            "last_updated": datetime.utcnow().isoformat()
        }

    async def health_check(self) -> Dict[str, Any]:
        """Health check for privacy by design service"""
        try:
            async with aiosqlite.connect(self.db_path) as db:
                # Count DPIAs by status
                cursor = await db.execute(
                    """
                    SELECT status, COUNT(*) FROM gdpr_dpia_assessments
                    GROUP BY status
                    """
                )
                dpia_counts = dict(await cursor.fetchall())
                
                # Count privacy assessments
                cursor = await db.execute(
                    "SELECT COUNT(*) FROM gdpr_privacy_by_design_assessments"
                )
                pbd_count = (await cursor.fetchone())[0]
                
                # Check for pending DPIA triggers
                cursor = await db.execute(
                    "SELECT COUNT(*) FROM gdpr_dpia_triggers WHERE status = 'pending'"
                )
                pending_triggers = (await cursor.fetchone())[0]
                
                # Count implemented privacy controls
                cursor = await db.execute(
                    """
                    SELECT COUNT(*) FROM gdpr_privacy_controls
                    WHERE implementation_status = 'implemented'
                    """
                )
                implemented_controls = (await cursor.fetchone())[0]
            
            return {
                "status": "healthy",
                "dpia_assessments_by_status": dpia_counts,
                "privacy_by_design_assessments": pbd_count,
                "pending_dpia_triggers": pending_triggers,
                "implemented_privacy_controls": implemented_controls,
                "database_connected": True,
                "last_check": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Privacy by design service health check failed: {str(e)}")
            return {
                "status": "unhealthy",
                "error": str(e),
                "last_check": datetime.utcnow().isoformat()
            }

# Initialize privacy by design service instance
privacy_by_design_service = GDPRPrivacyByDesignService()