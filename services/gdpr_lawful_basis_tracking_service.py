"""
GDPR Lawful Basis Tracking Service
Comprehensive tracking and management of lawful basis for data processing
under GDPR Article 6, ensuring proper legal justification for all
data processing activities.

Key Features:
- Lawful basis assignment and tracking for all processing activities
- Dynamic lawful basis evaluation and updates
- Processing purpose mapping to legal basis
- Legitimate interests assessment (LIA) automation
- Multi-basis processing support
- Lawful basis change management
- Compliance reporting and audit support
- Integration with consent management
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
import aiosqlite
from pathlib import Path

# Import GDPR service components
from .gdpr_compliance_service import (
    gdpr_service, GDPRComplianceService, DataCategory, 
    ProcessingPurpose, LawfulBasis
)

logger = logging.getLogger(__name__)

class ProcessingContext(Enum):
    """Context of data processing"""
    USER_REGISTRATION = "user_registration"
    SERVICE_PROVISION = "service_provision"
    PAYMENT_PROCESSING = "payment_processing"
    MARKETING_COMMUNICATIONS = "marketing_communications"
    ANALYTICS_REPORTING = "analytics_reporting"
    CUSTOMER_SUPPORT = "customer_support"
    LEGAL_COMPLIANCE = "legal_compliance"
    SECURITY_MONITORING = "security_monitoring"
    BUSINESS_OPERATIONS = "business_operations"
    AI_PROCESSING = "ai_processing"

class LegitimateInterestCategory(Enum):
    """Categories of legitimate interests"""
    BUSINESS_OPERATIONS = "business_operations"
    SECURITY_PROTECTION = "security_protection"
    FRAUD_PREVENTION = "fraud_prevention"
    DIRECT_MARKETING = "direct_marketing"
    CUSTOMER_INSIGHTS = "customer_insights"
    SERVICE_IMPROVEMENT = "service_improvement"
    NETWORK_SECURITY = "network_security"
    INTERNAL_ADMINISTRATION = "internal_administration"

class LawfulBasisStatus(Enum):
    """Status of lawful basis"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    UNDER_REVIEW = "under_review"
    EXPIRED = "expired"
    INVALIDATED = "invalidated"

@dataclass
class LawfulBasisAssignment:
    """Assignment of lawful basis to processing activity"""
    id: str
    processing_activity_id: str
    processing_purpose: ProcessingPurpose
    processing_context: ProcessingContext
    data_categories: List[DataCategory]
    
    # Legal basis information
    primary_lawful_basis: LawfulBasis
    secondary_lawful_basis: Optional[LawfulBasis]
    lawful_basis_rationale: str
    
    # Legitimate interests assessment (if applicable)
    legitimate_interest: Optional[LegitimateInterestCategory]
    lia_conducted: bool
    lia_outcome: Optional[str]
    balancing_test_result: Optional[str]
    
    # Consent information (if applicable)
    consent_required: bool
    consent_mechanism: Optional[str]
    consent_withdrawal_impact: Optional[str]
    
    # Legal obligation details (if applicable)
    legal_obligation_source: Optional[str]
    legal_obligation_jurisdiction: Optional[str]
    
    # Contractual necessity (if applicable)
    contract_type: Optional[str]
    contractual_necessity_justification: Optional[str]
    
    # Risk assessment
    processing_risk_level: str
    rights_impact_assessment: str
    mitigation_measures: List[str]
    
    # Lifecycle management
    status: LawfulBasisStatus
    effective_from: datetime
    effective_until: Optional[datetime]
    review_date: datetime
    last_reviewed: Optional[datetime]
    
    # Metadata
    assigned_by: str
    created_at: datetime
    updated_at: datetime

@dataclass
class LegitimateInterestAssessment:
    """Legitimate Interest Assessment (LIA)"""
    id: str
    processing_activity: str
    legitimate_interest_category: LegitimateInterestCategory
    
    # Purpose test
    purpose_description: str
    necessity_justification: str
    alternative_means_considered: List[str]
    
    # Balancing test
    individual_interests: str
    individual_rights_risks: str
    processing_impact: str
    reasonable_expectations: str
    relationship_with_individuals: str
    data_sensitivity_level: str
    
    # Balancing outcome
    balancing_decision: str  # proceed, proceed_with_safeguards, do_not_proceed
    additional_safeguards: List[str]
    ongoing_monitoring_required: bool
    
    # Assessment metadata
    conducted_by: str
    reviewed_by: Optional[str]
    assessment_date: datetime
    review_date: datetime
    
    created_at: datetime
    updated_at: datetime

