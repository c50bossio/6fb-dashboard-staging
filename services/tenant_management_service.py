"""
Tenant Management Service - Phase 6 Multi-Tenant Architecture
Core service for managing barbershop tenants, provisioning, and lifecycle management
"""

import asyncio
import json
import logging
import secrets
import string
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import sqlite3
import os
import re
import hashlib

# Multi-tenant context management
from contextlib import contextmanager
from functools import wraps

logger = logging.getLogger(__name__)

class TenantManagementService:
    """
    Core tenant management service for multi-tenant barbershop platform
    Handles tenant creation, configuration, lifecycle, and isolation
    """
    
    def __init__(self):
        self.db_path = os.path.join(os.path.dirname(__file__), '..', 'database', 'agent_system.db')
        self.current_tenant_id = None
        
        # Subscription plan configurations
        self.plan_configs = {
            'starter': {
                'name': 'Starter',
                'price': 29.00,
                'features': {
                    'analytics': True,
                    'basic_forecasting': True,
                    'email_alerts': True,
                    'customer_limit': 100,
                    'data_retention_days': 90,
                    'api_calls_per_month': 1000
                },
                'limits': {
                    'users': 3,
                    'locations': 1,
                    'custom_branding': False,
                    'advanced_analytics': False
                }
            },
            'professional': {
                'name': 'Professional', 
                'price': 79.00,
                'features': {
                    'analytics': True,
                    'advanced_forecasting': True,
                    'real_time_alerts': True,
                    'business_recommendations': True,
                    'customer_limit': 500,
                    'data_retention_days': 365,
                    'api_calls_per_month': 5000
                },
                'limits': {
                    'users': 10,
                    'locations': 3,
                    'custom_branding': True,
                    'advanced_analytics': True
                }
            },
            'enterprise': {
                'name': 'Enterprise',
                'price': 199.00,
                'features': {
                    'analytics': True,
                    'advanced_forecasting': True,
                    'predictive_intelligence': True,
                    'real_time_alerts': True,
                    'business_recommendations': True,
                    'custom_ai_models': True,
                    'customer_limit': -1,  # Unlimited
                    'data_retention_days': -1,  # Unlimited
                    'api_calls_per_month': -1  # Unlimited
                },
                'limits': {
                    'users': -1,  # Unlimited
                    'locations': -1,  # Unlimited
                    'custom_branding': True,
                    'advanced_analytics': True,
                    'white_label': True,
                    'priority_support': True
                }
            }
        }
        
        self._initialize_multi_tenant_database()
        logger.info("✅ Tenant Management Service initialized with multi-tenant architecture")

    def _initialize_multi_tenant_database(self):
        """Initialize multi-tenant database structure"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Create tenants table
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS tenants (
                        id TEXT PRIMARY KEY,
                        name TEXT NOT NULL,
                        slug TEXT UNIQUE NOT NULL,
                        domain TEXT,
                        business_type TEXT DEFAULT 'barbershop',
                        address TEXT, -- JSON string
                        phone TEXT,
                        email TEXT,
                        timezone TEXT DEFAULT 'America/New_York',
                        plan_tier TEXT DEFAULT 'starter',
                        billing_status TEXT DEFAULT 'trial',
                        stripe_customer_id TEXT,
                        trial_ends_at TEXT,
                        subscription_started_at TEXT,
                        settings TEXT DEFAULT '{}', -- JSON string
                        features TEXT DEFAULT '{}', -- JSON string 
                        branding TEXT DEFAULT '{}', -- JSON string
                        status TEXT DEFAULT 'active',
                        onboarding_completed BOOLEAN DEFAULT FALSE,
                        onboarded_at TEXT,
                        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                        created_by TEXT
                    )
                ''')
                
                # Create tenant_users table
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS tenant_users (
                        id TEXT PRIMARY KEY,
                        tenant_id TEXT NOT NULL,
                        user_id TEXT NOT NULL, -- Supabase auth user ID
                        role TEXT DEFAULT 'member',
                        permissions TEXT DEFAULT '[]', -- JSON array
                        first_name TEXT,
                        last_name TEXT,
                        email TEXT NOT NULL,
                        phone TEXT,
                        avatar_url TEXT,
                        status TEXT DEFAULT 'active',
                        invited_by TEXT,
                        invited_at TEXT,
                        joined_at TEXT,
                        last_login_at TEXT,
                        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (tenant_id) REFERENCES tenants (id),
                        UNIQUE(tenant_id, user_id),
                        UNIQUE(tenant_id, email)
                    )
                ''')
                
                # Create tenant_invitations table
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS tenant_invitations (
                        id TEXT PRIMARY KEY,
                        tenant_id TEXT NOT NULL,
                        email TEXT NOT NULL,
                        role TEXT DEFAULT 'member',
                        invited_by TEXT NOT NULL,
                        invitation_token TEXT UNIQUE NOT NULL,
                        message TEXT,
                        status TEXT DEFAULT 'pending',
                        expires_at TEXT,
                        accepted_at TEXT,
                        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (tenant_id) REFERENCES tenants (id),
                        UNIQUE(tenant_id, email)
                    )
                ''')
                
                # Create tenant_analytics table (migrated from existing)
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS tenant_analytics (
                        id TEXT PRIMARY KEY,
                        tenant_id TEXT NOT NULL,
                        date TEXT NOT NULL,
                        revenue REAL DEFAULT 0.0,
                        bookings INTEGER DEFAULT 0,
                        customers INTEGER DEFAULT 0,
                        utilization_rate REAL DEFAULT 0.0,
                        satisfaction_score REAL DEFAULT 0.0,
                        metrics TEXT DEFAULT '{}', -- JSON string
                        raw_data TEXT DEFAULT '{}', -- JSON string
                        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (tenant_id) REFERENCES tenants (id),
                        UNIQUE(tenant_id, date)
                    )
                ''')
                
                # Create indexes for performance
                cursor.execute('CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug)')
                cursor.execute('CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status)')
                cursor.execute('CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant_id ON tenant_users(tenant_id)')
                cursor.execute('CREATE INDEX IF NOT EXISTS idx_tenant_users_email ON tenant_users(tenant_id, email)')
                cursor.execute('CREATE INDEX IF NOT EXISTS idx_tenant_analytics_tenant_date ON tenant_analytics(tenant_id, date)')
                
                # Create default system tenant for platform admin
                self._create_default_tenants(cursor)
                
                conn.commit()
                logger.info("✅ Multi-tenant database structure initialized")
                
        except Exception as e:
            logger.error(f"❌ Error initializing multi-tenant database: {e}")
            raise

    def _create_default_tenants(self, cursor):
        """Create default tenants for development and admin"""
        default_tenants = [
            {
                'id': '00000000-0000-0000-0000-000000000000',
                'name': '6FB Platform Admin',
                'slug': 'platform-admin',
                'email': 'admin@6fb.ai',
                'plan_tier': 'enterprise',
                'status': 'active',
                'onboarding_completed': True,
                'settings': json.dumps({'timezone': 'America/New_York', 'is_platform_admin': True}),
                'features': json.dumps({
                    'analytics': True,
                    'forecasting': True,
                    'alerts': True,
                    'recommendations': True,
                    'platform_admin': True
                })
            },
            {
                'id': '00000000-0000-0000-0000-000000000001', 
                'name': 'Demo Barbershop',
                'slug': 'demo-barbershop',
                'email': 'demo@6fb.ai',
                'plan_tier': 'professional',
                'status': 'active',
                'onboarding_completed': True,
                'settings': json.dumps({'timezone': 'America/New_York', 'currency': 'USD'}),
                'features': json.dumps({
                    'analytics': True,
                    'forecasting': True,
                    'alerts': True,
                    'recommendations': True
                })
            }
        ]
        
        for tenant in default_tenants:
            cursor.execute('''
                INSERT OR IGNORE INTO tenants 
                (id, name, slug, email, plan_tier, status, onboarding_completed, settings, features)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                tenant['id'], tenant['name'], tenant['slug'], tenant['email'],
                tenant['plan_tier'], tenant['status'], tenant['onboarding_completed'],
                tenant['settings'], tenant['features']
            ))

    # ============================================================================
    # TENANT CONTEXT MANAGEMENT
    # ============================================================================

    @contextmanager
    def tenant_context(self, tenant_id: str):
        """Context manager for tenant-aware operations"""
        previous_tenant = self.current_tenant_id
        self.current_tenant_id = tenant_id
        try:
            yield tenant_id
        finally:
            self.current_tenant_id = previous_tenant

    def tenant_aware(func):
        """Decorator to ensure tenant context is set for database operations"""
        @wraps(func)
        def wrapper(self, *args, **kwargs):
            if not self.current_tenant_id:
                raise ValueError("Tenant context not set. Use tenant_context() or set_tenant_context()")
            return func(self, *args, **kwargs)
        return wrapper

    def set_tenant_context(self, tenant_id: str):
        """Set current tenant context"""
        self.current_tenant_id = tenant_id

    def get_current_tenant(self) -> Optional[str]:
        """Get current tenant context"""
        return self.current_tenant_id

    # ============================================================================
    # TENANT LIFECYCLE MANAGEMENT
    # ============================================================================

    async def create_tenant(self, tenant_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new tenant with full provisioning"""
        try:
            # Generate tenant ID and slug
            tenant_id = self._generate_uuid()
            slug = self._generate_slug(tenant_data['name'])
            
            # Validate required fields
            required_fields = ['name', 'email']
            for field in required_fields:
                if field not in tenant_data:
                    raise ValueError(f"Missing required field: {field}")
            
            # Set defaults
            plan_tier = tenant_data.get('plan_tier', 'starter')
            trial_ends_at = datetime.now() + timedelta(days=14)  # 14-day trial
            
            # Get plan configuration
            plan_config = self.plan_configs.get(plan_tier, self.plan_configs['starter'])
            
            # Prepare tenant record
            tenant_record = {
                'id': tenant_id,
                'name': tenant_data['name'],
                'slug': slug,
                'email': tenant_data['email'],
                'phone': tenant_data.get('phone'),
                'business_type': tenant_data.get('business_type', 'barbershop'),
                'address': json.dumps(tenant_data.get('address', {})),
                'timezone': tenant_data.get('timezone', 'America/New_York'),
                'plan_tier': plan_tier,
                'billing_status': 'trial',
                'trial_ends_at': trial_ends_at.isoformat(),
                'settings': json.dumps(tenant_data.get('settings', {})),
                'features': json.dumps(plan_config['features']),
                'branding': json.dumps(tenant_data.get('branding', {})),
                'status': 'active',
                'onboarding_completed': False,
                'created_by': tenant_data.get('created_by')
            }
            
            # Store in database
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    INSERT INTO tenants (
                        id, name, slug, email, phone, business_type, address, timezone,
                        plan_tier, billing_status, trial_ends_at, settings, features, 
                        branding, status, onboarding_completed, created_by
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    tenant_record['id'], tenant_record['name'], tenant_record['slug'],
                    tenant_record['email'], tenant_record['phone'], tenant_record['business_type'],
                    tenant_record['address'], tenant_record['timezone'], tenant_record['plan_tier'],
                    tenant_record['billing_status'], tenant_record['trial_ends_at'],
                    tenant_record['settings'], tenant_record['features'], tenant_record['branding'],
                    tenant_record['status'], tenant_record['onboarding_completed'], tenant_record['created_by']
                ))
                conn.commit()
            
            # Initialize tenant data
            await self._initialize_tenant_data(tenant_id)
            
            # Create owner user if provided
            if 'owner_user' in tenant_data:
                await self.add_user_to_tenant(tenant_id, {
                    **tenant_data['owner_user'],
                    'role': 'owner'
                })
            
            result = {
                'success': True,
                'tenant_id': tenant_id,
                'slug': slug,
                'plan_tier': plan_tier,
                'trial_ends_at': trial_ends_at.isoformat(),
                'features': plan_config['features'],
                'onboarding_url': f'/onboarding?tenant={slug}',
                'dashboard_url': f'/dashboard?tenant={slug}'
            }
            
            logger.info(f"✅ Created tenant: {tenant_record['name']} ({tenant_id})")
            return result
            
        except Exception as e:
            logger.error(f"❌ Error creating tenant: {e}")
            return {'success': False, 'error': str(e)}

    async def get_tenant(self, tenant_id: str = None, slug: str = None) -> Optional[Dict[str, Any]]:
        """Get tenant by ID or slug"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                if tenant_id:
                    cursor.execute('SELECT * FROM tenants WHERE id = ?', (tenant_id,))
                elif slug:
                    cursor.execute('SELECT * FROM tenants WHERE slug = ?', (slug,))
                else:
                    raise ValueError("Must provide either tenant_id or slug")
                
                row = cursor.fetchone()
                if not row:
                    return None
                
                # Convert to dictionary
                columns = [description[0] for description in cursor.description]
                tenant = dict(zip(columns, row))
                
                # Parse JSON fields
                json_fields = ['address', 'settings', 'features', 'branding']
                for field in json_fields:
                    if tenant.get(field):
                        try:
                            tenant[field] = json.loads(tenant[field])
                        except json.JSONDecodeError:
                            tenant[field] = {}
                
                return tenant
                
        except Exception as e:
            logger.error(f"❌ Error retrieving tenant: {e}")
            return None

    async def update_tenant(self, tenant_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        """Update tenant configuration"""
        try:
            # Prepare update fields
            update_fields = []
            update_values = []
            
            allowed_updates = [
                'name', 'email', 'phone', 'timezone', 'plan_tier',
                'billing_status', 'settings', 'features', 'branding', 'status'
            ]
            
            for field, value in updates.items():
                if field in allowed_updates:
                    if field in ['settings', 'features', 'branding']:
                        value = json.dumps(value)
                    update_fields.append(f"{field} = ?")
                    update_values.append(value)
            
            if not update_fields:
                return {'success': False, 'error': 'No valid update fields provided'}
            
            # Add updated_at
            update_fields.append("updated_at = CURRENT_TIMESTAMP")
            
            # Execute update
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                query = f"UPDATE tenants SET {', '.join(update_fields)} WHERE id = ?"
                update_values.append(tenant_id)
                cursor.execute(query, update_values)
                conn.commit()
                
                if cursor.rowcount == 0:
                    return {'success': False, 'error': 'Tenant not found'}
            
            logger.info(f"✅ Updated tenant: {tenant_id}")
            return {'success': True}
            
        except Exception as e:
            logger.error(f"❌ Error updating tenant: {e}")
            return {'success': False, 'error': str(e)}

    async def delete_tenant(self, tenant_id: str) -> Dict[str, Any]:
        """Soft delete tenant (mark as pending_deletion)"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    UPDATE tenants 
                    SET status = 'pending_deletion', updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                ''', (tenant_id,))
                conn.commit()
                
                if cursor.rowcount == 0:
                    return {'success': False, 'error': 'Tenant not found'}
            
            logger.info(f"✅ Marked tenant for deletion: {tenant_id}")
            return {'success': True}
            
        except Exception as e:
            logger.error(f"❌ Error deleting tenant: {e}")
            return {'success': False, 'error': str(e)}

    # ============================================================================
    # TENANT USER MANAGEMENT
    # ============================================================================

    async def add_user_to_tenant(self, tenant_id: str, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Add user to tenant with role assignment"""
        try:
            user_id = self._generate_uuid()
            
            # Required fields
            required_fields = ['email', 'role']
            for field in required_fields:
                if field not in user_data:
                    raise ValueError(f"Missing required field: {field}")
            
            # Validate role
            valid_roles = ['owner', 'admin', 'manager', 'member', 'viewer']
            if user_data['role'] not in valid_roles:
                raise ValueError(f"Invalid role: {user_data['role']}")
            
            # Store user
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    INSERT INTO tenant_users (
                        id, tenant_id, user_id, role, first_name, last_name, email, 
                        phone, status, joined_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    user_id, tenant_id, user_data.get('user_id', user_id),
                    user_data['role'], user_data.get('first_name'),
                    user_data.get('last_name'), user_data['email'],
                    user_data.get('phone'), 'active', datetime.now().isoformat()
                ))
                conn.commit()
            
            logger.info(f"✅ Added user to tenant: {user_data['email']} → {tenant_id}")
            return {'success': True, 'user_id': user_id}
            
        except Exception as e:
            logger.error(f"❌ Error adding user to tenant: {e}")
            return {'success': False, 'error': str(e)}

    async def get_tenant_users(self, tenant_id: str) -> List[Dict[str, Any]]:
        """Get all users for a tenant"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    SELECT * FROM tenant_users WHERE tenant_id = ? AND status = 'active'
                    ORDER BY created_at
                ''', (tenant_id,))
                
                columns = [description[0] for description in cursor.description]
                users = [dict(zip(columns, row)) for row in cursor.fetchall()]
                
                return users
                
        except Exception as e:
            logger.error(f"❌ Error retrieving tenant users: {e}")
            return []

    # ============================================================================
    # TENANT ANALYTICS MIGRATION
    # ============================================================================

    async def _initialize_tenant_data(self, tenant_id: str):
        """Initialize tenant with sample data for demonstration"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Create sample analytics data for the past 30 days
                from datetime import date
                today = date.today()
                
                for i in range(30):
                    analytics_date = today - timedelta(days=i)
                    
                    # Generate realistic sample data
                    base_revenue = 450 + (i * 5)  # Growing revenue
                    base_bookings = 12 + (i // 7)  # Weekly growth pattern
                    
                    cursor.execute('''
                        INSERT OR IGNORE INTO tenant_analytics (
                            id, tenant_id, date, revenue, bookings, customers,
                            utilization_rate, satisfaction_score, created_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (
                        self._generate_uuid(), tenant_id, analytics_date.isoformat(),
                        base_revenue, base_bookings, base_bookings,
                        0.75 + (i * 0.002), 4.2 + (i * 0.01),
                        datetime.now().isoformat()
                    ))
                
                conn.commit()
                logger.info(f"✅ Initialized sample data for tenant: {tenant_id}")
                
        except Exception as e:
            logger.error(f"❌ Error initializing tenant data: {e}")

    # ============================================================================
    # UTILITY METHODS
    # ============================================================================

    def _generate_uuid(self) -> str:
        """Generate UUID for database records"""
        import uuid
        return str(uuid.uuid4())

    def _generate_slug(self, name: str) -> str:
        """Generate URL-friendly slug from tenant name"""
        # Convert to lowercase and replace spaces/special chars with hyphens
        slug = re.sub(r'[^\w\s-]', '', name.lower())
        slug = re.sub(r'[-\s]+', '-', slug)
        slug = slug.strip('-')
        
        # Ensure uniqueness by checking database
        base_slug = slug
        counter = 1
        
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                while True:
                    cursor.execute('SELECT id FROM tenants WHERE slug = ?', (slug,))
                    if not cursor.fetchone():
                        break
                    slug = f"{base_slug}-{counter}"
                    counter += 1
        except Exception:
            pass  # If check fails, proceed with original slug
        
        return slug

    async def get_tenant_statistics(self) -> Dict[str, Any]:
        """Get platform-wide tenant statistics"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Get tenant counts by status
                cursor.execute('''
                    SELECT status, COUNT(*) as count 
                    FROM tenants 
                    GROUP BY status
                ''')
                status_counts = dict(cursor.fetchall())
                
                # Get tenant counts by plan
                cursor.execute('''
                    SELECT plan_tier, COUNT(*) as count 
                    FROM tenants 
                    WHERE status = 'active'
                    GROUP BY plan_tier
                ''')
                plan_counts = dict(cursor.fetchall())
                
                # Get trial expiry information
                cursor.execute('''
                    SELECT COUNT(*) as count
                    FROM tenants 
                    WHERE billing_status = 'trial' 
                    AND trial_ends_at < datetime('now', '+7 days')
                ''')
                trials_expiring_soon = cursor.fetchone()[0]
                
                return {
                    'total_tenants': sum(status_counts.values()),
                    'active_tenants': status_counts.get('active', 0),
                    'suspended_tenants': status_counts.get('suspended', 0),
                    'plan_distribution': plan_counts,
                    'trials_expiring_soon': trials_expiring_soon,
                    'generated_at': datetime.now().isoformat()
                }
                
        except Exception as e:
            logger.error(f"❌ Error getting tenant statistics: {e}")
            return {'error': str(e)}

# Create global service instance
tenant_management_service = TenantManagementService()