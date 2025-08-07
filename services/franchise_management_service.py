"""
Franchise Management Service
Comprehensive multi-tenant franchise operations management
Handles franchise creation, location management, user access control, and cross-location operations
"""

import os
import sqlite3
import json
import uuid
from datetime import datetime, date, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
import decimal
import logging
from contextlib import contextmanager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ==========================================
# DATA MODELS AND ENUMS
# ==========================================

class UserRole(Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    FRANCHISE_OWNER = "FRANCHISE_OWNER"
    REGIONAL_MANAGER = "REGIONAL_MANAGER"
    SHOP_OWNER = "SHOP_OWNER"
    SHOP_MANAGER = "SHOP_MANAGER"
    BARBER = "BARBER"
    RECEPTIONIST = "RECEPTIONIST"
    CLIENT = "CLIENT"

class FranchiseStatus(Enum):
    ACTIVE = "ACTIVE"
    PENDING_SETUP = "PENDING_SETUP"
    SUSPENDED = "SUSPENDED"
    TERMINATED = "TERMINATED"

class LocationStatus(Enum):
    ACTIVE = "ACTIVE"
    UNDER_CONSTRUCTION = "UNDER_CONSTRUCTION"
    TEMPORARILY_CLOSED = "TEMPORARILY_CLOSED"
    PERMANENTLY_CLOSED = "PERMANENTLY_CLOSED"

class SubscriptionTier(Enum):
    FRANCHISE_BASIC = "FRANCHISE_BASIC"
    FRANCHISE_PREMIUM = "FRANCHISE_PREMIUM"
    FRANCHISE_ENTERPRISE = "FRANCHISE_ENTERPRISE"
    LOCATION_STARTER = "LOCATION_STARTER"
    LOCATION_PROFESSIONAL = "LOCATION_PROFESSIONAL"
    LOCATION_PREMIUM = "LOCATION_PREMIUM"

@dataclass
class Franchise:
    """Franchise data model"""
    id: str
    franchise_code: str
    franchise_name: str
    brand_name: str
    owner_id: str
    legal_entity_name: str
    tax_id: Optional[str] = None
    industry_vertical: str = "barbershop"
    target_market: Optional[str] = None
    business_model: str = "franchise"
    primary_region: Optional[str] = None
    operating_countries: List[str] = None
    headquarters_address: Dict[str, Any] = None
    franchise_agreement_date: Optional[date] = None
    franchise_term_years: int = 10
    renewal_date: Optional[date] = None
    status: FranchiseStatus = FranchiseStatus.PENDING_SETUP
    is_active: bool = True
    max_locations: int = 50
    current_location_count: int = 0
    franchise_fee: Optional[decimal.Decimal] = None
    royalty_percentage: decimal.Decimal = decimal.Decimal('0.05')
    marketing_fee_percentage: decimal.Decimal = decimal.Decimal('0.02')
    subscription_tier: SubscriptionTier = SubscriptionTier.FRANCHISE_BASIC
    ai_agent_enabled: bool = True
    multi_location_dashboard_enabled: bool = True
    cross_location_booking_enabled: bool = False
    onboarding_completed: bool = False
    onboarding_checklist: Dict[str, Any] = None
    brand_customization: Dict[str, Any] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    def __post_init__(self):
        if self.operating_countries is None:
            self.operating_countries = ["US"]
        if self.headquarters_address is None:
            self.headquarters_address = {}
        if self.onboarding_checklist is None:
            self.onboarding_checklist = {}
        if self.brand_customization is None:
            self.brand_customization = {}

@dataclass
class Location:
    """Location data model"""
    id: str
    franchise_id: str
    location_code: str
    location_name: str
    display_name: str
    shop_owner_id: str
    shop_manager_id: Optional[str] = None
    region_id: Optional[str] = None
    street_address: str = ""
    city: str = ""
    state_province: str = ""
    postal_code: str = ""
    country: str = "USA"
    latitude: Optional[decimal.Decimal] = None
    longitude: Optional[decimal.Decimal] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    social_media_handles: Dict[str, str] = None
    status: LocationStatus = LocationStatus.UNDER_CONSTRUCTION
    is_active: bool = True
    grand_opening_date: Optional[date] = None
    business_hours: Dict[str, Any] = None
    appointment_buffer_minutes: int = 15
    total_chairs: int = 4
    barber_stations: int = 4
    max_concurrent_appointments: int = 8
    waiting_area_capacity: int = 12
    base_pricing_tier: str = "standard"
    service_menu: Dict[str, Any] = None
    pricing_overrides: Dict[str, Any] = None
    subscription_tier: SubscriptionTier = SubscriptionTier.LOCATION_STARTER
    pos_system_integration: Optional[str] = None
    calendar_integration_enabled: bool = True
    online_booking_enabled: bool = True
    waitlist_enabled: bool = True
    loyalty_program_enabled: bool = True
    ai_agent_enabled: bool = True
    ai_scheduling_optimization: bool = True
    ai_customer_insights: bool = False
    ai_inventory_management: bool = False
    brand_colors: Dict[str, str] = None
    logo_url: Optional[str] = None
    interior_photos: List[str] = None
    custom_styling: Dict[str, Any] = None
    monthly_revenue: decimal.Decimal = decimal.Decimal('0')
    total_customers: int = 0
    average_rating: decimal.Decimal = decimal.Decimal('0')
    total_reviews: int = 0
    setup_completed: bool = False
    setup_checklist: Dict[str, Any] = None
    compliance_checklist: Dict[str, Any] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    def __post_init__(self):
        if self.social_media_handles is None:
            self.social_media_handles = {}
        if self.business_hours is None:
            self.business_hours = {}
        if self.service_menu is None:
            self.service_menu = {}
        if self.pricing_overrides is None:
            self.pricing_overrides = {}
        if self.brand_colors is None:
            self.brand_colors = {}
        if self.interior_photos is None:
            self.interior_photos = []
        if self.custom_styling is None:
            self.custom_styling = {}
        if self.setup_checklist is None:
            self.setup_checklist = {}
        if self.compliance_checklist is None:
            self.compliance_checklist = {}

@dataclass
class FranchiseCustomer:
    """Unified customer profile across franchise"""
    id: str
    franchise_id: str
    customer_code: str
    email: Optional[str]
    phone: Optional[str]
    name: str
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    preferred_language: str = "en"
    addresses: List[Dict[str, Any]] = None
    primary_address_index: int = 0
    loyalty_member_since: date = None
    loyalty_tier: str = "BRONZE"
    loyalty_points: int = 0
    lifetime_value: decimal.Decimal = decimal.Decimal('0')
    total_visits: int = 0
    total_spend: decimal.Decimal = decimal.Decimal('0')
    preferred_locations: List[str] = None
    preferred_barbers: List[str] = None
    service_preferences: Dict[str, Any] = None
    communication_preferences: Dict[str, Any] = None
    visit_frequency_days: Optional[int] = None
    average_service_duration: Optional[int] = None
    average_spend_per_visit: decimal.Decimal = decimal.Decimal('0')
    most_popular_service_category: Optional[str] = None
    seasonal_patterns: Dict[str, Any] = None
    marketing_opt_in: bool = True
    sms_opt_in: bool = False
    email_opt_in: bool = True
    last_marketing_contact: Optional[date] = None
    acquisition_date: date = None
    acquisition_location_id: Optional[str] = None
    acquisition_channel: str = "WALK_IN"
    last_visit_date: Optional[date] = None
    last_visit_location_id: Optional[str] = None
    customer_status: str = "ACTIVE"
    gdpr_consent: bool = False
    gdpr_consent_date: Optional[datetime] = None
    data_retention_expires: Optional[date] = None
    is_active: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    def __post_init__(self):
        if self.addresses is None:
            self.addresses = []
        if self.preferred_locations is None:
            self.preferred_locations = []
        if self.preferred_barbers is None:
            self.preferred_barbers = []
        if self.service_preferences is None:
            self.service_preferences = {}
        if self.communication_preferences is None:
            self.communication_preferences = {}
        if self.seasonal_patterns is None:
            self.seasonal_patterns = {}
        if self.loyalty_member_since is None:
            self.loyalty_member_since = date.today()
        if self.acquisition_date is None:
            self.acquisition_date = date.today()

@dataclass
class OperationResult:
    """Standard result object for service operations"""
    success: bool
    data: Optional[Any] = None
    error: Optional[str] = None
    error_code: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

# ==========================================
# FRANCHISE MANAGEMENT SERVICE
# ==========================================

class FranchiseManagementService:
    """
    Comprehensive franchise management service for multi-tenant operations
    """
    
    def __init__(self, db_path: str = "database/agent_system.db"):
        self.db_path = db_path
        self._init_database()
        
    def _init_database(self):
        """Initialize franchise management tables in SQLite"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Enable foreign keys
        cursor.execute("PRAGMA foreign_keys = ON")
        
        # Create franchises table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS franchises (
                id TEXT PRIMARY KEY,
                franchise_code TEXT UNIQUE NOT NULL,
                franchise_name TEXT NOT NULL,
                brand_name TEXT NOT NULL DEFAULT '6FB',
                owner_id TEXT NOT NULL,
                legal_entity_name TEXT NOT NULL,
                tax_id TEXT,
                industry_vertical TEXT DEFAULT 'barbershop',
                target_market TEXT,
                business_model TEXT DEFAULT 'franchise',
                primary_region TEXT,
                operating_countries TEXT, -- JSON array
                headquarters_address TEXT, -- JSON object
                franchise_agreement_date DATE,
                franchise_term_years INTEGER DEFAULT 10,
                renewal_date DATE,
                status TEXT DEFAULT 'PENDING_SETUP',
                is_active BOOLEAN DEFAULT 1,
                max_locations INTEGER DEFAULT 50,
                current_location_count INTEGER DEFAULT 0,
                franchise_fee DECIMAL(12,2),
                royalty_percentage DECIMAL(5,4) DEFAULT 0.05,
                marketing_fee_percentage DECIMAL(5,4) DEFAULT 0.02,
                subscription_tier TEXT DEFAULT 'FRANCHISE_BASIC',
                ai_agent_enabled BOOLEAN DEFAULT 1,
                multi_location_dashboard_enabled BOOLEAN DEFAULT 1,
                cross_location_booking_enabled BOOLEAN DEFAULT 0,
                onboarding_completed BOOLEAN DEFAULT 0,
                onboarding_checklist TEXT, -- JSON object
                brand_customization TEXT, -- JSON object
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Create locations table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS locations (
                id TEXT PRIMARY KEY,
                franchise_id TEXT REFERENCES franchises(id) ON DELETE CASCADE,
                region_id TEXT,
                location_code TEXT UNIQUE NOT NULL,
                location_name TEXT NOT NULL,
                display_name TEXT NOT NULL,
                shop_owner_id TEXT NOT NULL,
                shop_manager_id TEXT,
                street_address TEXT NOT NULL,
                city TEXT NOT NULL,
                state_province TEXT NOT NULL,
                postal_code TEXT NOT NULL,
                country TEXT DEFAULT 'USA',
                latitude DECIMAL(10,8),
                longitude DECIMAL(11,8),
                phone TEXT,
                email TEXT,
                website TEXT,
                social_media_handles TEXT, -- JSON object
                status TEXT DEFAULT 'UNDER_CONSTRUCTION',
                is_active BOOLEAN DEFAULT 1,
                grand_opening_date DATE,
                business_hours TEXT, -- JSON object
                appointment_buffer_minutes INTEGER DEFAULT 15,
                total_chairs INTEGER DEFAULT 4,
                barber_stations INTEGER DEFAULT 4,
                max_concurrent_appointments INTEGER DEFAULT 8,
                waiting_area_capacity INTEGER DEFAULT 12,
                base_pricing_tier TEXT DEFAULT 'standard',
                service_menu TEXT, -- JSON object
                pricing_overrides TEXT, -- JSON object
                subscription_tier TEXT DEFAULT 'LOCATION_STARTER',
                pos_system_integration TEXT,
                calendar_integration_enabled BOOLEAN DEFAULT 1,
                online_booking_enabled BOOLEAN DEFAULT 1,
                waitlist_enabled BOOLEAN DEFAULT 1,
                loyalty_program_enabled BOOLEAN DEFAULT 1,
                ai_agent_enabled BOOLEAN DEFAULT 1,
                ai_scheduling_optimization BOOLEAN DEFAULT 1,
                ai_customer_insights BOOLEAN DEFAULT 0,
                ai_inventory_management BOOLEAN DEFAULT 0,
                brand_colors TEXT, -- JSON object
                logo_url TEXT,
                interior_photos TEXT, -- JSON array
                custom_styling TEXT, -- JSON object
                monthly_revenue DECIMAL(12,2) DEFAULT 0,
                total_customers INTEGER DEFAULT 0,
                average_rating DECIMAL(3,2) DEFAULT 0,
                total_reviews INTEGER DEFAULT 0,
                setup_completed BOOLEAN DEFAULT 0,
                setup_checklist TEXT, -- JSON object
                compliance_checklist TEXT, -- JSON object
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Create franchise_customers table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS franchise_customers (
                id TEXT PRIMARY KEY,
                franchise_id TEXT REFERENCES franchises(id) ON DELETE CASCADE,
                customer_code TEXT UNIQUE NOT NULL,
                email TEXT,
                phone TEXT,
                name TEXT NOT NULL,
                date_of_birth DATE,
                gender TEXT,
                preferred_language TEXT DEFAULT 'en',
                addresses TEXT, -- JSON array
                primary_address_index INTEGER DEFAULT 0,
                loyalty_member_since DATE DEFAULT CURRENT_DATE,
                loyalty_tier TEXT DEFAULT 'BRONZE',
                loyalty_points INTEGER DEFAULT 0,
                lifetime_value DECIMAL(12,2) DEFAULT 0,
                total_visits INTEGER DEFAULT 0,
                total_spend DECIMAL(12,2) DEFAULT 0,
                preferred_locations TEXT, -- JSON array of location IDs
                preferred_barbers TEXT, -- JSON array of user IDs
                service_preferences TEXT, -- JSON object
                communication_preferences TEXT, -- JSON object
                visit_frequency_days INTEGER,
                average_service_duration INTEGER,
                average_spend_per_visit DECIMAL(8,2),
                most_popular_service_category TEXT,
                seasonal_patterns TEXT, -- JSON object
                marketing_opt_in BOOLEAN DEFAULT 1,
                sms_opt_in BOOLEAN DEFAULT 0,
                email_opt_in BOOLEAN DEFAULT 1,
                last_marketing_contact DATE,
                acquisition_date DATE DEFAULT CURRENT_DATE,
                acquisition_location_id TEXT,
                acquisition_channel TEXT DEFAULT 'WALK_IN',
                last_visit_date DATE,
                last_visit_location_id TEXT,
                customer_status TEXT DEFAULT 'ACTIVE',
                gdpr_consent BOOLEAN DEFAULT 0,
                gdpr_consent_date TIMESTAMP,
                data_retention_expires DATE,
                is_active BOOLEAN DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Create customer_location_history table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS customer_location_history (
                id TEXT PRIMARY KEY,
                customer_id TEXT REFERENCES franchise_customers(id) ON DELETE CASCADE,
                location_id TEXT REFERENCES locations(id) ON DELETE CASCADE,
                franchise_id TEXT REFERENCES franchises(id) ON DELETE CASCADE,
                first_visit_date DATE NOT NULL,
                last_visit_date DATE NOT NULL,
                total_visits INTEGER DEFAULT 1,
                total_spend DECIMAL(12,2) DEFAULT 0,
                average_rating DECIMAL(3,2),
                customer_status TEXT DEFAULT 'ACTIVE',
                vip_status BOOLEAN DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(customer_id, location_id)
            )
        ''')
        
        # Create franchise_analytics table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS franchise_analytics (
                id TEXT PRIMARY KEY,
                franchise_id TEXT REFERENCES franchises(id) ON DELETE CASCADE,
                location_id TEXT REFERENCES locations(id) ON DELETE CASCADE,
                date DATE NOT NULL,
                period_type TEXT NOT NULL,
                total_revenue DECIMAL(15,2) DEFAULT 0,
                service_revenue DECIMAL(15,2) DEFAULT 0,
                tip_revenue DECIMAL(15,2) DEFAULT 0,
                retail_revenue DECIMAL(15,2) DEFAULT 0,
                total_appointments INTEGER DEFAULT 0,
                completed_appointments INTEGER DEFAULT 0,
                cancelled_appointments INTEGER DEFAULT 0,
                no_show_appointments INTEGER DEFAULT 0,
                average_appointment_value DECIMAL(8,2) DEFAULT 0,
                new_customers INTEGER DEFAULT 0,
                returning_customers INTEGER DEFAULT 0,
                total_unique_customers INTEGER DEFAULT 0,
                customer_retention_rate DECIMAL(5,4),
                active_barbers INTEGER DEFAULT 0,
                total_barber_hours DECIMAL(8,2) DEFAULT 0,
                revenue_per_barber_hour DECIMAL(8,2) DEFAULT 0,
                chair_utilization_rate DECIMAL(5,4),
                average_wait_time_minutes INTEGER DEFAULT 0,
                customer_satisfaction_score DECIMAL(3,2),
                transfer_appointments_in INTEGER DEFAULT 0,
                transfer_appointments_out INTEGER DEFAULT 0,
                cross_location_customers INTEGER DEFAULT 0,
                ai_recommendations_generated INTEGER DEFAULT 0,
                ai_recommendations_implemented INTEGER DEFAULT 0,
                online_bookings INTEGER DEFAULT 0,
                mobile_app_bookings INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(franchise_id, location_id, date, period_type)
            )
        ''')
        
        # Create indexes for performance
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_franchises_owner ON franchises(owner_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_franchises_code ON franchises(franchise_code)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_locations_franchise ON locations(franchise_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_locations_code ON locations(location_code)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_franchise_customers_franchise ON franchise_customers(franchise_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_franchise_customers_code ON franchise_customers(customer_code)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_customer_location_history_customer ON customer_location_history(customer_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_franchise_analytics_franchise_date ON franchise_analytics(franchise_id, date)')
        
        conn.commit()
        conn.close()
        logger.info("Franchise management database initialized successfully")

    @contextmanager
    def get_db_connection(self):
        """Get database connection with context manager"""
        conn = sqlite3.connect(self.db_path)
        conn.execute("PRAGMA foreign_keys = ON")
        conn.row_factory = sqlite3.Row  # Enable column access by name
        try:
            yield conn
        finally:
            conn.close()

    # ==========================================
    # FRANCHISE MANAGEMENT OPERATIONS
    # ==========================================

    def create_franchise(
        self,
        franchise_name: str,
        owner_id: str,
        legal_entity_name: str,
        brand_name: str = "6FB",
        **kwargs
    ) -> OperationResult:
        """Create a new franchise"""
        try:
            franchise_id = str(uuid.uuid4())
            
            # Generate unique franchise code
            franchise_code = self._generate_franchise_code(franchise_name)
            
            franchise = Franchise(
                id=franchise_id,
                franchise_code=franchise_code,
                franchise_name=franchise_name,
                brand_name=brand_name,
                owner_id=owner_id,
                legal_entity_name=legal_entity_name,
                **kwargs
            )
            
            with self.get_db_connection() as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    INSERT INTO franchises (
                        id, franchise_code, franchise_name, brand_name, owner_id, legal_entity_name,
                        tax_id, industry_vertical, target_market, business_model, primary_region,
                        operating_countries, headquarters_address, franchise_agreement_date,
                        franchise_term_years, renewal_date, status, is_active, max_locations,
                        franchise_fee, royalty_percentage, marketing_fee_percentage, subscription_tier,
                        ai_agent_enabled, multi_location_dashboard_enabled, cross_location_booking_enabled,
                        onboarding_checklist, brand_customization
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    franchise.id,
                    franchise.franchise_code,
                    franchise.franchise_name,
                    franchise.brand_name,
                    franchise.owner_id,
                    franchise.legal_entity_name,
                    franchise.tax_id,
                    franchise.industry_vertical,
                    franchise.target_market,
                    franchise.business_model,
                    franchise.primary_region,
                    json.dumps(franchise.operating_countries),
                    json.dumps(franchise.headquarters_address),
                    franchise.franchise_agreement_date,
                    franchise.franchise_term_years,
                    franchise.renewal_date,
                    franchise.status.value,
                    franchise.is_active,
                    franchise.max_locations,
                    float(franchise.franchise_fee) if franchise.franchise_fee else None,
                    float(franchise.royalty_percentage),
                    float(franchise.marketing_fee_percentage),
                    franchise.subscription_tier.value,
                    franchise.ai_agent_enabled,
                    franchise.multi_location_dashboard_enabled,
                    franchise.cross_location_booking_enabled,
                    json.dumps(franchise.onboarding_checklist),
                    json.dumps(franchise.brand_customization)
                ))
                conn.commit()
                
            logger.info(f"Created franchise: {franchise_code} - {franchise_name}")
            return OperationResult(
                success=True,
                data=asdict(franchise),
                metadata={"franchise_id": franchise_id, "franchise_code": franchise_code}
            )
            
        except sqlite3.IntegrityError as e:
            error_msg = f"Franchise creation failed - integrity error: {str(e)}"
            logger.error(error_msg)
            return OperationResult(
                success=False,
                error=error_msg,
                error_code="INTEGRITY_ERROR"
            )
        except Exception as e:
            error_msg = f"Franchise creation failed: {str(e)}"
            logger.error(error_msg)
            return OperationResult(
                success=False,
                error=error_msg,
                error_code="CREATION_ERROR"
            )

    def get_franchise(self, franchise_id: str) -> OperationResult:
        """Get franchise by ID"""
        try:
            with self.get_db_connection() as conn:
                cursor = conn.cursor()
                cursor.execute('SELECT * FROM franchises WHERE id = ?', (franchise_id,))
                row = cursor.fetchone()
                
                if not row:
                    return OperationResult(
                        success=False,
                        error="Franchise not found",
                        error_code="NOT_FOUND"
                    )
                
                franchise_data = self._row_to_franchise_dict(row)
                return OperationResult(success=True, data=franchise_data)
                
        except Exception as e:
            error_msg = f"Failed to get franchise: {str(e)}"
            logger.error(error_msg)
            return OperationResult(
                success=False,
                error=error_msg,
                error_code="RETRIEVAL_ERROR"
            )

    def list_franchises(
        self,
        owner_id: Optional[str] = None,
        status: Optional[FranchiseStatus] = None,
        limit: int = 50,
        offset: int = 0
    ) -> OperationResult:
        """List franchises with optional filters"""
        try:
            with self.get_db_connection() as conn:
                cursor = conn.cursor()
                
                query = "SELECT * FROM franchises WHERE 1=1"
                params = []
                
                if owner_id:
                    query += " AND owner_id = ?"
                    params.append(owner_id)
                
                if status:
                    query += " AND status = ?"
                    params.append(status.value)
                
                query += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
                params.extend([limit, offset])
                
                cursor.execute(query, params)
                rows = cursor.fetchall()
                
                franchises = [self._row_to_franchise_dict(row) for row in rows]
                
                # Get total count for pagination
                count_query = "SELECT COUNT(*) FROM franchises WHERE 1=1"
                count_params = []
                if owner_id:
                    count_query += " AND owner_id = ?"
                    count_params.append(owner_id)
                if status:
                    count_query += " AND status = ?"
                    count_params.append(status.value)
                
                cursor.execute(count_query, count_params)
                total_count = cursor.fetchone()[0]
                
                return OperationResult(
                    success=True,
                    data=franchises,
                    metadata={
                        "total_count": total_count,
                        "limit": limit,
                        "offset": offset,
                        "has_more": total_count > offset + limit
                    }
                )
                
        except Exception as e:
            error_msg = f"Failed to list franchises: {str(e)}"
            logger.error(error_msg)
            return OperationResult(
                success=False,
                error=error_msg,
                error_code="LIST_ERROR"
            )

    def create_location(
        self,
        franchise_id: str,
        location_name: str,
        shop_owner_id: str,
        street_address: str,
        city: str,
        state_province: str,
        postal_code: str,
        **kwargs
    ) -> OperationResult:
        """Create a new location for a franchise"""
        try:
            # Validate franchise exists and has capacity
            franchise_result = self.get_franchise(franchise_id)
            if not franchise_result.success:
                return franchise_result
            
            franchise_data = franchise_result.data
            if franchise_data['current_location_count'] >= franchise_data['max_locations']:
                return OperationResult(
                    success=False,
                    error="Franchise has reached maximum location limit",
                    error_code="LOCATION_LIMIT_EXCEEDED"
                )
            
            location_id = str(uuid.uuid4())
            
            # Generate unique location code
            location_code = self._generate_location_code(franchise_data['franchise_code'], city)
            
            location = Location(
                id=location_id,
                franchise_id=franchise_id,
                location_code=location_code,
                location_name=location_name,
                display_name=kwargs.get('display_name', location_name),
                shop_owner_id=shop_owner_id,
                street_address=street_address,
                city=city,
                state_province=state_province,
                postal_code=postal_code,
                **{k: v for k, v in kwargs.items() if k != 'display_name'}
            )
            
            with self.get_db_connection() as conn:
                cursor = conn.cursor()
                
                # Insert location
                cursor.execute('''
                    INSERT INTO locations (
                        id, franchise_id, region_id, location_code, location_name, display_name,
                        shop_owner_id, shop_manager_id, street_address, city, state_province,
                        postal_code, country, latitude, longitude, phone, email, website,
                        social_media_handles, status, is_active, grand_opening_date,
                        business_hours, appointment_buffer_minutes, total_chairs, barber_stations,
                        max_concurrent_appointments, waiting_area_capacity, base_pricing_tier,
                        service_menu, pricing_overrides, subscription_tier, pos_system_integration,
                        calendar_integration_enabled, online_booking_enabled, waitlist_enabled,
                        loyalty_program_enabled, ai_agent_enabled, ai_scheduling_optimization,
                        ai_customer_insights, ai_inventory_management, brand_colors, logo_url,
                        interior_photos, custom_styling, setup_checklist, compliance_checklist
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    location.id, location.franchise_id, location.region_id, location.location_code,
                    location.location_name, location.display_name, location.shop_owner_id,
                    location.shop_manager_id, location.street_address, location.city,
                    location.state_province, location.postal_code, location.country,
                    float(location.latitude) if location.latitude else None,
                    float(location.longitude) if location.longitude else None,
                    location.phone, location.email, location.website,
                    json.dumps(location.social_media_handles), location.status.value,
                    location.is_active, location.grand_opening_date,
                    json.dumps(location.business_hours), location.appointment_buffer_minutes,
                    location.total_chairs, location.barber_stations, location.max_concurrent_appointments,
                    location.waiting_area_capacity, location.base_pricing_tier,
                    json.dumps(location.service_menu), json.dumps(location.pricing_overrides),
                    location.subscription_tier.value, location.pos_system_integration,
                    location.calendar_integration_enabled, location.online_booking_enabled,
                    location.waitlist_enabled, location.loyalty_program_enabled,
                    location.ai_agent_enabled, location.ai_scheduling_optimization,
                    location.ai_customer_insights, location.ai_inventory_management,
                    json.dumps(location.brand_colors), location.logo_url,
                    json.dumps(location.interior_photos), json.dumps(location.custom_styling),
                    json.dumps(location.setup_checklist), json.dumps(location.compliance_checklist)
                ))
                
                # Update franchise location count
                cursor.execute('''
                    UPDATE franchises 
                    SET current_location_count = current_location_count + 1,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                ''', (franchise_id,))
                
                conn.commit()
                
            logger.info(f"Created location: {location_code} - {location_name}")
            return OperationResult(
                success=True,
                data=asdict(location),
                metadata={"location_id": location_id, "location_code": location_code}
            )
            
        except sqlite3.IntegrityError as e:
            error_msg = f"Location creation failed - integrity error: {str(e)}"
            logger.error(error_msg)
            return OperationResult(
                success=False,
                error=error_msg,
                error_code="INTEGRITY_ERROR"
            )
        except Exception as e:
            error_msg = f"Location creation failed: {str(e)}"
            logger.error(error_msg)
            return OperationResult(
                success=False,
                error=error_msg,
                error_code="CREATION_ERROR"
            )

    def get_franchise_locations(
        self,
        franchise_id: str,
        status: Optional[LocationStatus] = None
    ) -> OperationResult:
        """Get all locations for a franchise"""
        try:
            with self.get_db_connection() as conn:
                cursor = conn.cursor()
                
                query = "SELECT * FROM locations WHERE franchise_id = ?"
                params = [franchise_id]
                
                if status:
                    query += " AND status = ?"
                    params.append(status.value)
                
                query += " ORDER BY created_at ASC"
                
                cursor.execute(query, params)
                rows = cursor.fetchall()
                
                locations = [self._row_to_location_dict(row) for row in rows]
                
                return OperationResult(
                    success=True,
                    data=locations,
                    metadata={"franchise_id": franchise_id, "location_count": len(locations)}
                )
                
        except Exception as e:
            error_msg = f"Failed to get franchise locations: {str(e)}"
            logger.error(error_msg)
            return OperationResult(
                success=False,
                error=error_msg,
                error_code="RETRIEVAL_ERROR"
            )

    # ==========================================
    # CUSTOMER MANAGEMENT OPERATIONS
    # ==========================================

    def create_franchise_customer(
        self,
        franchise_id: str,
        name: str,
        email: Optional[str] = None,
        phone: Optional[str] = None,
        **kwargs
    ) -> OperationResult:
        """Create a unified customer profile across franchise"""
        try:
            customer_id = str(uuid.uuid4())
            
            # Generate unique customer code
            customer_code = self._generate_customer_code(franchise_id)
            
            customer = FranchiseCustomer(
                id=customer_id,
                franchise_id=franchise_id,
                customer_code=customer_code,
                name=name,
                email=email,
                phone=phone,
                **kwargs
            )
            
            with self.get_db_connection() as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    INSERT INTO franchise_customers (
                        id, franchise_id, customer_code, email, phone, name, date_of_birth,
                        gender, preferred_language, addresses, primary_address_index,
                        loyalty_member_since, loyalty_tier, loyalty_points, lifetime_value,
                        total_visits, total_spend, preferred_locations, preferred_barbers,
                        service_preferences, communication_preferences, visit_frequency_days,
                        average_service_duration, average_spend_per_visit, most_popular_service_category,
                        seasonal_patterns, marketing_opt_in, sms_opt_in, email_opt_in,
                        last_marketing_contact, acquisition_date, acquisition_location_id,
                        acquisition_channel, last_visit_date, last_visit_location_id,
                        customer_status, gdpr_consent, gdpr_consent_date, data_retention_expires
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    customer.id, customer.franchise_id, customer.customer_code, customer.email,
                    customer.phone, customer.name, customer.date_of_birth, customer.gender,
                    customer.preferred_language, json.dumps(customer.addresses),
                    customer.primary_address_index, customer.loyalty_member_since,
                    customer.loyalty_tier, customer.loyalty_points, float(customer.lifetime_value),
                    customer.total_visits, float(customer.total_spend),
                    json.dumps(customer.preferred_locations), json.dumps(customer.preferred_barbers),
                    json.dumps(customer.service_preferences), json.dumps(customer.communication_preferences),
                    customer.visit_frequency_days, customer.average_service_duration,
                    float(customer.average_spend_per_visit), customer.most_popular_service_category,
                    json.dumps(customer.seasonal_patterns), customer.marketing_opt_in,
                    customer.sms_opt_in, customer.email_opt_in, customer.last_marketing_contact,
                    customer.acquisition_date, customer.acquisition_location_id, customer.acquisition_channel,
                    customer.last_visit_date, customer.last_visit_location_id, customer.customer_status,
                    customer.gdpr_consent, customer.gdpr_consent_date, customer.data_retention_expires
                ))
                conn.commit()
                
            logger.info(f"Created franchise customer: {customer_code} - {name}")
            return OperationResult(
                success=True,
                data=asdict(customer),
                metadata={"customer_id": customer_id, "customer_code": customer_code}
            )
            
        except sqlite3.IntegrityError as e:
            error_msg = f"Customer creation failed - integrity error: {str(e)}"
            logger.error(error_msg)
            return OperationResult(
                success=False,
                error=error_msg,
                error_code="INTEGRITY_ERROR"
            )
        except Exception as e:
            error_msg = f"Customer creation failed: {str(e)}"
            logger.error(error_msg)
            return OperationResult(
                success=False,
                error=error_msg,
                error_code="CREATION_ERROR"
            )

    def get_cross_location_customers(self, franchise_id: str) -> OperationResult:
        """Get customers who have visited multiple locations"""
        try:
            with self.get_db_connection() as conn:
                cursor = conn.cursor()
                
                # Get customers with visits to multiple locations
                cursor.execute('''
                    SELECT 
                        fc.*,
                        COUNT(DISTINCT clh.location_id) as locations_visited,
                        GROUP_CONCAT(DISTINCT l.location_name) as location_names
                    FROM franchise_customers fc
                    JOIN customer_location_history clh ON fc.id = clh.customer_id
                    JOIN locations l ON clh.location_id = l.id
                    WHERE fc.franchise_id = ? AND fc.is_active = 1
                    GROUP BY fc.id
                    HAVING COUNT(DISTINCT clh.location_id) > 1
                    ORDER BY fc.lifetime_value DESC
                ''', (franchise_id,))
                
                rows = cursor.fetchall()
                customers = []
                
                for row in rows:
                    customer_data = self._row_to_customer_dict(row)
                    customer_data['locations_visited'] = row['locations_visited']
                    customer_data['location_names'] = row['location_names'].split(',') if row['location_names'] else []
                    customers.append(customer_data)
                
                return OperationResult(
                    success=True,
                    data=customers,
                    metadata={
                        "franchise_id": franchise_id,
                        "cross_location_customer_count": len(customers)
                    }
                )
                
        except Exception as e:
            error_msg = f"Failed to get cross-location customers: {str(e)}"
            logger.error(error_msg)
            return OperationResult(
                success=False,
                error=error_msg,
                error_code="RETRIEVAL_ERROR"
            )

    # ==========================================
    # ANALYTICS AND REPORTING
    # ==========================================

    def get_franchise_performance_overview(self, franchise_id: str) -> OperationResult:
        """Get comprehensive franchise performance overview"""
        try:
            with self.get_db_connection() as conn:
                cursor = conn.cursor()
                
                # Get franchise basic info
                franchise_result = self.get_franchise(franchise_id)
                if not franchise_result.success:
                    return franchise_result
                
                franchise_data = franchise_result.data
                
                # Get current month analytics
                current_date = date.today()
                month_start = current_date.replace(day=1)
                
                cursor.execute('''
                    SELECT 
                        COALESCE(SUM(total_revenue), 0) as total_revenue_mtd,
                        COALESCE(SUM(total_appointments), 0) as total_appointments_mtd,
                        COALESCE(AVG(customer_satisfaction_score), 0) as avg_satisfaction_score,
                        COUNT(DISTINCT location_id) as reporting_locations,
                        COALESCE(SUM(new_customers), 0) as new_customers_mtd,
                        COALESCE(SUM(returning_customers), 0) as returning_customers_mtd
                    FROM franchise_analytics 
                    WHERE franchise_id = ? 
                      AND date >= ?
                      AND period_type = 'daily'
                ''', (franchise_id, month_start))
                
                analytics_row = cursor.fetchone()
                
                # Get location performance rankings
                cursor.execute('''
                    SELECT 
                        l.id, l.location_name, l.city, l.state_province,
                        fa.total_revenue, fa.customer_satisfaction_score, fa.chair_utilization_rate,
                        RANK() OVER (ORDER BY fa.total_revenue DESC) as revenue_rank
                    FROM locations l
                    LEFT JOIN franchise_analytics fa ON l.id = fa.location_id 
                      AND fa.date = ? AND fa.period_type = 'daily'
                    WHERE l.franchise_id = ? AND l.is_active = 1
                    ORDER BY fa.total_revenue DESC
                ''', (current_date - timedelta(days=1), franchise_id))
                
                location_rankings = [dict(row) for row in cursor.fetchall()]
                
                # Calculate growth metrics
                prev_month_start = (month_start - timedelta(days=1)).replace(day=1)
                cursor.execute('''
                    SELECT COALESCE(SUM(total_revenue), 0) as prev_month_revenue
                    FROM franchise_analytics 
                    WHERE franchise_id = ? 
                      AND date >= ? AND date < ?
                      AND period_type = 'daily'
                ''', (franchise_id, prev_month_start, month_start))
                
                prev_month_revenue = cursor.fetchone()['prev_month_revenue']
                current_revenue = analytics_row['total_revenue_mtd'] if analytics_row else 0
                
                revenue_growth = 0
                if prev_month_revenue > 0:
                    revenue_growth = ((current_revenue - prev_month_revenue) / prev_month_revenue) * 100
                
                performance_data = {
                    "franchise_info": franchise_data,
                    "current_month_analytics": {
                        "total_revenue": float(current_revenue),
                        "total_appointments": analytics_row['total_appointments_mtd'] if analytics_row else 0,
                        "average_satisfaction_score": float(analytics_row['avg_satisfaction_score']) if analytics_row else 0,
                        "reporting_locations": analytics_row['reporting_locations'] if analytics_row else 0,
                        "new_customers": analytics_row['new_customers_mtd'] if analytics_row else 0,
                        "returning_customers": analytics_row['returning_customers_mtd'] if analytics_row else 0
                    },
                    "growth_metrics": {
                        "revenue_growth_percentage": round(revenue_growth, 2),
                        "previous_month_revenue": float(prev_month_revenue)
                    },
                    "location_rankings": location_rankings
                }
                
                return OperationResult(
                    success=True,
                    data=performance_data,
                    metadata={"franchise_id": franchise_id, "report_date": current_date.isoformat()}
                )
                
        except Exception as e:
            error_msg = f"Failed to get franchise performance overview: {str(e)}"
            logger.error(error_msg)
            return OperationResult(
                success=False,
                error=error_msg,
                error_code="ANALYTICS_ERROR"
            )

    # ==========================================
    # UTILITY METHODS
    # ==========================================

    def _generate_franchise_code(self, franchise_name: str) -> str:
        """Generate unique franchise code"""
        # Extract first 3 letters from franchise name
        base_code = ''.join(c.upper() for c in franchise_name if c.isalpha())[:3]
        if len(base_code) < 3:
            base_code = base_code.ljust(3, 'X')
        
        # Find next available number
        with self.get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT franchise_code FROM franchises WHERE franchise_code LIKE ? ORDER BY franchise_code DESC LIMIT 1",
                (f"{base_code}%",)
            )
            result = cursor.fetchone()
            
            if result:
                last_code = result['franchise_code']
                try:
                    last_num = int(last_code[-3:])
                    next_num = last_num + 1
                except (ValueError, IndexError):
                    next_num = 1
            else:
                next_num = 1
            
            return f"{base_code}{next_num:03d}"

    def _generate_location_code(self, franchise_code: str, city: str) -> str:
        """Generate unique location code"""
        city_code = ''.join(c.upper() for c in city if c.isalpha())[:3]
        if len(city_code) < 3:
            city_code = city_code.ljust(3, 'X')
        
        # Find next available number for this franchise-city combination
        base_code = f"{franchise_code}-{city_code}"
        
        with self.get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT location_code FROM locations WHERE location_code LIKE ? ORDER BY location_code DESC LIMIT 1",
                (f"{base_code}%",)
            )
            result = cursor.fetchone()
            
            if result:
                last_code = result['location_code']
                try:
                    last_num = int(last_code.split('-')[-1])
                    next_num = last_num + 1
                except (ValueError, IndexError):
                    next_num = 1
            else:
                next_num = 1
            
            return f"{base_code}-{next_num:03d}"

    def _generate_customer_code(self, franchise_id: str) -> str:
        """Generate unique customer code"""
        # Get franchise code
        with self.get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT franchise_code FROM franchises WHERE id = ?", (franchise_id,))
            result = cursor.fetchone()
            
            if not result:
                franchise_code = "UNK"
            else:
                franchise_code = result['franchise_code']
            
            # Find next customer number
            cursor.execute(
                "SELECT customer_code FROM franchise_customers WHERE customer_code LIKE ? ORDER BY customer_code DESC LIMIT 1",
                (f"{franchise_code}-CUST-%",)
            )
            result = cursor.fetchone()
            
            if result:
                last_code = result['customer_code']
                try:
                    last_num = int(last_code.split('-')[-1])
                    next_num = last_num + 1
                except (ValueError, IndexError):
                    next_num = 1
            else:
                next_num = 1
            
            return f"{franchise_code}-CUST-{next_num:06d}"

    def _row_to_franchise_dict(self, row: sqlite3.Row) -> Dict[str, Any]:
        """Convert database row to franchise dictionary"""
        franchise_dict = dict(row)
        
        # Parse JSON fields
        json_fields = ['operating_countries', 'headquarters_address', 'onboarding_checklist', 'brand_customization']
        for field in json_fields:
            if franchise_dict[field]:
                try:
                    franchise_dict[field] = json.loads(franchise_dict[field])
                except json.JSONDecodeError:
                    franchise_dict[field] = {}
        
        return franchise_dict

    def _row_to_location_dict(self, row: sqlite3.Row) -> Dict[str, Any]:
        """Convert database row to location dictionary"""
        location_dict = dict(row)
        
        # Parse JSON fields
        json_fields = [
            'social_media_handles', 'business_hours', 'service_menu', 'pricing_overrides',
            'brand_colors', 'interior_photos', 'custom_styling', 'setup_checklist', 'compliance_checklist'
        ]
        for field in json_fields:
            if location_dict[field]:
                try:
                    location_dict[field] = json.loads(location_dict[field])
                except json.JSONDecodeError:
                    location_dict[field] = {} if field != 'interior_photos' else []
        
        return location_dict

    def _row_to_customer_dict(self, row: sqlite3.Row) -> Dict[str, Any]:
        """Convert database row to customer dictionary"""
        customer_dict = dict(row)
        
        # Parse JSON fields
        json_fields = [
            'addresses', 'preferred_locations', 'preferred_barbers', 'service_preferences',
            'communication_preferences', 'seasonal_patterns'
        ]
        for field in json_fields:
            if customer_dict[field]:
                try:
                    customer_dict[field] = json.loads(customer_dict[field])
                except json.JSONDecodeError:
                    customer_dict[field] = [] if field in ['addresses', 'preferred_locations', 'preferred_barbers'] else {}
        
        return customer_dict

# ==========================================
# EXAMPLE USAGE
# ==========================================

if __name__ == "__main__":
    # Initialize service
    service = FranchiseManagementService()
    
    # Example: Create a franchise
    franchise_result = service.create_franchise(
        franchise_name="Premium Cuts Franchise",
        owner_id="owner_123",
        legal_entity_name="Premium Cuts LLC",
        brand_name="PremiumCuts",
        target_market="Urban Professional",
        primary_region="Northeast",
        franchise_fee=decimal.Decimal('50000'),
        max_locations=25
    )
    
    if franchise_result.success:
        print(f"Created franchise: {franchise_result.data['franchise_code']}")
        franchise_id = franchise_result.data['id']
        
        # Example: Create a location
        location_result = service.create_location(
            franchise_id=franchise_id,
            location_name="Downtown Manhattan",
            shop_owner_id="owner_123",
            street_address="123 Broadway",
            city="New York",
            state_province="NY",
            postal_code="10001",
            phone="+1-212-555-0100",
            email="manhattan@premiumcuts.com",
            total_chairs=8,
            subscription_tier=SubscriptionTier.LOCATION_PROFESSIONAL
        )
        
        if location_result.success:
            print(f"Created location: {location_result.data['location_code']}")
            location_id = location_result.data['id']
            
            # Example: Create a customer
            customer_result = service.create_franchise_customer(
                franchise_id=franchise_id,
                name="John Doe",
                email="john.doe@example.com",
                phone="+1-555-0123",
                acquisition_location_id=location_id,
                acquisition_channel="ONLINE",
                preferred_locations=[location_id]
            )
            
            if customer_result.success:
                print(f"Created customer: {customer_result.data['customer_code']}")
            else:
                print(f"Customer creation failed: {customer_result.error}")
        else:
            print(f"Location creation failed: {location_result.error}")
    else:
        print(f"Franchise creation failed: {franchise_result.error}")