"""
GDPR Privacy Policy Management Service
Comprehensive privacy policy and user interface management for GDPR compliance,
including policy generation, version control, user interfaces for privacy controls,
and cookie consent management.

Key Features:
- Dynamic privacy policy generation and management
- Multi-language privacy policy support
- Version control and change tracking
- User-friendly privacy controls interface
- Cookie consent management
- Privacy preference center
- Automated policy updates based on processing changes
- Integration with all GDPR services
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
import aiosqlite
from pathlib import Path
import hashlib

# Import GDPR service components
from .gdpr_compliance_service import (
    gdpr_service, GDPRComplianceService, DataCategory, 
    ProcessingPurpose, LawfulBasis
)

logger = logging.getLogger(__name__)

class PolicySection(Enum):
    """Privacy policy sections"""
    INTRODUCTION = "introduction"
    DATA_CONTROLLER = "data_controller"
    DATA_CATEGORIES = "data_categories"
    PROCESSING_PURPOSES = "processing_purposes"
    LAWFUL_BASIS = "lawful_basis"
    DATA_SHARING = "data_sharing"
    DATA_RETENTION = "data_retention"
    USER_RIGHTS = "user_rights"
    COOKIES = "cookies"
    SECURITY = "security"
    INTERNATIONAL_TRANSFERS = "international_transfers"
    CHANGES_TO_POLICY = "changes_to_policy"
    CONTACT_INFORMATION = "contact_information"

class CookieCategory(Enum):
    """Cookie categories for consent"""
    STRICTLY_NECESSARY = "strictly_necessary"
    PERFORMANCE = "performance"
    FUNCTIONAL = "functional"
    MARKETING = "marketing"
    ANALYTICS = "analytics"

class ConsentPreference(Enum):
    """User consent preferences"""
    ACCEPT_ALL = "accept_all"
    REJECT_ALL = "reject_all"
    CUSTOM = "custom"

@dataclass
class PrivacyPolicy:
    """Privacy policy document"""
    id: str
    version: str
    language: str
    title: str
    effective_date: datetime
    last_updated: datetime
    
    # Policy sections
    sections: Dict[PolicySection, str]
    
    # Metadata
    generated_automatically: bool
    template_version: str
    data_processing_snapshot: Dict[str, Any]
    
    # Status
    is_active: bool
    approval_status: str
    approved_by: Optional[str]
    approved_at: Optional[datetime]
    
    created_at: datetime
    updated_at: datetime

@dataclass
class CookieDefinition:
    """Cookie definition for consent management"""
    id: str
    name: str
    category: CookieCategory
    purpose: str
    description: str
    domain: str
    duration: str
    third_party: bool
    third_party_provider: Optional[str]
    essential: bool
    privacy_policy_url: Optional[str]
    
    created_at: datetime
    updated_at: datetime

@dataclass
class UserPrivacyPreferences:
    """User privacy preferences and consent"""
    user_id: str
    preferences_id: str
    
    # Cookie consent
    cookie_preferences: Dict[CookieCategory, bool]
    consent_given_at: datetime
    consent_method: str
    
    # Processing preferences
    marketing_consent: bool
    analytics_consent: bool
    personalization_consent: bool
    
    # Data rights preferences
    data_export_format: str
    notification_preferences: Dict[str, bool]
    
    # Metadata
    ip_address: str
    user_agent: str
    
    created_at: datetime
    updated_at: datetime

class GDPRPrivacyPolicyService:
    """
    Service for privacy policy management and user interface components
    """
    
    def __init__(self, db_path: str = None):
        self.db_path = db_path or "/Users/bossio/6FB AI Agent System/agent_system.db"
        
        # Privacy policy templates by language
        self.policy_templates = {
            "en": {
                PolicySection.INTRODUCTION: """
                This privacy policy explains how 6FB AI Agent System ('we', 'our', or 'us') collects, 
                uses, and protects your personal information when you use our barbershop booking platform.
                
                We are committed to protecting your privacy and ensuring transparency about our 
                data processing activities in accordance with the General Data Protection Regulation (GDPR).
                """,
                
                PolicySection.DATA_CONTROLLER: """
                6FB AI Agent System is the data controller for your personal information.
                
                Contact Information:
                - Email: privacy@6fbagentsystem.com
                - Address: [Company Address]
                - Data Protection Officer: dpo@6fbagentsystem.com
                """,
                
                PolicySection.USER_RIGHTS: """
                Under GDPR, you have the following rights regarding your personal data:
                
                1. Right of Access (Article 15): Request access to your personal data
                2. Right to Rectification (Article 16): Request correction of inaccurate data
                3. Right to Erasure (Article 17): Request deletion of your data
                4. Right to Restrict Processing (Article 18): Request limitation of processing
                5. Right to Data Portability (Article 20): Request your data in a portable format
                6. Right to Object (Article 21): Object to certain types of processing
                7. Rights related to Automated Decision Making (Article 22)
                
                To exercise these rights, please contact us at privacy@6fbagentsystem.com
                """,
                
                PolicySection.SECURITY: """
                We implement appropriate technical and organizational measures to protect your 
                personal data against unauthorized access, alteration, disclosure, or destruction.
                
                Our security measures include:
                - Encryption of data in transit and at rest
                - Access controls and authentication
                - Regular security assessments
                - Staff training on data protection
                - Incident response procedures
                """,
                
                PolicySection.CONTACT_INFORMATION: """
                If you have any questions about this privacy policy or our data processing practices,
                please contact us:
                
                Email: privacy@6fbagentsystem.com
                Phone: +1-800-6FB-GDPR
                Address: [Company Address]
                
                Data Protection Officer: dpo@6fbagentsystem.com
                
                You also have the right to lodge a complaint with your local data protection authority.
                """
            },
            
            "es": {
                PolicySection.INTRODUCTION: """
                Esta política de privacidad explica cómo 6FB AI Agent System ('nosotros', 'nuestro' o 'nos') 
                recopila, utiliza y protege su información personal cuando utiliza nuestra plataforma 
                de reservas de barbería.
                
                Estamos comprometidos a proteger su privacidad y garantizar la transparencia sobre 
                nuestras actividades de procesamiento de datos de acuerdo con el Reglamento General 
                de Protección de Datos (RGPD).
                """
            },
            
            "fr": {
                PolicySection.INTRODUCTION: """
                Cette politique de confidentialité explique comment 6FB AI Agent System 
                ('nous', 'notre' ou 'nos') collecte, utilise et protège vos informations 
                personnelles lorsque vous utilisez notre plateforme de réservation de salon de coiffure.
                
                Nous nous engageons à protéger votre vie privée et à assurer la transparence 
                sur nos activités de traitement des données conformément au Règlement Général 
                sur la Protection des Données (RGPD).
                """
            }
        }
        
        # Default cookie definitions
        self.default_cookies = [
            {
                "name": "session_id",
                "category": CookieCategory.STRICTLY_NECESSARY,
                "purpose": "Authentication and session management",
                "description": "Maintains your login session and authentication state",
                "domain": "6fbagentsystem.com",
                "duration": "Session",
                "essential": True
            },
            {
                "name": "user_preferences",
                "category": CookieCategory.FUNCTIONAL,
                "purpose": "User experience personalization",
                "description": "Stores your preferences and settings",
                "domain": "6fbagentsystem.com",
                "duration": "1 year",
                "essential": False
            },
            {
                "name": "analytics_tracking",
                "category": CookieCategory.ANALYTICS,
                "purpose": "Website analytics and improvement",
                "description": "Helps us understand how you use our website",
                "domain": "6fbagentsystem.com",
                "duration": "2 years",
                "essential": False
            },
            {
                "name": "marketing_consent",
                "category": CookieCategory.MARKETING,
                "purpose": "Marketing and advertising",
                "description": "Used to show relevant advertisements",
                "domain": "6fbagentsystem.com",
                "duration": "1 year",
                "essential": False
            }
        ]
        
        # Initialize database and background tasks
        asyncio.create_task(self._init_policy_tables())
        asyncio.create_task(self._start_policy_monitoring())
        
        logger.info("GDPR Privacy Policy Service initialized")

    async def _init_policy_tables(self):
        """Initialize privacy policy database tables"""
        schema_queries = [
            """
            CREATE TABLE IF NOT EXISTS gdpr_privacy_policies (
                id TEXT PRIMARY KEY,
                version TEXT NOT NULL,
                language TEXT NOT NULL,
                title TEXT NOT NULL,
                effective_date TIMESTAMP NOT NULL,
                last_updated TIMESTAMP NOT NULL,
                
                -- Policy content
                sections TEXT NOT NULL, -- JSON
                
                -- Metadata
                generated_automatically BOOLEAN DEFAULT 1,
                template_version TEXT,
                data_processing_snapshot TEXT, -- JSON
                
                -- Status
                is_active BOOLEAN DEFAULT 0,
                approval_status TEXT DEFAULT 'draft',
                approved_by TEXT,
                approved_at TIMESTAMP,
                
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS gdpr_cookie_definitions (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL UNIQUE,
                category TEXT NOT NULL,
                purpose TEXT NOT NULL,
                description TEXT NOT NULL,
                domain TEXT NOT NULL,
                duration TEXT NOT NULL,
                third_party BOOLEAN DEFAULT 0,
                third_party_provider TEXT,
                essential BOOLEAN DEFAULT 0,
                privacy_policy_url TEXT,
                
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS gdpr_user_privacy_preferences (
                user_id TEXT PRIMARY KEY,
                preferences_id TEXT NOT NULL,
                
                -- Cookie consent
                cookie_preferences TEXT NOT NULL, -- JSON
                consent_given_at TIMESTAMP NOT NULL,
                consent_method TEXT NOT NULL,
                
                -- Processing preferences
                marketing_consent BOOLEAN DEFAULT 0,
                analytics_consent BOOLEAN DEFAULT 0,
                personalization_consent BOOLEAN DEFAULT 0,
                
                -- Data rights preferences
                data_export_format TEXT DEFAULT 'json',
                notification_preferences TEXT, -- JSON
                
                -- Metadata
                ip_address TEXT,
                user_agent TEXT,
                
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS gdpr_policy_changes (
                id TEXT PRIMARY KEY,
                policy_id TEXT NOT NULL,
                change_type TEXT NOT NULL,
                section_changed TEXT,
                old_content TEXT,
                new_content TEXT,
                change_reason TEXT,
                impact_assessment TEXT,
                notification_required BOOLEAN DEFAULT 1,
                users_notified INTEGER DEFAULT 0,
                changed_by TEXT NOT NULL,
                change_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (policy_id) REFERENCES gdpr_privacy_policies(id)
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS gdpr_consent_banners (
                id TEXT PRIMARY KEY,
                banner_type TEXT NOT NULL, -- cookie_consent, privacy_update, etc.
                language TEXT NOT NULL,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                button_config TEXT NOT NULL, -- JSON
                display_rules TEXT, -- JSON
                is_active BOOLEAN DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        ]
        
        async with aiosqlite.connect(self.db_path) as db:
            for query in schema_queries:
                await db.execute(query)
            
            # Create indexes
            indexes = [
                "CREATE INDEX IF NOT EXISTS idx_policy_language ON gdpr_privacy_policies(language)",
                "CREATE INDEX IF NOT EXISTS idx_policy_active ON gdpr_privacy_policies(is_active)",
                "CREATE INDEX IF NOT EXISTS idx_cookie_category ON gdpr_cookie_definitions(category)",
                "CREATE INDEX IF NOT EXISTS idx_preferences_user ON gdpr_user_privacy_preferences(user_id)"
            ]
            
            for index_query in indexes:
                await db.execute(index_query)
            
            await db.commit()
            
            # Initialize default data
            await self._initialize_default_data()

    async def _initialize_default_data(self):
        """Initialize default cookies and privacy policies"""
        # Initialize default cookies
        for cookie_data in self.default_cookies:
            cookie_id = str(uuid.uuid4())
            
            async with aiosqlite.connect(self.db_path) as db:
                # Check if cookie already exists
                cursor = await db.execute(
                    "SELECT id FROM gdpr_cookie_definitions WHERE name = ?",
                    (cookie_data["name"],)
                )
                existing = await cursor.fetchone()
                
                if not existing:
                    await db.execute(
                        """
                        INSERT INTO gdpr_cookie_definitions
                        (id, name, category, purpose, description, domain, duration, essential)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            cookie_id, cookie_data["name"], cookie_data["category"].value,
                            cookie_data["purpose"], cookie_data["description"],
                            cookie_data["domain"], cookie_data["duration"],
                            cookie_data["essential"]
                        )
                    )
                await db.commit()
        
        # Generate initial privacy policies
        await self._generate_initial_policies()

    async def _generate_initial_policies(self):
        """Generate initial privacy policies for all languages"""
        for language in self.policy_templates.keys():
            await self.generate_privacy_policy(language, "system")

    async def _start_policy_monitoring(self):
        """Start background policy monitoring"""
        # Wait for initialization
        await asyncio.sleep(180)
        
        while True:
            try:
                # Check for processing changes that require policy updates
                await self._check_processing_changes()
                
                # Monitor consent compliance
                await self._monitor_consent_compliance()
                
                # Clean up old policy versions
                await self._cleanup_old_policies()
                
                # Sleep for 24 hours between monitoring cycles
                await asyncio.sleep(86400)
                
            except Exception as e:
                logger.error(f"Policy monitoring error: {str(e)}")
                await asyncio.sleep(3600)  # Wait 1 hour on error

    async def generate_privacy_policy(
        self,
        language: str = "en",
        generated_by: str = "system"
    ) -> str:
        """
        Generate comprehensive privacy policy based on current processing activities
        
        Args:
            language: Policy language
            generated_by: Who generated the policy
            
        Returns:
            Policy ID
        """
        policy_id = str(uuid.uuid4())
        now = datetime.utcnow()
        
        # Gather current data processing information
        processing_snapshot = await self._gather_processing_snapshot()
        
        # Generate policy sections
        sections = await self._generate_policy_sections(language, processing_snapshot)
        
        # Determine version number
        version = await self._get_next_version_number(language)
        
        policy = PrivacyPolicy(
            id=policy_id,
            version=version,
            language=language,
            title=f"Privacy Policy - 6FB AI Agent System",
            effective_date=now,
            last_updated=now,
            sections=sections,
            generated_automatically=True,
            template_version="1.0",
            data_processing_snapshot=processing_snapshot,
            is_active=False,  # Requires approval
            approval_status="draft",
            approved_by=None,
            approved_at=None,
            created_at=now,
            updated_at=now
        )
        
        # Save policy
        await self._save_privacy_policy(policy)
        
        logger.info(f"Privacy policy generated: {language} v{version} ({policy_id})")
        return policy_id

    async def _gather_processing_snapshot(self) -> Dict[str, Any]:
        """Gather snapshot of current data processing activities"""
        async with aiosqlite.connect(self.db_path) as db:
            # Get processing purposes
            cursor = await db.execute(
                "SELECT DISTINCT processing_purpose FROM gdpr_lawful_basis_assignments WHERE status = 'active'"
            )
            purposes = [row[0] for row in await cursor.fetchall()]
            
            # Get data categories
            cursor = await db.execute(
                "SELECT data_categories FROM gdpr_lawful_basis_assignments WHERE status = 'active'"
            )
            all_categories = set()
            for row in await cursor.fetchall():
                categories = json.loads(row[0])
                all_categories.update(categories)
            
            # Get lawful bases
            cursor = await db.execute(
                "SELECT primary_lawful_basis, COUNT(*) FROM gdpr_lawful_basis_assignments WHERE status = 'active' GROUP BY primary_lawful_basis"
            )
            lawful_bases = dict(await cursor.fetchall())
            
            # Get retention periods
            cursor = await db.execute(
                "SELECT data_category, retention_period_days FROM gdpr_retention_policies WHERE is_active = 1"
            )
            retention_periods = dict(await cursor.fetchall())
        
        return {
            "processing_purposes": purposes,
            "data_categories": list(all_categories),
            "lawful_bases": lawful_bases,
            "retention_periods": retention_periods,
            "last_updated": datetime.utcnow().isoformat()
        }

    async def _generate_policy_sections(
        self,
        language: str,
        processing_snapshot: Dict[str, Any]
    ) -> Dict[PolicySection, str]:
        """Generate policy sections based on current processing"""
        sections = {}
        template = self.policy_templates.get(language, self.policy_templates["en"])
        
        # Static sections from template
        for section in PolicySection:
            if section in template:
                sections[section] = template[section]
        
        # Dynamic sections based on processing snapshot
        sections[PolicySection.DATA_CATEGORIES] = self._generate_data_categories_section(
            processing_snapshot["data_categories"], language
        )
        
        sections[PolicySection.PROCESSING_PURPOSES] = self._generate_purposes_section(
            processing_snapshot["processing_purposes"], language
        )
        
        sections[PolicySection.LAWFUL_BASIS] = self._generate_lawful_basis_section(
            processing_snapshot["lawful_bases"], language
        )
        
        sections[PolicySection.DATA_RETENTION] = self._generate_retention_section(
            processing_snapshot["retention_periods"], language
        )
        
        sections[PolicySection.COOKIES] = await self._generate_cookies_section(language)
        
        return sections

    def _generate_data_categories_section(
        self,
        categories: List[str],
        language: str
    ) -> str:
        """Generate data categories section"""
        category_descriptions = {
            "identity_data": "Personal identification information (name, email, phone number)",
            "contact_data": "Contact and communication information",
            "financial_data": "Payment and billing information",
            "usage_data": "Information about how you use our services",
            "technical_data": "Technical information about your device and connection",
            "marketing_data": "Marketing preferences and communication history"
        }
        
        section = "We collect and process the following categories of personal data:\n\n"
        
        for category in categories:
            description = category_descriptions.get(category, category.replace("_", " ").title())
            section += f"• {description}\n"
        
        return section

    def _generate_purposes_section(
        self,
        purposes: List[str],
        language: str
    ) -> str:
        """Generate processing purposes section"""
        purpose_descriptions = {
            "account_management": "Managing your user account and authentication",
            "booking_services": "Processing barbershop bookings and appointments",
            "payment_processing": "Processing payments and billing",
            "marketing_communications": "Sending marketing emails and promotional content",
            "analytics_insights": "Analyzing service usage and generating insights",
            "ai_personalization": "Personalizing your experience using AI",
            "legal_compliance": "Complying with legal and regulatory requirements",
            "fraud_prevention": "Preventing fraud and ensuring security"
        }
        
        section = "We process your personal data for the following purposes:\n\n"
        
        for purpose in purposes:
            description = purpose_descriptions.get(purpose, purpose.replace("_", " ").title())
            section += f"• {description}\n"
        
        return section

    def _generate_lawful_basis_section(
        self,
        lawful_bases: Dict[str, int],
        language: str
    ) -> str:
        """Generate lawful basis section"""
        basis_descriptions = {
            "consent": "Your explicit consent for the processing",
            "contract": "Processing necessary for our contract with you",
            "legal_obligation": "Processing required by law",
            "legitimate_interests": "Our legitimate business interests",
            "vital_interests": "Protection of vital interests",
            "public_task": "Performance of public tasks"
        }
        
        section = "We process your personal data based on the following lawful bases:\n\n"
        
        for basis, count in lawful_bases.items():
            description = basis_descriptions.get(basis, basis.replace("_", " ").title())
            section += f"• {description}\n"
        
        return section

    def _generate_retention_section(
        self,
        retention_periods: Dict[str, int],
        language: str
    ) -> str:
        """Generate data retention section"""
        section = "We retain your personal data for the following periods:\n\n"
        
        for category, days in retention_periods.items():
            years = days // 365
            months = (days % 365) // 30
            
            if years > 0:
                period = f"{years} year{'s' if years > 1 else ''}"
                if months > 0:
                    period += f" and {months} month{'s' if months > 1 else ''}"
            elif months > 0:
                period = f"{months} month{'s' if months > 1 else ''}"
            else:
                period = f"{days} days"
            
            category_name = category.replace("_", " ").title()
            section += f"• {category_name}: {period}\n"
        
        section += "\nData is automatically deleted when retention periods expire, " \
                  "unless legal obligations require longer retention."
        
        return section

    async def _generate_cookies_section(self, language: str) -> str:
        """Generate cookies section based on defined cookies"""
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                """
                SELECT category, name, purpose, duration, essential
                FROM gdpr_cookie_definitions
                ORDER BY category, name
                """
            )
            cookies = await cursor.fetchall()
        
        section = "We use the following types of cookies:\n\n"
        
        current_category = None
        for category, name, purpose, duration, essential in cookies:
            if category != current_category:
                current_category = category
                category_name = category.replace("_", " ").title()
                section += f"\n**{category_name} Cookies:**\n"
            
            essential_text = " (Essential)" if essential else ""
            section += f"• {name}{essential_text}: {purpose} (Duration: {duration})\n"
        
        section += "\nYou can manage your cookie preferences through our cookie consent banner " \
                  "or by contacting us directly."
        
        return section

    async def _get_next_version_number(self, language: str) -> str:
        """Get next version number for policy"""
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                """
                SELECT version FROM gdpr_privacy_policies
                WHERE language = ?
                ORDER BY created_at DESC
                LIMIT 1
                """,
                (language,)
            )
            result = await cursor.fetchone()
            
            if result:
                current_version = result[0]
                # Simple version increment (e.g., "1.0" -> "1.1")
                major, minor = current_version.split(".")
                new_version = f"{major}.{int(minor) + 1}"
            else:
                new_version = "1.0"
        
        return new_version

    async def _save_privacy_policy(self, policy: PrivacyPolicy):
        """Save privacy policy to database"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                """
                INSERT INTO gdpr_privacy_policies
                (id, version, language, title, effective_date, last_updated,
                 sections, generated_automatically, template_version,
                 data_processing_snapshot, is_active, approval_status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    policy.id, policy.version, policy.language, policy.title,
                    policy.effective_date.isoformat(), policy.last_updated.isoformat(),
                    json.dumps({section.value: content for section, content in policy.sections.items()}),
                    policy.generated_automatically, policy.template_version,
                    json.dumps(policy.data_processing_snapshot),
                    policy.is_active, policy.approval_status
                )
            )
            await db.commit()

    async def approve_privacy_policy(
        self,
        policy_id: str,
        approved_by: str
    ) -> bool:
        """Approve privacy policy for publication"""
        now = datetime.utcnow()
        
        async with aiosqlite.connect(self.db_path) as db:
            # Get policy details
            cursor = await db.execute(
                "SELECT language FROM gdpr_privacy_policies WHERE id = ?",
                (policy_id,)
            )
            result = await cursor.fetchone()
            
            if not result:
                return False
            
            language = result[0]
            
            # Deactivate current active policy
            await db.execute(
                """
                UPDATE gdpr_privacy_policies 
                SET is_active = 0
                WHERE language = ? AND is_active = 1
                """,
                (language,)
            )
            
            # Activate new policy
            await db.execute(
                """
                UPDATE gdpr_privacy_policies
                SET is_active = 1, approval_status = 'approved',
                    approved_by = ?, approved_at = ?, effective_date = ?,
                    updated_at = ?
                WHERE id = ?
                """,
                (
                    approved_by, now.isoformat(), now.isoformat(),
                    now.isoformat(), policy_id
                )
            )
            
            await db.commit()
        
        logger.info(f"Privacy policy approved and activated: {policy_id}")
        return True

    async def record_user_preferences(
        self,
        user_id: str,
        cookie_preferences: Dict[CookieCategory, bool],
        marketing_consent: bool,
        analytics_consent: bool,
        personalization_consent: bool,
        ip_address: str,
        user_agent: str,
        consent_method: str = "privacy_center"
    ) -> str:
        """
        Record user privacy preferences
        
        Args:
            user_id: User identifier
            cookie_preferences: Cookie consent preferences
            marketing_consent: Marketing consent status
            analytics_consent: Analytics consent status
            personalization_consent: Personalization consent status
            ip_address: User's IP address
            user_agent: User's browser info
            consent_method: How consent was given
            
        Returns:
            Preferences ID
        """
        preferences_id = str(uuid.uuid4())
        now = datetime.utcnow()
        
        preferences = UserPrivacyPreferences(
            user_id=user_id,
            preferences_id=preferences_id,
            cookie_preferences=cookie_preferences,
            consent_given_at=now,
            consent_method=consent_method,
            marketing_consent=marketing_consent,
            analytics_consent=analytics_consent,
            personalization_consent=personalization_consent,
            data_export_format="json",
            notification_preferences={
                "policy_updates": True,
                "breach_notifications": True,
                "data_processing_notifications": False
            },
            ip_address=ip_address,
            user_agent=user_agent,
            created_at=now,
            updated_at=now
        )
        
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                """
                INSERT OR REPLACE INTO gdpr_user_privacy_preferences
                (user_id, preferences_id, cookie_preferences, consent_given_at,
                 consent_method, marketing_consent, analytics_consent,
                 personalization_consent, data_export_format,
                 notification_preferences, ip_address, user_agent)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    user_id, preferences_id,
                    json.dumps({cat.value: consent for cat, consent in cookie_preferences.items()}),
                    now.isoformat(), consent_method, marketing_consent,
                    analytics_consent, personalization_consent, "json",
                    json.dumps(preferences.notification_preferences),
                    ip_address, user_agent
                )
            )
            await db.commit()
        
        # Update consent records in consent management service
        await self._sync_with_consent_service(user_id, preferences)
        
        logger.info(f"Privacy preferences recorded for user {user_id}")
        return preferences_id

    async def _sync_with_consent_service(
        self,
        user_id: str,
        preferences: UserPrivacyPreferences
    ):
        """Sync preferences with consent management service"""
        try:
            # Import consent management service
            from .gdpr_consent_management_service import consent_management_service
            
            # Record marketing consent
            if preferences.marketing_consent:
                await consent_management_service.collect_consent(
                    user_id=user_id,
                    processing_purpose=ProcessingPurpose.MARKETING_COMMUNICATIONS,
                    consent_method=consent_management_service.ConsentMethod.BUTTON_CLICK,
                    ip_address=preferences.ip_address,
                    user_agent=preferences.user_agent
                )
            
            # Record analytics consent
            if preferences.analytics_consent:
                await consent_management_service.collect_consent(
                    user_id=user_id,
                    processing_purpose=ProcessingPurpose.ANALYTICS_INSIGHTS,
                    consent_method=consent_management_service.ConsentMethod.BUTTON_CLICK,
                    ip_address=preferences.ip_address,
                    user_agent=preferences.user_agent
                )
            
            # Record personalization consent
            if preferences.personalization_consent:
                await consent_management_service.collect_consent(
                    user_id=user_id,
                    processing_purpose=ProcessingPurpose.AI_PERSONALIZATION,
                    consent_method=consent_management_service.ConsentMethod.BUTTON_CLICK,
                    ip_address=preferences.ip_address,
                    user_agent=preferences.user_agent
                )
            
        except Exception as e:
            logger.error(f"Failed to sync with consent service: {str(e)}")

    async def get_user_preferences(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user privacy preferences"""
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                """
                SELECT preferences_id, cookie_preferences, consent_given_at,
                       marketing_consent, analytics_consent, personalization_consent,
                       data_export_format, notification_preferences
                FROM gdpr_user_privacy_preferences
                WHERE user_id = ?
                """,
                (user_id,)
            )
            result = await cursor.fetchone()
            
            if not result:
                return None
            
            (preferences_id, cookie_prefs_json, consent_given_at,
             marketing_consent, analytics_consent, personalization_consent,
             data_export_format, notification_prefs_json) = result
            
            return {
                "preferences_id": preferences_id,
                "cookie_preferences": json.loads(cookie_prefs_json),
                "consent_given_at": consent_given_at,
                "marketing_consent": bool(marketing_consent),
                "analytics_consent": bool(analytics_consent),
                "personalization_consent": bool(personalization_consent),
                "data_export_format": data_export_format,
                "notification_preferences": json.loads(notification_prefs_json or "{}")
            }

    async def get_active_privacy_policy(self, language: str = "en") -> Optional[Dict[str, Any]]:
        """Get active privacy policy for language"""
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                """
                SELECT id, version, title, effective_date, last_updated, sections
                FROM gdpr_privacy_policies
                WHERE language = ? AND is_active = 1
                """,
                (language,)
            )
            result = await cursor.fetchone()
            
            if not result:
                return None
            
            policy_id, version, title, effective_date, last_updated, sections_json = result
            
            return {
                "id": policy_id,
                "version": version,
                "title": title,
                "language": language,
                "effective_date": effective_date,
                "last_updated": last_updated,
                "sections": json.loads(sections_json)
            }

    async def get_cookie_definitions(self) -> List[Dict[str, Any]]:
        """Get all cookie definitions for consent banner"""
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                """
                SELECT name, category, purpose, description, duration, essential
                FROM gdpr_cookie_definitions
                ORDER BY category, name
                """
            )
            results = await cursor.fetchall()
            
            return [
                {
                    "name": row[0],
                    "category": row[1],
                    "purpose": row[2],
                    "description": row[3],
                    "duration": row[4],
                    "essential": bool(row[5])
                }
                for row in results
            ]

    async def _check_processing_changes(self):
        """Check for processing changes that require policy updates"""
        # Get current processing snapshot
        current_snapshot = await self._gather_processing_snapshot()
        
        # Compare with last policy snapshot
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                """
                SELECT data_processing_snapshot FROM gdpr_privacy_policies
                WHERE is_active = 1
                ORDER BY effective_date DESC
                LIMIT 1
                """
            )
            result = await cursor.fetchone()
            
            if result:
                last_snapshot = json.loads(result[0])
                
                # Check for significant changes
                if self._has_significant_changes(last_snapshot, current_snapshot):
                    logger.info("Significant processing changes detected, policy update may be required")
                    # In production, this would trigger notification to privacy team

    def _has_significant_changes(
        self,
        old_snapshot: Dict[str, Any],
        new_snapshot: Dict[str, Any]
    ) -> bool:
        """Check if there are significant changes requiring policy update"""
        # Check for new processing purposes
        old_purposes = set(old_snapshot.get("processing_purposes", []))
        new_purposes = set(new_snapshot.get("processing_purposes", []))
        
        if new_purposes - old_purposes:
            return True
        
        # Check for new data categories
        old_categories = set(old_snapshot.get("data_categories", []))
        new_categories = set(new_snapshot.get("data_categories", []))
        
        if new_categories - old_categories:
            return True
        
        # Check for new lawful bases
        old_bases = set(old_snapshot.get("lawful_bases", {}).keys())
        new_bases = set(new_snapshot.get("lawful_bases", {}).keys())
        
        if new_bases - old_bases:
            return True
        
        return False

    async def _monitor_consent_compliance(self):
        """Monitor consent compliance across the system"""
        async with aiosqlite.connect(self.db_path) as db:
            # Check users without privacy preferences
            cursor = await db.execute(
                """
                SELECT COUNT(*) FROM users u
                LEFT JOIN gdpr_user_privacy_preferences p ON u.id = p.user_id
                WHERE p.user_id IS NULL
                """
            )
            users_without_preferences = (await cursor.fetchone())[0]
            
            if users_without_preferences > 0:
                logger.info(f"{users_without_preferences} users without privacy preferences")

    async def _cleanup_old_policies(self):
        """Clean up old policy versions"""
        cutoff_date = datetime.utcnow() - timedelta(days=1095)  # 3 years
        
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                """
                DELETE FROM gdpr_privacy_policies
                WHERE is_active = 0 AND created_at < ?
                """,
                (cutoff_date.isoformat(),)
            )
            deleted_count = db.total_changes
            await db.commit()
            
            if deleted_count > 0:
                logger.debug(f"Cleaned up {deleted_count} old policy versions")

    async def health_check(self) -> Dict[str, Any]:
        """Health check for privacy policy service"""
        try:
            async with aiosqlite.connect(self.db_path) as db:
                # Count active policies by language
                cursor = await db.execute(
                    """
                    SELECT language, COUNT(*) FROM gdpr_privacy_policies
                    WHERE is_active = 1
                    GROUP BY language
                    """
                )
                active_policies = dict(await cursor.fetchall())
                
                # Count cookie definitions by category
                cursor = await db.execute(
                    """
                    SELECT category, COUNT(*) FROM gdpr_cookie_definitions
                    GROUP BY category
                    """
                )
                cookie_counts = dict(await cursor.fetchall())
                
                # Count users with privacy preferences
                cursor = await db.execute(
                    "SELECT COUNT(*) FROM gdpr_user_privacy_preferences"
                )
                users_with_preferences = (await cursor.fetchone())[0]
                
                # Count policy changes in last 30 days
                cutoff_date = datetime.utcnow() - timedelta(days=30)
                cursor = await db.execute(
                    """
                    SELECT COUNT(*) FROM gdpr_policy_changes
                    WHERE change_date > ?
                    """,
                    (cutoff_date.isoformat(),)
                )
                recent_changes = (await cursor.fetchone())[0]
            
            return {
                "status": "healthy",
                "active_policies_by_language": active_policies,
                "cookie_definitions_by_category": cookie_counts,
                "users_with_privacy_preferences": users_with_preferences,
                "policy_changes_last_30_days": recent_changes,
                "template_languages_available": len(self.policy_templates),
                "database_connected": True,
                "last_check": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Privacy policy service health check failed: {str(e)}")
            return {
                "status": "unhealthy",
                "error": str(e),
                "last_check": datetime.utcnow().isoformat()
            }

# Initialize privacy policy service instance
privacy_policy_service = GDPRPrivacyPolicyService()