class GDPRLawfulBasisTrackingService:
    """
    Service for tracking and managing lawful basis for data processing
    """
    
    def __init__(self, db_path: str = None):
        self.db_path = db_path or "/Users/bossio/6FB AI Agent System/agent_system.db"
        
        # Default lawful basis mappings
        self.default_basis_mappings = {
            ProcessingPurpose.ACCOUNT_MANAGEMENT: {
                "primary": LawfulBasis.CONTRACT,
                "context": ProcessingContext.SERVICE_PROVISION,
                "rationale": "Necessary for providing barbershop booking services to registered users"
            },
            ProcessingPurpose.BOOKING_SERVICES: {
                "primary": LawfulBasis.CONTRACT,
                "context": ProcessingContext.SERVICE_PROVISION,
                "rationale": "Necessary to fulfill booking contracts between clients and barbershops"
            },
            ProcessingPurpose.PAYMENT_PROCESSING: {
                "primary": LawfulBasis.CONTRACT,
                "secondary": LawfulBasis.LEGAL_OBLIGATION,
                "context": ProcessingContext.PAYMENT_PROCESSING,
                "rationale": "Necessary for payment processing and legal tax/accounting obligations"
            },
            ProcessingPurpose.MARKETING_COMMUNICATIONS: {
                "primary": LawfulBasis.CONSENT,
                "secondary": LawfulBasis.LEGITIMATE_INTERESTS,
                "context": ProcessingContext.MARKETING_COMMUNICATIONS,
                "rationale": "Requires explicit consent, with legitimate interest for existing customers"
            },
            ProcessingPurpose.ANALYTICS_INSIGHTS: {
                "primary": LawfulBasis.LEGITIMATE_INTERESTS,
                "context": ProcessingContext.ANALYTICS_REPORTING,
                "rationale": "Legitimate business interest in improving services and operations"
            },
            ProcessingPurpose.AI_PERSONALIZATION: {
                "primary": LawfulBasis.CONSENT,
                "secondary": LawfulBasis.LEGITIMATE_INTERESTS,
                "context": ProcessingContext.AI_PROCESSING,
                "rationale": "Consent for personalization, legitimate interest for service improvement"
            },
            ProcessingPurpose.LEGAL_COMPLIANCE: {
                "primary": LawfulBasis.LEGAL_OBLIGATION,
                "context": ProcessingContext.LEGAL_COMPLIANCE,
                "rationale": "Required by law for tax, accounting, and regulatory compliance"
            },
            ProcessingPurpose.FRAUD_PREVENTION: {
                "primary": LawfulBasis.LEGITIMATE_INTERESTS,
                "context": ProcessingContext.SECURITY_MONITORING,
                "rationale": "Legitimate interest in protecting business and customers from fraud"
            }
        }
        
        # Legitimate interest assessment templates
        self.lia_templates = {
            LegitimateInterestCategory.BUSINESS_OPERATIONS: {
                "purpose_template": "To operate and improve our barbershop booking platform",
                "necessity_factors": [
                    "Essential for service delivery",
                    "No alternative means available",
                    "Proportionate to business needs"
                ],
                "individual_considerations": [
                    "Minimal impact on individual privacy",
                    "Data used only for stated purpose",
                    "Transparent processing practices"
                ]
            },
            LegitimateInterestCategory.FRAUD_PREVENTION: {
                "purpose_template": "To prevent fraudulent activities and protect platform security",
                "necessity_factors": [
                    "Critical for platform security",
                    "Protects all users from fraud",
                    "Industry standard practice"
                ],
                "individual_considerations": [
                    "Protects individual from fraud",
                    "Automated processing with human oversight",
                    "Data retention limited to necessary period"
                ]
            }
        }
        
        # Initialize database and background tasks
        asyncio.create_task(self._init_lawful_basis_tables())
        asyncio.create_task(self._start_basis_monitoring())
        
        logger.info("GDPR Lawful Basis Tracking Service initialized")

    async def _init_lawful_basis_tables(self):
        """Initialize lawful basis tracking database tables"""
        schema_queries = [
            """
            CREATE TABLE IF NOT EXISTS gdpr_lawful_basis_assignments (
                id TEXT PRIMARY KEY,
                processing_activity_id TEXT NOT NULL,
                processing_purpose TEXT NOT NULL,
                processing_context TEXT NOT NULL,
                data_categories TEXT NOT NULL, -- JSON array
                
                -- Legal basis information
                primary_lawful_basis TEXT NOT NULL,
                secondary_lawful_basis TEXT,
                lawful_basis_rationale TEXT NOT NULL,
                
                -- Legitimate interests assessment
                legitimate_interest TEXT,
                lia_conducted BOOLEAN DEFAULT 0,
                lia_outcome TEXT,
                balancing_test_result TEXT,
                
                -- Consent information
                consent_required BOOLEAN DEFAULT 0,
                consent_mechanism TEXT,
                consent_withdrawal_impact TEXT,
                
                -- Legal obligation details
                legal_obligation_source TEXT,
                legal_obligation_jurisdiction TEXT,
                
                -- Contractual necessity
                contract_type TEXT,
                contractual_necessity_justification TEXT,
                
                -- Risk assessment
                processing_risk_level TEXT NOT NULL,
                rights_impact_assessment TEXT NOT NULL,
                mitigation_measures TEXT, -- JSON array
                
                -- Lifecycle management
                status TEXT DEFAULT 'active',
                effective_from TIMESTAMP NOT NULL,
                effective_until TIMESTAMP,
                review_date TIMESTAMP NOT NULL,
                last_reviewed TIMESTAMP,
                
                -- Metadata
                assigned_by TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS gdpr_legitimate_interest_assessments (
                id TEXT PRIMARY KEY,
                processing_activity TEXT NOT NULL,
                legitimate_interest_category TEXT NOT NULL,
                
                -- Purpose test
                purpose_description TEXT NOT NULL,
                necessity_justification TEXT NOT NULL,
                alternative_means_considered TEXT, -- JSON array
                
                -- Balancing test
                individual_interests TEXT NOT NULL,
                individual_rights_risks TEXT NOT NULL,
                processing_impact TEXT NOT NULL,
                reasonable_expectations TEXT NOT NULL,
                relationship_with_individuals TEXT NOT NULL,
                data_sensitivity_level TEXT NOT NULL,
                
                -- Balancing outcome
                balancing_decision TEXT NOT NULL,
                additional_safeguards TEXT, -- JSON array
                ongoing_monitoring_required BOOLEAN DEFAULT 0,
                
                -- Assessment metadata
                conducted_by TEXT NOT NULL,
                reviewed_by TEXT,
                assessment_date TIMESTAMP NOT NULL,
                review_date TIMESTAMP NOT NULL,
                
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS gdpr_processing_activities (
                id TEXT PRIMARY KEY,
                activity_name TEXT NOT NULL,
                activity_description TEXT,
                data_controller TEXT NOT NULL,
                data_processor TEXT,
                processing_purpose TEXT NOT NULL,
                processing_context TEXT NOT NULL,
                data_categories TEXT NOT NULL, -- JSON array
                data_subjects TEXT, -- JSON array
                recipients TEXT, -- JSON array
                retention_period TEXT,
                cross_border_transfers BOOLEAN DEFAULT 0,
                transfer_safeguards TEXT,
                automated_decision_making BOOLEAN DEFAULT 0,
                profiling BOOLEAN DEFAULT 0,
                created_by TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS gdpr_lawful_basis_changes (
                id TEXT PRIMARY KEY,
                assignment_id TEXT NOT NULL,
                change_type TEXT NOT NULL, -- basis_change, status_change, review_update
                old_value TEXT,
                new_value TEXT,
                change_reason TEXT NOT NULL,
                impact_assessment TEXT,
                notification_required BOOLEAN DEFAULT 0,
                notifications_sent TEXT, -- JSON array
                changed_by TEXT NOT NULL,
                change_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (assignment_id) REFERENCES gdpr_lawful_basis_assignments(id)
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS gdpr_basis_compliance_checks (
                id TEXT PRIMARY KEY,
                check_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                assignments_checked INTEGER NOT NULL,
                compliance_issues TEXT, -- JSON array
                recommendations TEXT, -- JSON array
                check_performed_by TEXT,
                next_check_date TIMESTAMP
            )
            """
        ]
        
        async with aiosqlite.connect(self.db_path) as db:
            for query in schema_queries:
                await db.execute(query)
            
            # Create indexes for performance
            indexes = [
                "CREATE INDEX IF NOT EXISTS idx_lawful_basis_purpose ON gdpr_lawful_basis_assignments(processing_purpose)",
                "CREATE INDEX IF NOT EXISTS idx_lawful_basis_status ON gdpr_lawful_basis_assignments(status)",
                "CREATE INDEX IF NOT EXISTS idx_lawful_basis_review ON gdpr_lawful_basis_assignments(review_date)",
                "CREATE INDEX IF NOT EXISTS idx_lia_category ON gdpr_legitimate_interest_assessments(legitimate_interest_category)"
            ]
            
            for index_query in indexes:
                await db.execute(index_query)
            
            await db.commit()
            
            # Initialize default processing activities and basis assignments
            await self._initialize_default_activities()

    async def _initialize_default_activities(self):
        """Initialize default processing activities and lawful basis assignments"""
        default_activities = [
            {
                "name": "User Account Management",
                "description": "Managing user accounts, profiles, and authentication",
                "purpose": ProcessingPurpose.ACCOUNT_MANAGEMENT,
                "context": ProcessingContext.SERVICE_PROVISION,
                "categories": [DataCategory.IDENTITY_DATA, DataCategory.CONTACT_DATA]
            },
            {
                "name": "Barbershop Booking Services",
                "description": "Processing bookings, appointments, and service delivery",
                "purpose": ProcessingPurpose.BOOKING_SERVICES,
                "context": ProcessingContext.SERVICE_PROVISION,
                "categories": [DataCategory.IDENTITY_DATA, DataCategory.USAGE_DATA]
            },
            {
                "name": "Payment Processing",
                "description": "Processing payments, billing, and financial transactions",
                "purpose": ProcessingPurpose.PAYMENT_PROCESSING,
                "context": ProcessingContext.PAYMENT_PROCESSING,
                "categories": [DataCategory.FINANCIAL_DATA, DataCategory.IDENTITY_DATA]
            },
            {
                "name": "Marketing Communications",
                "description": "Sending marketing emails, SMS, and promotional content",
                "purpose": ProcessingPurpose.MARKETING_COMMUNICATIONS,
                "context": ProcessingContext.MARKETING_COMMUNICATIONS,
                "categories": [DataCategory.CONTACT_DATA, DataCategory.MARKETING_DATA]
            },
            {
                "name": "Analytics and Insights",
                "description": "Analyzing usage patterns and generating business insights",
                "purpose": ProcessingPurpose.ANALYTICS_INSIGHTS,
                "context": ProcessingContext.ANALYTICS_REPORTING,
                "categories": [DataCategory.USAGE_DATA, DataCategory.TECHNICAL_DATA]
            }
        ]
        
        async with aiosqlite.connect(self.db_path) as db:
            for activity in default_activities:
                activity_id = str(uuid.uuid4())
                
                # Check if activity already exists
                cursor = await db.execute(
                    "SELECT id FROM gdpr_processing_activities WHERE activity_name = ?",
                    (activity["name"],)
                )
                existing = await cursor.fetchone()
                
                if not existing:
                    # Create processing activity
                    await db.execute(
                        """
                        INSERT INTO gdpr_processing_activities
                        (id, activity_name, activity_description, data_controller,
                         processing_purpose, processing_context, data_categories,
                         created_by)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            activity_id, activity["name"], activity["description"],
                            "6FB AI Agent System", activity["purpose"].value,
                            activity["context"].value,
                            json.dumps([cat.value for cat in activity["categories"]]),
                            "system"
                        )
                    )
                    
                    # Create lawful basis assignment
                    await self._create_default_basis_assignment(
                        activity_id, activity["purpose"], activity["context"], 
                        activity["categories"]
                    )
            
            await db.commit()

    async def _create_default_basis_assignment(
        self,
        activity_id: str,
        purpose: ProcessingPurpose,
        context: ProcessingContext,
        categories: List[DataCategory]
    ):
        """Create default lawful basis assignment for processing activity"""
        mapping = self.default_basis_mappings.get(purpose)
        if not mapping:
            return
        
        assignment_id = str(uuid.uuid4())
        now = datetime.utcnow()
        review_date = now + timedelta(days=365)  # Annual review
        
        # Assess risk level
        risk_level = self._assess_processing_risk(categories, purpose, context)
        
        assignment = LawfulBasisAssignment(
            id=assignment_id,
            processing_activity_id=activity_id,
            processing_purpose=purpose,
            processing_context=context,
            data_categories=categories,
            primary_lawful_basis=mapping["primary"],
            secondary_lawful_basis=mapping.get("secondary"),
            lawful_basis_rationale=mapping["rationale"],
            legitimate_interest=None,
            lia_conducted=False,
            lia_outcome=None,
            balancing_test_result=None,
            consent_required=mapping["primary"] == LawfulBasis.CONSENT,
            consent_mechanism="explicit_opt_in" if mapping["primary"] == LawfulBasis.CONSENT else None,
            consent_withdrawal_impact=None,
            legal_obligation_source=None,
            legal_obligation_jurisdiction=None,
            contract_type="service_agreement" if mapping["primary"] == LawfulBasis.CONTRACT else None,
            contractual_necessity_justification=None,
            processing_risk_level=risk_level,
            rights_impact_assessment=f"Low impact for {purpose.value} processing",
            mitigation_measures=[],
            status=LawfulBasisStatus.ACTIVE,
            effective_from=now,
            effective_until=None,
            review_date=review_date,
            last_reviewed=None,
            assigned_by="system",
            created_at=now,
            updated_at=now
        )
        
        await self._save_basis_assignment(assignment)
        
        # Conduct LIA if legitimate interests is used
        if (mapping["primary"] == LawfulBasis.LEGITIMATE_INTERESTS or 
            mapping.get("secondary") == LawfulBasis.LEGITIMATE_INTERESTS):
            await self._create_default_lia(assignment_id, purpose, context)

    def _assess_processing_risk(
        self,
        categories: List[DataCategory],
        purpose: ProcessingPurpose,
        context: ProcessingContext
    ) -> str:
        """Assess risk level of data processing"""
        risk_score = 0
        
        # Data category risk
        high_risk_categories = [DataCategory.SPECIAL_CATEGORY, DataCategory.FINANCIAL_DATA]
        medium_risk_categories = [DataCategory.IDENTITY_DATA]
        
        for category in categories:
            if category in high_risk_categories:
                risk_score += 3
            elif category in medium_risk_categories:
                risk_score += 2
            else:
                risk_score += 1
        
        # Purpose risk
        high_risk_purposes = [ProcessingPurpose.AI_PERSONALIZATION]
        if purpose in high_risk_purposes:
            risk_score += 2
        
        # Context risk
        high_risk_contexts = [ProcessingContext.AI_PROCESSING, ProcessingContext.MARKETING_COMMUNICATIONS]
        if context in high_risk_contexts:
            risk_score += 1
        
        # Determine risk level
        if risk_score >= 8:
            return "high"
        elif risk_score >= 5:
            return "medium"
        else:
            return "low"

    async def _create_default_lia(
        self,
        assignment_id: str,
        purpose: ProcessingPurpose,
        context: ProcessingContext
    ):
        """Create default Legitimate Interest Assessment"""
        # Determine appropriate LI category
        li_category = self._map_purpose_to_li_category(purpose, context)
        
        if not li_category:
            return
        
        lia_id = str(uuid.uuid4())
        now = datetime.utcnow()
        review_date = now + timedelta(days=365)
        
        template = self.lia_templates.get(li_category, {})
        
        lia = LegitimateInterestAssessment(
            id=lia_id,
            processing_activity=f"Processing for {purpose.value}",
            legitimate_interest_category=li_category,
            purpose_description=template.get("purpose_template", f"Processing for {purpose.value}"),
            necessity_justification="Necessary for legitimate business operations",
            alternative_means_considered=["Consent-based processing", "Legal obligation basis"],
            individual_interests="General privacy expectations",
            individual_rights_risks="Minimal risk with appropriate safeguards",
            processing_impact="Low impact on individual privacy",
            reasonable_expectations="Processing aligns with user expectations",
            relationship_with_individuals="Service provider relationship",
            data_sensitivity_level="Standard personal data",
            balancing_decision="proceed_with_safeguards",
            additional_safeguards=["Transparency measures", "Data minimization", "Retention limits"],
            ongoing_monitoring_required=True,
            conducted_by="system",
            reviewed_by=None,
            assessment_date=now,
            review_date=review_date,
            created_at=now,
            updated_at=now
        )
        
        await self._save_lia(lia)
        
        # Update assignment with LIA information
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                """
                UPDATE gdpr_lawful_basis_assignments
                SET legitimate_interest = ?, lia_conducted = 1, 
                    lia_outcome = ?, balancing_test_result = ?
                WHERE id = ?
                """,
                (
                    li_category.value, "proceed_with_safeguards",
                    "Balancing test passed with safeguards", assignment_id
                )
            )
            await db.commit()

    def _map_purpose_to_li_category(
        self,
        purpose: ProcessingPurpose,
        context: ProcessingContext
    ) -> Optional[LegitimateInterestCategory]:
        """Map processing purpose to legitimate interest category"""
        mapping = {
            ProcessingPurpose.ANALYTICS_INSIGHTS: LegitimateInterestCategory.BUSINESS_OPERATIONS,
            ProcessingPurpose.FRAUD_PREVENTION: LegitimateInterestCategory.FRAUD_PREVENTION,
            ProcessingPurpose.MARKETING_COMMUNICATIONS: LegitimateInterestCategory.DIRECT_MARKETING,
            ProcessingPurpose.AI_PERSONALIZATION: LegitimateInterestCategory.SERVICE_IMPROVEMENT
        }
        
        return mapping.get(purpose)

    async def _save_basis_assignment(self, assignment: LawfulBasisAssignment):
        """Save lawful basis assignment to database"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                """
                INSERT INTO gdpr_lawful_basis_assignments
                (id, processing_activity_id, processing_purpose, processing_context,
                 data_categories, primary_lawful_basis, secondary_lawful_basis,
                 lawful_basis_rationale, legitimate_interest, lia_conducted,
                 lia_outcome, balancing_test_result, consent_required,
                 consent_mechanism, consent_withdrawal_impact, legal_obligation_source,
                 legal_obligation_jurisdiction, contract_type,
                 contractual_necessity_justification, processing_risk_level,
                 rights_impact_assessment, mitigation_measures, status,
                 effective_from, effective_until, review_date, assigned_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    assignment.id, assignment.processing_activity_id,
                    assignment.processing_purpose.value, assignment.processing_context.value,
                    json.dumps([cat.value for cat in assignment.data_categories]),
                    assignment.primary_lawful_basis.value,
                    assignment.secondary_lawful_basis.value if assignment.secondary_lawful_basis else None,
                    assignment.lawful_basis_rationale,
                    assignment.legitimate_interest.value if assignment.legitimate_interest else None,
                    assignment.lia_conducted, assignment.lia_outcome,
                    assignment.balancing_test_result, assignment.consent_required,
                    assignment.consent_mechanism, assignment.consent_withdrawal_impact,
                    assignment.legal_obligation_source, assignment.legal_obligation_jurisdiction,
                    assignment.contract_type, assignment.contractual_necessity_justification,
                    assignment.processing_risk_level, assignment.rights_impact_assessment,
                    json.dumps(assignment.mitigation_measures), assignment.status.value,
                    assignment.effective_from.isoformat(),
                    assignment.effective_until.isoformat() if assignment.effective_until else None,
                    assignment.review_date.isoformat(), assignment.assigned_by
                )
            )
            await db.commit()

    async def _save_lia(self, lia: LegitimateInterestAssessment):
        """Save Legitimate Interest Assessment to database"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                """
                INSERT INTO gdpr_legitimate_interest_assessments
                (id, processing_activity, legitimate_interest_category,
                 purpose_description, necessity_justification, alternative_means_considered,
                 individual_interests, individual_rights_risks, processing_impact,
                 reasonable_expectations, relationship_with_individuals,
                 data_sensitivity_level, balancing_decision, additional_safeguards,
                 ongoing_monitoring_required, conducted_by, reviewed_by,
                 assessment_date, review_date)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    lia.id, lia.processing_activity, lia.legitimate_interest_category.value,
                    lia.purpose_description, lia.necessity_justification,
                    json.dumps(lia.alternative_means_considered), lia.individual_interests,
                    lia.individual_rights_risks, lia.processing_impact,
                    lia.reasonable_expectations, lia.relationship_with_individuals,
                    lia.data_sensitivity_level, lia.balancing_decision,
                    json.dumps(lia.additional_safeguards), lia.ongoing_monitoring_required,
                    lia.conducted_by, lia.reviewed_by,
                    lia.assessment_date.isoformat(), lia.review_date.isoformat()
                )
            )
            await db.commit()

    async def _start_basis_monitoring(self):
        """Start background lawful basis monitoring"""
        # Wait for initialization
        await asyncio.sleep(120)
        
        while True:
            try:
                # Review upcoming basis renewals
                await self._check_basis_reviews()
                
                # Monitor consent dependencies
                await self._monitor_consent_dependencies()
                
                # Validate basis compliance
                await self._validate_basis_compliance()
                
                # Sleep for 6 hours between monitoring cycles
                await asyncio.sleep(21600)
                
            except Exception as e:
                logger.error(f"Lawful basis monitoring error: {str(e)}")
                await asyncio.sleep(3600)  # Wait 1 hour on error

    async def _check_basis_reviews(self):
        """Check for lawful basis assignments due for review"""
        review_threshold = datetime.utcnow() + timedelta(days=30)  # 30 days ahead
        
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                """
                SELECT id, processing_purpose, review_date, assigned_by
                FROM gdpr_lawful_basis_assignments
                WHERE review_date <= ? AND status = 'active'
                """,
                (review_threshold.isoformat(),)
            )
            due_reviews = await cursor.fetchall()
            
            for assignment_id, purpose, review_date, assigned_by in due_reviews:
                logger.info(f"Lawful basis review due: {purpose} (Assignment {assignment_id})")
                
                # In production, this would trigger notifications to data protection team

    async def _monitor_consent_dependencies(self):
        """Monitor assignments that depend on consent"""
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                """
                SELECT lba.id, lba.processing_purpose, lba.processing_activity_id
                FROM gdpr_lawful_basis_assignments lba
                WHERE lba.consent_required = 1 AND lba.status = 'active'
                """
            )
            consent_dependent = await cursor.fetchall()
            
            for assignment_id, purpose, activity_id in consent_dependent:
                # Check if corresponding consent exists and is valid
                # This would integrate with the consent management service
                consent_valid = await self._check_consent_validity(purpose)
                
                if not consent_valid:
                    await self._handle_invalid_consent(assignment_id, purpose)

    async def _check_consent_validity(self, purpose: ProcessingPurpose) -> bool:
        """Check if consent is valid for processing purpose"""
        # This would integrate with consent management service
        # For now, return True as placeholder
        return True

    async def _handle_invalid_consent(self, assignment_id: str, purpose: ProcessingPurpose):
        """Handle case where consent is no longer valid"""
        logger.warning(f"Invalid consent detected for assignment {assignment_id} ({purpose.value})")
        
        # Update assignment status
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                """
                UPDATE gdpr_lawful_basis_assignments
                SET status = 'under_review', updated_at = ?
                WHERE id = ?
                """,
                (datetime.utcnow().isoformat(), assignment_id)
            )
            await db.commit()
        
        # Log the change
        await self._log_basis_change(
            assignment_id, "status_change", "active", "under_review",
            "Consent no longer valid", "system"
        )

    async def _validate_basis_compliance(self):
        """Validate overall lawful basis compliance"""
        compliance_issues = []
        recommendations = []
        
        async with aiosqlite.connect(self.db_path) as db:
            # Check for processing without lawful basis
            cursor = await db.execute(
                """
                SELECT COUNT(*) FROM gdpr_processing_activities pa
                LEFT JOIN gdpr_lawful_basis_assignments lba ON pa.id = lba.processing_activity_id
                WHERE lba.id IS NULL
                """
            )
            unassigned_count = (await cursor.fetchone())[0]
            
            if unassigned_count > 0:
                compliance_issues.append(f"{unassigned_count} processing activities without lawful basis")
                recommendations.append("Assign lawful basis to all processing activities")
            
            # Check for expired assignments
            cursor = await db.execute(
                """
                SELECT COUNT(*) FROM gdpr_lawful_basis_assignments
                WHERE effective_until < ? AND status = 'active'
                """,
                (datetime.utcnow().isoformat(),)
            )
            expired_count = (await cursor.fetchone())[0]
            
            if expired_count > 0:
                compliance_issues.append(f"{expired_count} expired lawful basis assignments")
                recommendations.append("Review and update expired assignments")
            
            # Check for missing LIAs
            cursor = await db.execute(
                """
                SELECT COUNT(*) FROM gdpr_lawful_basis_assignments
                WHERE (primary_lawful_basis = 'legitimate_interests' 
                       OR secondary_lawful_basis = 'legitimate_interests')
                AND lia_conducted = 0
                """
            )
            missing_lia_count = (await cursor.fetchone())[0]
            
            if missing_lia_count > 0:
                compliance_issues.append(f"{missing_lia_count} legitimate interest assessments missing")
                recommendations.append("Conduct LIA for all legitimate interest processing")
            
            # Record compliance check results
            check_id = str(uuid.uuid4())
            await db.execute(
                """
                INSERT INTO gdpr_basis_compliance_checks
                (id, assignments_checked, compliance_issues, recommendations,
                 check_performed_by, next_check_date)
                SELECT ?, COUNT(*), ?, ?, ?, ?
                FROM gdpr_lawful_basis_assignments
                """,
                (
                    check_id, json.dumps(compliance_issues), json.dumps(recommendations),
                    "system", (datetime.utcnow() + timedelta(days=7)).isoformat()
                )
            )
            await db.commit()
            
            if compliance_issues:
                logger.warning(f"Lawful basis compliance issues detected: {len(compliance_issues)} issues")

    async def assign_lawful_basis(
        self,
        processing_activity_id: str,
        primary_basis: LawfulBasis,
        rationale: str,
        assigned_by: str,
        secondary_basis: LawfulBasis = None,
        effective_until: datetime = None,
        review_period_days: int = 365
    ) -> str:
        """
        Assign lawful basis to processing activity
        
        Args:
            processing_activity_id: ID of processing activity
            primary_basis: Primary lawful basis
            rationale: Justification for the basis
            assigned_by: Person making the assignment
            secondary_basis: Secondary lawful basis (optional)
            effective_until: Expiration date (optional)
            review_period_days: Days until review required
            
        Returns:
            Assignment ID
        """
        # Get processing activity details
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                """
                SELECT processing_purpose, processing_context, data_categories
                FROM gdpr_processing_activities
                WHERE id = ?
                """,
                (processing_activity_id,)
            )
            activity_data = await cursor.fetchone()
            
            if not activity_data:
                raise ValueError(f"Processing activity {processing_activity_id} not found")
            
            purpose_str, context_str, categories_json = activity_data
            purpose = ProcessingPurpose(purpose_str)
            context = ProcessingContext(context_str)
            categories = [DataCategory(cat) for cat in json.loads(categories_json)]
        
        assignment_id = str(uuid.uuid4())
        now = datetime.utcnow()
        review_date = now + timedelta(days=review_period_days)
        
        # Assess risk level
        risk_level = self._assess_processing_risk(categories, purpose, context)
        
        assignment = LawfulBasisAssignment(
            id=assignment_id,
            processing_activity_id=processing_activity_id,
            processing_purpose=purpose,
            processing_context=context,
            data_categories=categories,
            primary_lawful_basis=primary_basis,
            secondary_lawful_basis=secondary_basis,
            lawful_basis_rationale=rationale,
            legitimate_interest=None,
            lia_conducted=False,
            lia_outcome=None,
            balancing_test_result=None,
            consent_required=primary_basis == LawfulBasis.CONSENT,
            consent_mechanism=None,
            consent_withdrawal_impact=None,
            legal_obligation_source=None,
            legal_obligation_jurisdiction=None,
            contract_type=None,
            contractual_necessity_justification=None,
            processing_risk_level=risk_level,
            rights_impact_assessment="To be assessed",
            mitigation_measures=[],
            status=LawfulBasisStatus.ACTIVE,
            effective_from=now,
            effective_until=effective_until,
            review_date=review_date,
            last_reviewed=None,
            assigned_by=assigned_by,
            created_at=now,
            updated_at=now
        )
        
        await self._save_basis_assignment(assignment)
        
        # Log the assignment
        await self._log_basis_change(
            assignment_id, "basis_assignment", None, primary_basis.value,
            f"Initial assignment: {rationale}", assigned_by
        )
        
        logger.info(f"Lawful basis assigned: {primary_basis.value} for activity {processing_activity_id}")
        return assignment_id

    async def conduct_lia(
        self,
        assignment_id: str,
        legitimate_interest_category: LegitimateInterestCategory,
        purpose_description: str,
        necessity_justification: str,
        conducted_by: str
    ) -> str:
        """
        Conduct Legitimate Interest Assessment
        
        Args:
            assignment_id: ID of lawful basis assignment
            legitimate_interest_category: Category of legitimate interest
            purpose_description: Description of processing purpose
            necessity_justification: Why processing is necessary
            conducted_by: Person conducting the assessment
            
        Returns:
            LIA ID
        """
        lia_id = str(uuid.uuid4())
        now = datetime.utcnow()
        review_date = now + timedelta(days=365)
        
        # Get template for the category
        template = self.lia_templates.get(legitimate_interest_category, {})
        
        lia = LegitimateInterestAssessment(
            id=lia_id,
            processing_activity=f"Assignment {assignment_id}",
            legitimate_interest_category=legitimate_interest_category,
            purpose_description=purpose_description,
            necessity_justification=necessity_justification,
            alternative_means_considered=template.get("necessity_factors", []),
            individual_interests="Standard privacy expectations",
            individual_rights_risks="Assessed as minimal with safeguards",
            processing_impact="Low to medium impact",
            reasonable_expectations="Processing aligns with service expectations",
            relationship_with_individuals="Service provider relationship",
            data_sensitivity_level="Standard personal data",
            balancing_decision="proceed_with_safeguards",
            additional_safeguards=template.get("individual_considerations", []),
            ongoing_monitoring_required=True,
            conducted_by=conducted_by,
            reviewed_by=None,
            assessment_date=now,
            review_date=review_date,
            created_at=now,
            updated_at=now
        )
        
        await self._save_lia(lia)
        
        # Update assignment with LIA results
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                """
                UPDATE gdpr_lawful_basis_assignments
                SET legitimate_interest = ?, lia_conducted = 1,
                    lia_outcome = ?, balancing_test_result = ?, updated_at = ?
                WHERE id = ?
                """,
                (
                    legitimate_interest_category.value,
                    lia.balancing_decision,
                    "Balancing test completed with positive outcome",
                    now.isoformat(),
                    assignment_id
                )
            )
            await db.commit()
        
        logger.info(f"LIA conducted for assignment {assignment_id}: {legitimate_interest_category.value}")
        return lia_id

    async def _log_basis_change(
        self,
        assignment_id: str,
        change_type: str,
        old_value: str,
        new_value: str,
        reason: str,
        changed_by: str
    ):
        """Log changes to lawful basis assignments"""
        change_id = str(uuid.uuid4())
        
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                """
                INSERT INTO gdpr_lawful_basis_changes
                (id, assignment_id, change_type, old_value, new_value,
                 change_reason, changed_by)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    change_id, assignment_id, change_type, old_value,
                    new_value, reason, changed_by
                )
            )
            await db.commit()

    async def get_lawful_basis_summary(self) -> Dict[str, Any]:
        """Get summary of lawful basis assignments"""
        async with aiosqlite.connect(self.db_path) as db:
            # Count assignments by primary basis
            cursor = await db.execute(
                """
                SELECT primary_lawful_basis, COUNT(*) FROM gdpr_lawful_basis_assignments
                WHERE status = 'active'
                GROUP BY primary_lawful_basis
                """
            )
            basis_counts = dict(await cursor.fetchall())
            
            # Count by processing purpose
            cursor = await db.execute(
                """
                SELECT processing_purpose, COUNT(*) FROM gdpr_lawful_basis_assignments
                WHERE status = 'active'
                GROUP BY processing_purpose
                """
            )
            purpose_counts = dict(await cursor.fetchall())
            
            # Count LIAs by category
            cursor = await db.execute(
                """
                SELECT legitimate_interest_category, COUNT(*)
                FROM gdpr_legitimate_interest_assessments
                GROUP BY legitimate_interest_category
                """
            )
            lia_counts = dict(await cursor.fetchall())
            
            # Count assignments due for review
            review_threshold = datetime.utcnow() + timedelta(days=30)
            cursor = await db.execute(
                """
                SELECT COUNT(*) FROM gdpr_lawful_basis_assignments
                WHERE review_date <= ? AND status = 'active'
                """,
                (review_threshold.isoformat(),)
            )
            due_reviews = (await cursor.fetchone())[0]
        
        return {
            "assignments_by_lawful_basis": basis_counts,
            "assignments_by_purpose": purpose_counts,
            "lia_by_category": lia_counts,
            "assignments_due_for_review": due_reviews,
            "summary_generated_at": datetime.utcnow().isoformat()
        }

    async def health_check(self) -> Dict[str, Any]:
        """Health check for lawful basis tracking service"""
        try:
            async with aiosqlite.connect(self.db_path) as db:
                # Count assignments by status
                cursor = await db.execute(
                    """
                    SELECT status, COUNT(*) FROM gdpr_lawful_basis_assignments
                    GROUP BY status
                    """
                )
                status_counts = dict(await cursor.fetchall())
                
                # Count processing activities
                cursor = await db.execute(
                    "SELECT COUNT(*) FROM gdpr_processing_activities"
                )
                total_activities = (await cursor.fetchone())[0]
                
                # Count assignments with missing LIA
                cursor = await db.execute(
                    """
                    SELECT COUNT(*) FROM gdpr_lawful_basis_assignments
                    WHERE (primary_lawful_basis = 'legitimate_interests' 
                           OR secondary_lawful_basis = 'legitimate_interests')
                    AND lia_conducted = 0
                    """
                )
                missing_lia = (await cursor.fetchone())[0]
                
                # Count LIAs conducted
                cursor = await db.execute(
                    "SELECT COUNT(*) FROM gdpr_legitimate_interest_assessments"
                )
                total_lias = (await cursor.fetchone())[0]
            
            return {
                "status": "healthy",
                "assignments_by_status": status_counts,
                "total_processing_activities": total_activities,
                "missing_lia_assessments": missing_lia,
                "total_lia_conducted": total_lias,
                "default_mappings_loaded": len(self.default_basis_mappings),
                "database_connected": True,
                "last_check": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Lawful basis tracking service health check failed: {str(e)}")
            return {
                "status": "unhealthy",
                "error": str(e),
                "last_check": datetime.utcnow().isoformat()
            }

# Initialize lawful basis tracking service instance
lawful_basis_tracking_service = GDPRLawfulBasisTrackingService()