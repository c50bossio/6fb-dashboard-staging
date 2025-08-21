-- Migration: Enterprise Multi-Location Schema
-- Description: Creates tables for enterprise barbershop chain management
-- Author: Claude Code
-- Date: 2025-08-21
-- 
-- This migration adds the foundation for enterprise multi-location management,
-- allowing barbershop chains to manage multiple locations under one organization.

-- ============================================
-- 1. ORGANIZATIONS TABLE (Enterprise Entities)
-- ============================================
CREATE TABLE IF NOT EXISTS organizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Basic Information
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL, -- URL-friendly name for enterprise portal
    description TEXT,
    
    -- Enterprise Branding
    logo_url TEXT,
    primary_color VARCHAR(7) DEFAULT '#1E40AF',
    secondary_color VARCHAR(7) DEFAULT '#3B82F6',
    
    -- Contact Information
    headquarters_address VARCHAR(255),
    headquarters_city VARCHAR(100),
    headquarters_state VARCHAR(50),
    headquarters_zip VARCHAR(20),
    phone VARCHAR(20),
    email VARCHAR(255),
    
    -- Ownership & Management
    owner_id UUID REFERENCES auth.users(id) ON DELETE RESTRICT NOT NULL,
    
    -- Business Details
    industry VARCHAR(100) DEFAULT 'Barbershop Chain',
    founded_year INTEGER,
    total_locations INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    is_active BOOLEAN DEFAULT true
);

-- ============================================
-- 2. ENTERPRISE WEBSITES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS enterprise_websites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    
    -- Website Settings
    custom_domain VARCHAR(255),
    subdomain VARCHAR(255), -- for portal.bookedbarber.com subdomains
    
    -- Content Management
    hero_title VARCHAR(255),
    hero_subtitle TEXT,
    about_content TEXT,
    mission_statement TEXT,
    
    -- SEO & Metadata
    meta_title VARCHAR(255),
    meta_description TEXT,
    meta_keywords TEXT,
    
    -- Design Customization
    theme_color VARCHAR(7) DEFAULT '#1E40AF',
    accent_color VARCHAR(7) DEFAULT '#10B981',
    font_family VARCHAR(100) DEFAULT 'Inter',
    
    -- Content Sections
    show_locations BOOLEAN DEFAULT true,
    show_services BOOLEAN DEFAULT true,
    show_about BOOLEAN DEFAULT true,
    show_contact BOOLEAN DEFAULT true,
    
    -- Publishing
    is_published BOOLEAN DEFAULT false,
    published_at TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================
-- 3. ADD ORGANIZATION SUPPORT TO BARBERSHOPS
-- ============================================
-- Add organization_id to barbershops if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'barbershops' AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE barbershops 
        ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add organization hierarchy fields
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'barbershops' AND column_name = 'location_manager_id'
    ) THEN
        ALTER TABLE barbershops 
        ADD COLUMN location_manager_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'barbershops' AND column_name = 'location_status'
    ) THEN
        ALTER TABLE barbershops 
        ADD COLUMN location_status VARCHAR(20) DEFAULT 'active' CHECK (location_status IN ('active', 'inactive', 'pending', 'maintenance'));
    END IF;
END $$;

-- ============================================
-- 4. ORGANIZATION ROLES & PERMISSIONS
-- ============================================
CREATE TABLE IF NOT EXISTS organization_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Role in Organization
    role VARCHAR(50) NOT NULL CHECK (role IN ('owner', 'admin', 'manager', 'staff')),
    
    -- Permissions
    can_manage_locations BOOLEAN DEFAULT false,
    can_manage_staff BOOLEAN DEFAULT false,
    can_view_analytics BOOLEAN DEFAULT false,
    can_edit_website BOOLEAN DEFAULT false,
    
    -- Metadata
    invited_by UUID REFERENCES auth.users(id),
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    joined_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    UNIQUE(organization_id, user_id)
);

-- ============================================
-- 5. ENTERPRISE ANALYTICS CACHE
-- ============================================
CREATE TABLE IF NOT EXISTS enterprise_analytics_cache (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    
    -- Cached Metrics (updated daily)
    total_locations INTEGER DEFAULT 0,
    total_barbers INTEGER DEFAULT 0,
    total_customers INTEGER DEFAULT 0,
    
    -- Revenue Metrics
    monthly_revenue DECIMAL(12,2) DEFAULT 0,
    yearly_revenue DECIMAL(12,2) DEFAULT 0,
    avg_revenue_per_location DECIMAL(12,2) DEFAULT 0,
    
    -- Performance Metrics
    avg_rating DECIMAL(3,2) DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    total_bookings_month INTEGER DEFAULT 0,
    
    -- Cache Metadata
    cached_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    cache_period VARCHAR(20) DEFAULT 'monthly', -- daily, weekly, monthly
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    UNIQUE(organization_id, cache_period)
);

-- ============================================
-- 6. INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_organizations_owner ON organizations(owner_id);
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_active ON organizations(is_active);

