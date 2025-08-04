"""
GDPR Consent Management Service - Articles 6 & 7 Implementation
Comprehensive consent management system for lawful processing of personal data
under GDPR Articles 6 (Lawful basis) and 7 (Conditions for consent).

Key Features:
- Granular consent management by processing purpose
- Consent withdrawal mechanisms (as easy as giving consent)
- Consent verification and validation
- Age verification for children (under 16)
- Consent refresh and re-confirmation
- Multi-language consent forms
- Consent analytics and reporting
- Integration with privacy policy management
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
import hashlib
import aiosqlite
from pathlib import Path

# Import GDPR service components
from .gdpr_compliance_service import (
    gdpr_service, GDPRComplianceService, DataCategory, 
    ProcessingPurpose, LawfulBasis, ConsentStatus
)

logger = logging.getLogger(__name__)

class ConsentType(Enum):
    """Types of consent under GDPR"""
    EXPLICIT = "explicit"        # High-risk processing, special categories
    IMPLIED = "implied"          # Lower-risk, legitimate interests
    OPT_IN = "opt_in"           # Active consent required
    OPT_OUT = "opt_out"         # Passive consent, can withdraw
    PARENTAL = "parental"       # Consent for children under 16

class ConsentMethod(Enum):
    """How consent was obtained"""
    CHECKBOX = "checkbox"
    BUTTON_CLICK = "button_click"
    VOICE = "voice"
    SIGNATURE = "signature"
    BIOMETRIC = "biometric"
    API_CALL = "api_call"
    PAPER_FORM = "paper_form"

class ConsentValidityStatus(Enum):
    """Consent validity assessment"""
    VALID = "valid"
    EXPIRED = "expired"
    WITHDRAWN = "withdrawn"
    INVALID = "invalid"
    PENDING_REFRESH = "pending_refresh"

@dataclass
class ConsentConfiguration:
    """Configuration for consent collection"""
    processing_purpose: ProcessingPurpose
    data_categories: List[DataCategory]
    consent_type: ConsentType
    required: bool
    consent_text: Dict[str, str]  # Multi-language consent text
    privacy_notice_url: str
    retention_period_days: int
    refresh_interval_days: Optional[int]
    age_restriction: Optional[int]  # Minimum age required
    dependencies: List[ProcessingPurpose]  # Other consents this depends on

@dataclass
class ConsentRecordEnhanced:
    """Enhanced consent record with full GDPR compliance"""
    id: str
    user_id: str
    processing_purpose: ProcessingPurpose
    data_categories: List[DataCategory]
    consent_type: ConsentType
    consent_method: ConsentMethod
    consent_status: ConsentStatus
    
    # Consent details
    consent_text: str
    consent_language: str
    consent_version: str
    privacy_notice_version: str
    
    # User context
    ip_address: str
    user_agent: str
    browser_fingerprint: str
    geolocation: Optional[Dict[str, Any]]
    
    # Timestamps
    given_at: Optional[datetime]
    withdrawn_at: Optional[datetime]
    expires_at: Optional[datetime]
    last_refreshed_at: Optional[datetime]
    
    # Validation
    age_verified: bool
    parental_consent_id: Optional[str]
    
    # Metadata
    withdrawal_reason: Optional[str]
    marketing_channel: Optional[str]
    created_at: datetime
    updated_at: datetime

class GDPRConsentManagementService:
    """
    Advanced consent management service for GDPR compliance
    """
    
    def __init__(self, db_path: str = None):
        self.db_path = db_path or "/Users/bossio/6FB AI Agent System/agent_system.db"
        
        # Default consent configurations
        self.consent_configurations = self._initialize_consent_configurations()
        
        # Consent refresh intervals (days)
        self.refresh_intervals = {
            ProcessingPurpose.MARKETING_COMMUNICATIONS: 365,  # Annual refresh
            ProcessingPurpose.AI_PERSONALIZATION: 730,       # Biennial refresh
            ProcessingPurpose.ANALYTICS_INSIGHTS: 1095,      # Every 3 years
        }
        
        # Age verification requirements
        self.age_requirements = {
            ProcessingPurpose.MARKETING_COMMUNICATIONS: 16,
            ProcessingPurpose.AI_PERSONALIZATION: 13,
            ProcessingPurpose.ANALYTICS_INSIGHTS: None  # No age restriction
        }
        
        # Initialize database
        asyncio.create_task(self._init_consent_tables())
        
        logger.info("GDPR Consent Management Service initialized")

    def _initialize_consent_configurations(self) -> Dict[ProcessingPurpose, ConsentConfiguration]:
        """Initialize default consent configurations"""
        return {
            ProcessingPurpose.ACCOUNT_MANAGEMENT: ConsentConfiguration(
                processing_purpose=ProcessingPurpose.ACCOUNT_MANAGEMENT,
                data_categories=[DataCategory.IDENTITY_DATA, DataCategory.CONTACT_DATA],
                consent_type=ConsentType.IMPLIED,
                required=True,
                consent_text={
                    "en": "We need to process your account information to provide our barbershop booking services.",
                    "es": "Necesitamos procesar la información de su cuenta para brindar nuestros servicios de reserva de barbería.",
                    "fr": "Nous devons traiter les informations de votre compte pour fournir nos services de réservation de salon de coiffure."
                },
                privacy_notice_url="/privacy-policy#account-management",
                retention_period_days=2555,  # 7 years
                refresh_interval_days=None,  # No refresh needed for contractual basis
                age_restriction=None,
                dependencies=[]
            ),
            
            ProcessingPurpose.BOOKING_SERVICES: ConsentConfiguration(
                processing_purpose=ProcessingPurpose.BOOKING_SERVICES,
                data_categories=[DataCategory.IDENTITY_DATA, DataCategory.CONTACT_DATA, DataCategory.USAGE_DATA],
                consent_type=ConsentType.IMPLIED,
                required=True,
                consent_text={
                    "en": "We process your booking information to schedule and manage your appointments.",
                    "es": "Procesamos su información de reserva para programar y gestionar sus citas.",
                    "fr": "Nous traitons vos informations de réservation pour programmer et gérer vos rendez-vous."
                },
                privacy_notice_url="/privacy-policy#booking-services",
                retention_period_days=1095,  # 3 years
                refresh_interval_days=None,
                age_restriction=None,
                dependencies=[ProcessingPurpose.ACCOUNT_MANAGEMENT]
            ),
            
            ProcessingPurpose.MARKETING_COMMUNICATIONS: ConsentConfiguration(
                processing_purpose=ProcessingPurpose.MARKETING_COMMUNICATIONS,
                data_categories=[DataCategory.CONTACT_DATA, DataCategory.MARKETING_DATA, DataCategory.USAGE_DATA],
                consent_type=ConsentType.EXPLICIT,
                required=False,
                consent_text={
                    "en": "I consent to receive marketing communications about barbershop services, promotions, and special offers via email and SMS.",
                    "es": "Doy mi consentimiento para recibir comunicaciones de marketing sobre servicios de barbería, promociones y ofertas especiales por correo electrónico y SMS.",
                    "fr": "Je consens à recevoir des communications marketing sur les services de salon de coiffure, les promotions et les offres spéciales par e-mail et SMS."
                },
                privacy_notice_url="/privacy-policy#marketing",
                retention_period_days=1095,  # 3 years or until withdrawn
                refresh_interval_days=365,   # Annual refresh
                age_restriction=16,
                dependencies=[]
            ),
            
            ProcessingPurpose.AI_PERSONALIZATION: ConsentConfiguration(
                processing_purpose=ProcessingPurpose.AI_PERSONALIZATION,
                data_categories=[DataCategory.USAGE_DATA, DataCategory.TECHNICAL_DATA, DataCategory.MARKETING_DATA],
                consent_type=ConsentType.EXPLICIT,
                required=False,
                consent_text={
                    "en": "I consent to the use of AI to personalize my experience, including service recommendations and customized content based on my preferences and booking history.",
                    "es": "Doy mi consentimiento para el uso de IA para personalizar mi experiencia, incluyendo recomendaciones de servicios y contenido personalizado basado en mis preferencias e historial de reservas.",
                    "fr": "Je consens à l'utilisation de l'IA pour personnaliser mon expérience, y compris les recommandations de services et le contenu personnalisé basé sur mes préférences et mon historique de réservation."
                },
                privacy_notice_url="/privacy-policy#ai-personalization",
                retention_period_days=730,   # 2 years
                refresh_interval_days=730,   # Biennial refresh
                age_restriction=13,
                dependencies=[]
            ),
            
            ProcessingPurpose.ANALYTICS_INSIGHTS: ConsentConfiguration(
                processing_purpose=ProcessingPurpose.ANALYTICS_INSIGHTS,
                data_categories=[DataCategory.USAGE_DATA, DataCategory.TECHNICAL_DATA],
                consent_type=ConsentType.OPT_OUT,
                required=False,
                consent_text={
                    "en": "We use anonymized analytics to improve our services. You can opt out at any time.",
                    "es": "Utilizamos análisis anónimos para mejorar nuestros servicios. Puede optar por no participar en cualquier momento.",
                    "fr": "Nous utilisons des analyses anonymisées pour améliorer nos services. Vous pouvez vous désinscrire à tout moment."
                },
                privacy_notice_url="/privacy-policy#analytics",
                retention_period_days=1095,  # 3 years
                refresh_interval_days=1095,  # Every 3 years
                age_restriction=None,
                dependencies=[]
            )
        }

    async def _init_consent_tables(self):
        """Initialize consent management database tables"""
        schema_queries = [
            """
            CREATE TABLE IF NOT EXISTS gdpr_consent_records_enhanced (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                processing_purpose TEXT NOT NULL,
                data_categories TEXT NOT NULL, -- JSON array
                consent_type TEXT NOT NULL,
                consent_method TEXT NOT NULL,
                consent_status TEXT NOT NULL,
                
                -- Consent details
                consent_text TEXT NOT NULL,
                consent_language TEXT DEFAULT 'en',
                consent_version TEXT NOT NULL,
                privacy_notice_version TEXT NOT NULL,
                
                -- User context
                ip_address TEXT,
                user_agent TEXT,
                browser_fingerprint TEXT,
                geolocation TEXT, -- JSON
                
                -- Timestamps
                given_at TIMESTAMP,
                withdrawn_at TIMESTAMP,
                expires_at TIMESTAMP,
                last_refreshed_at TIMESTAMP,
                
                -- Validation
                age_verified BOOLEAN DEFAULT 0,
                parental_consent_id TEXT,
                
                -- Metadata
                withdrawal_reason TEXT,
                marketing_channel TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS gdpr_consent_configurations (
                processing_purpose TEXT PRIMARY KEY,
                data_categories TEXT NOT NULL, -- JSON array
                consent_type TEXT NOT NULL,
                required BOOLEAN NOT NULL,
                consent_text TEXT NOT NULL, -- JSON multi-language
                privacy_notice_url TEXT NOT NULL,
                retention_period_days INTEGER NOT NULL,
                refresh_interval_days INTEGER,
                age_restriction INTEGER,
                dependencies TEXT, -- JSON array
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS gdpr_consent_audit (
                id TEXT PRIMARY KEY,
                consent_record_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                action TEXT NOT NULL,
                old_status TEXT,
                new_status TEXT,
                reason TEXT,
                ip_address TEXT,
                user_agent TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS gdpr_age_verification (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                date_of_birth DATE,
                age_verified BOOLEAN DEFAULT 0,
                verification_method TEXT,
                parent_email TEXT,
                parental_consent_required BOOLEAN DEFAULT 0,
                parental_consent_given BOOLEAN DEFAULT 0,
                verification_document_hash TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id)
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS gdpr_consent_refresh_queue (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                processing_purpose TEXT NOT NULL,
                refresh_due_date DATE NOT NULL,
                reminder_sent BOOLEAN DEFAULT 0,
                completed BOOLEAN DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        ]
        
        async with aiosqlite.connect(self.db_path) as db:
            for query in schema_queries:
                await db.execute(query)
            
            # Insert default consent configurations
            for purpose, config in self.consent_configurations.items():
                await db.execute(
                    """
                    INSERT OR REPLACE INTO gdpr_consent_configurations
                    (processing_purpose, data_categories, consent_type, required,
                     consent_text, privacy_notice_url, retention_period_days,
                     refresh_interval_days, age_restriction, dependencies)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        purpose.value,
                        json.dumps([cat.value for cat in config.data_categories]),
                        config.consent_type.value,
                        config.required,
                        json.dumps(config.consent_text),
                        config.privacy_notice_url,
                        config.retention_period_days,
                        config.refresh_interval_days,
                        config.age_restriction,
                        json.dumps([dep.value for dep in config.dependencies])
                    )
                )
            
            await db.commit()

    async def collect_consent(
        self,
        user_id: str,
        processing_purpose: ProcessingPurpose,
        consent_method: ConsentMethod,
        ip_address: str,
        user_agent: str,
        language: str = "en",
        browser_fingerprint: str = None,
        geolocation: Dict[str, Any] = None,
        marketing_channel: str = None,
        age_verified: bool = False,
        date_of_birth: str = None
    ) -> str:
        """
        Collect consent for specific processing purpose
        
        Args:
            user_id: User providing consent
            processing_purpose: Purpose for data processing
            consent_method: How consent was obtained
            ip_address: User's IP address
            user_agent: User's browser/app info
            language: Consent language
            browser_fingerprint: Browser fingerprint for verification
            geolocation: User's location data
            marketing_channel: How user found the service
            age_verified: Whether age has been verified
            date_of_birth: User's date of birth for age verification
            
        Returns:
            Consent record ID
        """
        # Get consent configuration
        config = self.consent_configurations.get(processing_purpose)
        if not config:
            raise ValueError(f"No consent configuration found for {processing_purpose.value}")
        
        # Verify age requirements
        if config.age_restriction and not age_verified:
            if date_of_birth:
                age_verified = await self._verify_age(user_id, date_of_birth, config.age_restriction)
            else:
                raise ValueError("Age verification required for this processing purpose")
        
        # Check dependencies
        for dependency in config.dependencies:
            has_dependency = await self.check_consent_validity(user_id, dependency)
            if not has_dependency:
                raise ValueError(f"Dependent consent required: {dependency.value}")
        
        # Create consent record
        consent_id = str(uuid.uuid4())
        now = datetime.utcnow()
        
        # Calculate expiration
        expires_at = None
        if config.refresh_interval_days:
            expires_at = now + timedelta(days=config.refresh_interval_days)
        
        consent_record = ConsentRecordEnhanced(
            id=consent_id,
            user_id=user_id,
            processing_purpose=processing_purpose,
            data_categories=config.data_categories,
            consent_type=config.consent_type,
            consent_method=consent_method,
            consent_status=ConsentStatus.GIVEN,
            consent_text=config.consent_text.get(language, config.consent_text["en"]),
            consent_language=language,
            consent_version="1.0",
            privacy_notice_version="1.0",
            ip_address=ip_address,
            user_agent=user_agent,
            browser_fingerprint=browser_fingerprint or "",
            geolocation=geolocation,
            given_at=now,
            withdrawn_at=None,
            expires_at=expires_at,
            last_refreshed_at=now,
            age_verified=age_verified,
            parental_consent_id=None,
            withdrawal_reason=None,
            marketing_channel=marketing_channel,
            created_at=now,
            updated_at=now
        )
        
        # Save to database
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                """
                INSERT INTO gdpr_consent_records_enhanced
                (id, user_id, processing_purpose, data_categories, consent_type,
                 consent_method, consent_status, consent_text, consent_language,
                 consent_version, privacy_notice_version, ip_address, user_agent,
                 browser_fingerprint, geolocation, given_at, expires_at,
                 last_refreshed_at, age_verified, marketing_channel)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    consent_id, user_id, processing_purpose.value,
                    json.dumps([cat.value for cat in config.data_categories]),
                    config.consent_type.value, consent_method.value,
                    ConsentStatus.GIVEN.value, consent_record.consent_text,
                    language, "1.0", "1.0", ip_address, user_agent,
                    browser_fingerprint or "", json.dumps(geolocation) if geolocation else None,
                    now.isoformat(), expires_at.isoformat() if expires_at else None,
                    now.isoformat(), age_verified, marketing_channel
                )
            )
            await db.commit()
        
        # Schedule refresh if needed
        if config.refresh_interval_days:
            await self._schedule_consent_refresh(user_id, processing_purpose, expires_at)
        
        # Log consent action
        await self._log_consent_action(
            consent_id, user_id, "CONSENT_GIVEN",
            None, ConsentStatus.GIVEN.value,
            f"Consent collected via {consent_method.value}",
            ip_address, user_agent
        )
        
        logger.info(f"Consent collected for user {user_id}, purpose {processing_purpose.value}")
        return consent_id

    async def _verify_age(self, user_id: str, date_of_birth: str, minimum_age: int) -> bool:
        """Verify user meets minimum age requirement"""
        try:
            birth_date = datetime.fromisoformat(date_of_birth).date()
            today = datetime.utcnow().date()
            age = (today - birth_date).days // 365
            
            is_age_verified = age >= minimum_age
            
            # Store age verification
            async with aiosqlite.connect(self.db_path) as db:
                await db.execute(
                    """
                    INSERT OR REPLACE INTO gdpr_age_verification
                    (id, user_id, date_of_birth, age_verified, verification_method,
                     parental_consent_required)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (
                        str(uuid.uuid4()), user_id, date_of_birth, is_age_verified,
                        "date_of_birth", age < minimum_age
                    )
                )
                await db.commit()
            
            return is_age_verified
            
        except ValueError:
            return False

    async def withdraw_consent(
        self,
        user_id: str,
        processing_purpose: ProcessingPurpose,
        withdrawal_reason: str,
        ip_address: str,
        user_agent: str
    ) -> bool:
        """
        Withdraw consent for specific processing purpose
        
        Args:
            user_id: User withdrawing consent
            processing_purpose: Purpose to withdraw consent for
            withdrawal_reason: Reason for withdrawal
            ip_address: User's IP address
            user_agent: User's browser/app info
            
        Returns:
            True if consent was successfully withdrawn
        """
        now = datetime.utcnow()
        
        async with aiosqlite.connect(self.db_path) as db:
            # Get current consent record
            cursor = await db.execute(
                """
                SELECT id, consent_status FROM gdpr_consent_records_enhanced
                WHERE user_id = ? AND processing_purpose = ? AND consent_status = ?
                ORDER BY given_at DESC LIMIT 1
                """,
                (user_id, processing_purpose.value, ConsentStatus.GIVEN.value)
            )
            result = await cursor.fetchone()
            
            if not result:
                return False
            
            consent_id, old_status = result
            
            # Update consent status
            await db.execute(
                """
                UPDATE gdpr_consent_records_enhanced
                SET consent_status = ?, withdrawn_at = ?, withdrawal_reason = ?, updated_at = ?
                WHERE id = ?
                """,
                (
                    ConsentStatus.WITHDRAWN.value, now.isoformat(),
                    withdrawal_reason, now.isoformat(), consent_id
                )
            )
            await db.commit()
        
        # Log withdrawal action
        await self._log_consent_action(
            consent_id, user_id, "CONSENT_WITHDRAWN",
            old_status, ConsentStatus.WITHDRAWN.value,
            withdrawal_reason, ip_address, user_agent
        )
        
        # Trigger data processing review
        await self._review_data_processing_after_withdrawal(user_id, processing_purpose)
        
        logger.info(f"Consent withdrawn for user {user_id}, purpose {processing_purpose.value}")
        return True

    async def _review_data_processing_after_withdrawal(
        self,
        user_id: str,
        processing_purpose: ProcessingPurpose
    ):
        """Review data processing after consent withdrawal"""
        # Check if there are other lawful bases for processing
        config = self.consent_configurations.get(processing_purpose)
        if not config:
            return
        
        # If consent was the only lawful basis, schedule data deletion
        if config.consent_type in [ConsentType.EXPLICIT, ConsentType.OPT_IN]:
            # Import right to be forgotten service
            from .gdpr_right_to_be_forgotten_service import right_to_be_forgotten_service
            
            # Submit automatic erasure request
            await right_to_be_forgotten_service.submit_erasure_request(
                user_id=user_id,
                reason=right_to_be_forgotten_service.ErasureReason.CONSENT_WITHDRAWN,
                request_details=f"Automatic erasure due to consent withdrawal for {processing_purpose.value}",
                processing_purposes=[processing_purpose]
            )

    async def check_consent_validity(
        self,
        user_id: str,
        processing_purpose: ProcessingPurpose
    ) -> bool:
        """
        Check if user has valid consent for processing purpose
        
        Args:
            user_id: User to check
            processing_purpose: Processing purpose to verify
            
        Returns:
            True if valid consent exists
        """
        now = datetime.utcnow()
        
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                """
                SELECT consent_status, expires_at FROM gdpr_consent_records_enhanced
                WHERE user_id = ? AND processing_purpose = ?
                ORDER BY given_at DESC LIMIT 1
                """,
                (user_id, processing_purpose.value)
            )
            result = await cursor.fetchone()
        
        if not result:
            return False
        
        consent_status, expires_at = result
        
        # Check status
        if consent_status != ConsentStatus.GIVEN.value:
            return False
        
        # Check expiration
        if expires_at:
            expiry_time = datetime.fromisoformat(expires_at)
            if now > expiry_time:
                # Mark as expired and schedule refresh
                await self._expire_consent(user_id, processing_purpose)
                await self._schedule_consent_refresh(user_id, processing_purpose, expiry_time)
                return False
        
        return True

    async def _expire_consent(self, user_id: str, processing_purpose: ProcessingPurpose):
        """Mark consent as expired"""
        now = datetime.utcnow()
        
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                """
                UPDATE gdpr_consent_records_enhanced
                SET consent_status = ?, updated_at = ?
                WHERE user_id = ? AND processing_purpose = ? AND consent_status = ?
                """,
                (
                    ConsentStatus.EXPIRED.value, now.isoformat(),
                    user_id, processing_purpose.value, ConsentStatus.GIVEN.value
                )
            )
            await db.commit()

    async def _schedule_consent_refresh(
        self,
        user_id: str,
        processing_purpose: ProcessingPurpose,
        refresh_date: datetime
    ):
        """Schedule consent refresh"""
        refresh_id = str(uuid.uuid4())
        
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                """
                INSERT OR REPLACE INTO gdpr_consent_refresh_queue
                (id, user_id, processing_purpose, refresh_due_date)
                VALUES (?, ?, ?, ?)
                """,
                (
                    refresh_id, user_id, processing_purpose.value,
                    refresh_date.date().isoformat()
                )
            )
            await db.commit()

    async def _log_consent_action(
        self,
        consent_record_id: str,
        user_id: str,
        action: str,
        old_status: str,
        new_status: str,
        reason: str,
        ip_address: str = None,
        user_agent: str = None
    ):
        """Log consent-related actions"""
        audit_id = str(uuid.uuid4())
        
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                """
                INSERT INTO gdpr_consent_audit
                (id, consent_record_id, user_id, action, old_status, new_status,
                 reason, ip_address, user_agent)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    audit_id, consent_record_id, user_id, action, old_status,
                    new_status, reason, ip_address, user_agent
                )
            )
            await db.commit()

    async def get_user_consent_overview(self, user_id: str) -> Dict[str, Any]:
        """Get comprehensive consent overview for user"""
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                """
                SELECT processing_purpose, consent_status, consent_type, given_at,
                       withdrawn_at, expires_at, withdrawal_reason
                FROM gdpr_consent_records_enhanced
                WHERE user_id = ?
                ORDER BY processing_purpose, given_at DESC
                """,
                (user_id,)
            )
            records = await cursor.fetchall()
        
        # Group by processing purpose (latest record for each)
        consent_overview = {}
        seen_purposes = set()
        
        for record in records:
            purpose = record[0]
            if purpose not in seen_purposes:
                consent_overview[purpose] = {
                    "status": record[1],
                    "type": record[2],
                    "given_at": record[3],
                    "withdrawn_at": record[4],
                    "expires_at": record[5],
                    "withdrawal_reason": record[6],
                    "is_valid": await self.check_consent_validity(
                        user_id, ProcessingPurpose(purpose)
                    )
                }
                seen_purposes.add(purpose)
        
        return {
            "user_id": user_id,
            "consent_records": consent_overview,
            "total_purposes": len(consent_overview),
            "active_consents": sum(1 for c in consent_overview.values() if c["is_valid"]),
            "withdrawn_consents": sum(1 for c in consent_overview.values() if c["status"] == "withdrawn"),
            "last_updated": datetime.utcnow().isoformat()
        }

    async def get_consent_statistics(self) -> Dict[str, Any]:
        """Get consent statistics for compliance reporting"""
        async with aiosqlite.connect(self.db_path) as db:
            # Consent by purpose
            cursor = await db.execute(
                """
                SELECT processing_purpose, consent_status, COUNT(*) as count
                FROM gdpr_consent_records_enhanced
                GROUP BY processing_purpose, consent_status
                """
            )
            purpose_stats = await cursor.fetchall()
            
            # Consent by method
            cursor = await db.execute(
                """
                SELECT consent_method, COUNT(*) as count
                FROM gdpr_consent_records_enhanced
                WHERE consent_status = 'given'
                GROUP BY consent_method
                """
            )
            method_stats = await cursor.fetchall()
            
            # Withdrawal reasons
            cursor = await db.execute(
                """
                SELECT withdrawal_reason, COUNT(*) as count
                FROM gdpr_consent_records_enhanced
                WHERE consent_status = 'withdrawn' AND withdrawal_reason IS NOT NULL
                GROUP BY withdrawal_reason
                """
            )
            withdrawal_stats = await cursor.fetchall()
            
            # Age verification stats
            cursor = await db.execute(
                """
                SELECT age_verified, parental_consent_required, COUNT(*) as count
                FROM gdpr_age_verification
                GROUP BY age_verified, parental_consent_required
                """
            )
            age_stats = await cursor.fetchall()
        
        return {
            "consent_by_purpose": [
                {"purpose": row[0], "status": row[1], "count": row[2]}
                for row in purpose_stats
            ],
            "consent_by_method": [
                {"method": row[0], "count": row[1]}
                for row in method_stats
            ],
            "withdrawal_reasons": [
                {"reason": row[0], "count": row[1]}
                for row in withdrawal_stats
            ],
            "age_verification": [
                {"age_verified": bool(row[0]), "parental_consent_required": bool(row[1]), "count": row[2]}
                for row in age_stats
            ],
            "generated_at": datetime.utcnow().isoformat()
        }

    async def process_consent_refresh_queue(self) -> int:
        """Process pending consent refresh requests"""
        now = datetime.utcnow().date()
        processed_count = 0
        
        async with aiosqlite.connect(self.db_path) as db:
            # Get due refresh requests
            cursor = await db.execute(
                """
                SELECT id, user_id, processing_purpose FROM gdpr_consent_refresh_queue
                WHERE refresh_due_date <= ? AND completed = 0
                """,
                (now.isoformat(),)
            )
            due_refreshes = await cursor.fetchall()
            
            for refresh_id, user_id, processing_purpose in due_refreshes:
                try:
                    # Send refresh notification (would integrate with notification service)
                    await self._send_consent_refresh_notification(
                        user_id, ProcessingPurpose(processing_purpose)
                    )
                    
                    # Mark as reminder sent
                    await db.execute(
                        "UPDATE gdpr_consent_refresh_queue SET reminder_sent = 1 WHERE id = ?",
                        (refresh_id,)
                    )
                    
                    processed_count += 1
                    
                except Exception as e:
                    logger.error(f"Failed to process consent refresh {refresh_id}: {str(e)}")
            
            await db.commit()
        
        logger.info(f"Processed {processed_count} consent refresh requests")
        return processed_count

    async def _send_consent_refresh_notification(
        self,
        user_id: str,
        processing_purpose: ProcessingPurpose
    ):
        """Send consent refresh notification to user"""
        # This would integrate with the notification service
        # For now, just log the notification requirement
        logger.info(f"Would send consent refresh notification to user {user_id} for {processing_purpose.value}")

    async def health_check(self) -> Dict[str, Any]:
        """Health check for consent management service"""
        try:
            async with aiosqlite.connect(self.db_path) as db:
                # Count consent records by status
                cursor = await db.execute(
                    """
                    SELECT consent_status, COUNT(*) FROM gdpr_consent_records_enhanced
                    GROUP BY consent_status
                    """
                )
                status_counts = dict(await cursor.fetchall())
                
                # Count pending refresh requests
                cursor = await db.execute(
                    """
                    SELECT COUNT(*) FROM gdpr_consent_refresh_queue
                    WHERE completed = 0 AND refresh_due_date <= DATE('now')
                    """
                )
                pending_refreshes = (await cursor.fetchone())[0]
                
                # Check for expired consents
                cursor = await db.execute(
                    """
                    SELECT COUNT(*) FROM gdpr_consent_records_enhanced
                    WHERE consent_status = 'given' AND expires_at < datetime('now')
                    """
                )
                expired_consents = (await cursor.fetchone())[0]
            
            return {
                "status": "healthy",
                "consent_records_by_status": status_counts,
                "pending_refresh_requests": pending_refreshes,
                "expired_consents_detected": expired_consents,
                "consent_configurations_loaded": len(self.consent_configurations),
                "database_connected": True,
                "last_check": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Consent management service health check failed: {str(e)}")
            return {
                "status": "unhealthy",
                "error": str(e),
                "last_check": datetime.utcnow().isoformat()
            }

# Initialize consent management service instance
consent_management_service = GDPRConsentManagementService()