CREATE INDEX IF NOT EXISTS idx_enterprise_websites_org ON enterprise_websites(organization_id);
CREATE INDEX IF NOT EXISTS idx_enterprise_websites_domain ON enterprise_websites(custom_domain);
CREATE INDEX IF NOT EXISTS idx_enterprise_websites_subdomain ON enterprise_websites(subdomain);

CREATE INDEX IF NOT EXISTS idx_barbershops_organization ON barbershops(organization_id);
CREATE INDEX IF NOT EXISTS idx_barbershops_manager ON barbershops(location_manager_id);
CREATE INDEX IF NOT EXISTS idx_barbershops_status ON barbershops(location_status);

CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_role ON organization_members(role);

CREATE INDEX IF NOT EXISTS idx_enterprise_cache_org ON enterprise_analytics_cache(organization_id);
CREATE INDEX IF NOT EXISTS idx_enterprise_cache_period ON enterprise_analytics_cache(cache_period);

-- ============================================
-- 7. ROW LEVEL SECURITY (RLS)
-- ============================================

-- Organizations: Users can only see organizations they own or are members of
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "organizations_access" ON organizations
    FOR ALL USING (
        (SELECT auth.uid()) = owner_id OR
        (SELECT auth.uid()) IN (
            SELECT user_id FROM organization_members 
            WHERE organization_id = organizations.id
        )
    );

-- Enterprise Websites: Access through organization membership
ALTER TABLE enterprise_websites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "enterprise_websites_access" ON enterprise_websites
    FOR ALL USING (
        organization_id IN (
            SELECT id FROM organizations
            WHERE (SELECT auth.uid()) = owner_id OR
            (SELECT auth.uid()) IN (
                SELECT user_id FROM organization_members 
                WHERE organization_id = organizations.id
            )
        )
    );

-- Organization Members: Members can see other members of their organizations
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "organization_members_access" ON organization_members
    FOR ALL USING (
        (SELECT auth.uid()) = user_id OR
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = (SELECT auth.uid())
        )
    );

-- Enterprise Analytics Cache: Access through organization membership
ALTER TABLE enterprise_analytics_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "enterprise_analytics_access" ON enterprise_analytics_cache
    FOR ALL USING (
        organization_id IN (
            SELECT id FROM organizations
            WHERE (SELECT auth.uid()) = owner_id OR
            (SELECT auth.uid()) IN (
                SELECT user_id FROM organization_members 
                WHERE organization_id = organizations.id
            )
        )
    );

-- ============================================
-- 8. HELPER FUNCTIONS
-- ============================================

-- Function to get user's organizations
CREATE OR REPLACE FUNCTION get_user_organizations(user_uuid UUID)
RETURNS TABLE(
    org_id UUID,
    org_name TEXT,
    role TEXT,
    location_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id,
        o.name::TEXT,
        COALESCE(om.role, 'owner')::TEXT,
        COALESCE(o.total_locations, 0)::INTEGER
    FROM organizations o
    LEFT JOIN organization_members om ON o.id = om.organization_id AND om.user_id = user_uuid
    WHERE o.owner_id = user_uuid OR om.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update organization location count
CREATE OR REPLACE FUNCTION update_organization_location_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        IF NEW.organization_id IS NOT NULL THEN
            UPDATE organizations 
            SET total_locations = (
                SELECT COUNT(*) FROM barbershops 
                WHERE organization_id = NEW.organization_id 
                AND location_status = 'active'
            )
            WHERE id = NEW.organization_id;
        END IF;
    END IF;
    
    IF TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN
        IF OLD.organization_id IS NOT NULL THEN
            UPDATE organizations 
            SET total_locations = (
                SELECT COUNT(*) FROM barbershops 
                WHERE organization_id = OLD.organization_id 
                AND location_status = 'active'
            )
            WHERE id = OLD.organization_id;
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update location counts
DROP TRIGGER IF EXISTS trigger_update_org_location_count ON barbershops;
CREATE TRIGGER trigger_update_org_location_count
    AFTER INSERT OR UPDATE OR DELETE ON barbershops
    FOR EACH ROW EXECUTE FUNCTION update_organization_location_count();

-- ============================================
-- 9. SAMPLE DATA FOR TESTING (Optional)
-- ============================================

-- Create a sample organization for testing
INSERT INTO organizations (
    name, 
    slug, 
    description,
    headquarters_city,
    headquarters_state,
    owner_id
) VALUES (
    'Elite Barber Chain',
    'elite-barber-chain',
    'Premium barbershop chain serving the metropolitan area',
    'New York',
    'NY',
    (SELECT id FROM auth.users LIMIT 1) -- Use first available user
) ON CONFLICT (slug) DO NOTHING;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Enterprise schema migration completed successfully!';
    RAISE NOTICE 'Created tables: organizations, enterprise_websites, organization_members, enterprise_analytics_cache';
    RAISE NOTICE 'Added organization support to barbershops table';
    RAISE NOTICE 'Configured RLS policies and helper functions';
END $$;