-- Migration: Barber Operations System
-- Description: Creates tables for barber hierarchy, customization, and financial management
-- Author: System
-- Date: 2025-01-11

-- ============================================
-- 1. BARBER CUSTOMIZATIONS TABLE
-- ============================================
-- Stores individual barber profile customizations
CREATE TABLE IF NOT EXISTS barber_customizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
    
    -- Custom URL and Display
    custom_url VARCHAR(255) UNIQUE, -- e.g., "chris-bossio" for barbershop.com/chris-bossio
    display_name VARCHAR(255),
    bio TEXT,
    
    -- Professional Info
    years_experience INTEGER DEFAULT 0,
    specialties TEXT[], -- Array of specialties
    certifications JSONB, -- Certification details
    
    -- Branding
    profile_image_url TEXT,
    cover_image_url TEXT,
    portfolio_images JSONB, -- Array of portfolio image URLs with descriptions
    
    -- Contact & Social
    contact_phone VARCHAR(20),
    contact_email VARCHAR(255),
    social_links JSONB, -- {instagram: "url", facebook: "url", etc.}
    
    -- Settings
    booking_enabled BOOLEAN DEFAULT true,
    online_booking BOOLEAN DEFAULT true,
    walk_ins_accepted BOOLEAN DEFAULT true,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_user_barbershop UNIQUE(user_id, barbershop_id)
);

-- ============================================
-- 2. BARBER SERVICES TABLE
-- ============================================
-- Services offered by individual barbers
CREATE TABLE IF NOT EXISTS barber_services (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    barbershop_id UUID REFERENCES barbershops(id) ON DELETE SET NULL,
    
    -- Service Details
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100), -- 'haircut', 'beard', 'color', 'treatment', etc.
    
    -- Pricing
    price DECIMAL(10, 2) NOT NULL,
    duration INTEGER NOT NULL, -- in minutes
    
    -- Settings
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. BARBER AVAILABILITY TABLE
-- ============================================
-- Individual barber schedules
CREATE TABLE IF NOT EXISTS barber_availability (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    barbershop_id UUID REFERENCES barbershops(id) ON DELETE SET NULL,
    
    -- Schedule
    day_of_week VARCHAR(10) NOT NULL, -- 'monday', 'tuesday', etc.
    start_time TIME,
    end_time TIME,
    is_available BOOLEAN DEFAULT true,
    
    -- Break times (optional)
    break_start TIME,
    break_end TIME,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_barber_day UNIQUE(user_id, day_of_week)
);

-- ============================================
-- 4. FINANCIAL ARRANGEMENTS TABLE
-- ============================================
-- Defines financial relationships between shops and barbers
CREATE TABLE IF NOT EXISTS financial_arrangements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    barber_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Arrangement Type
    type VARCHAR(50) NOT NULL, -- 'commission', 'booth_rent', 'hybrid'
    
    -- Commission Details (if applicable)
    commission_percentage DECIMAL(5, 2), -- e.g., 60.00 for 60%
    
    -- Booth Rent Details (if applicable)
    booth_rent_amount DECIMAL(10, 2),
    booth_rent_frequency VARCHAR(20), -- 'daily', 'weekly', 'monthly'
    
    -- Product Sales Commission
    product_commission_percentage DECIMAL(5, 2) DEFAULT 10.00,
    
    -- Payment Settings
    payment_method VARCHAR(50), -- 'direct_deposit', 'check', 'cash'
    payment_frequency VARCHAR(20), -- 'daily', 'weekly', 'bi-weekly', 'monthly'
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_shop_barber UNIQUE(barbershop_id, barber_id)
);

-- ============================================
-- 5. PRODUCTS TABLE
-- ============================================
-- Products for sale in barbershops
CREATE TABLE IF NOT EXISTS products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    
    -- Product Info
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100), -- 'hair_care', 'beard_care', 'tools', 'accessories'
    brand VARCHAR(255),
    sku VARCHAR(100),
    
    -- Pricing
    cost_price DECIMAL(10, 2), -- What shop pays
    retail_price DECIMAL(10, 2) NOT NULL, -- What customer pays
    
    -- Inventory
    current_stock INTEGER DEFAULT 0,
    min_stock_level INTEGER DEFAULT 0,
    max_stock_level INTEGER,
    
    -- Settings
    is_active BOOLEAN DEFAULT true,
    track_inventory BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6. PRODUCT SALES TABLE
-- ============================================
-- Track product sales and commissions
CREATE TABLE IF NOT EXISTS product_sales (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    barber_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Sale Details
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    
    -- Commission
    commission_amount DECIMAL(10, 2),
    commission_paid BOOLEAN DEFAULT false,
    commission_paid_date TIMESTAMPTZ,
    
    -- Transaction
    payment_method VARCHAR(50),
    transaction_id VARCHAR(255),
    
    sale_date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 7. BARBERSHOP STAFF TABLE
-- ============================================
-- Links barbers to barbershops with roles
CREATE TABLE IF NOT EXISTS barbershop_staff (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Role in this barbershop
    role VARCHAR(50) NOT NULL DEFAULT 'BARBER', -- 'BARBER', 'MANAGER', 'RECEPTIONIST'
    
    -- Employment Details
    hire_date DATE DEFAULT CURRENT_DATE,
    termination_date DATE,
    
    -- Permissions (for future use)
    permissions JSONB DEFAULT '{}',
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_barbershop_user UNIQUE(barbershop_id, user_id)
);

-- ============================================
-- 8. ORGANIZATIONS TABLE (for enterprises)
-- ============================================
-- Organizations that own multiple barbershops
CREATE TABLE IF NOT EXISTS organizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Organization Details
    description TEXT,
    logo_url TEXT,
    website VARCHAR(255),
    
    -- Contact
    headquarters_address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add organization reference to barbershops
ALTER TABLE barbershops 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

-- ============================================
-- 9. USER VIEW SESSIONS TABLE
-- ============================================
-- Track when users view as different roles/contexts
CREATE TABLE IF NOT EXISTS user_view_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Context being viewed
    context_type VARCHAR(50) NOT NULL, -- 'barber', 'shop', 'primary'
    context_id UUID, -- ID of barber or shop being viewed
    
    -- Session Details
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    
    -- Audit
    ip_address INET,
    user_agent TEXT
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_barber_customizations_user ON barber_customizations(user_id);
CREATE INDEX IF NOT EXISTS idx_barber_customizations_shop ON barber_customizations(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_barber_customizations_url ON barber_customizations(custom_url);

CREATE INDEX IF NOT EXISTS idx_barber_services_user ON barber_services(user_id);
CREATE INDEX IF NOT EXISTS idx_barber_services_shop ON barber_services(barbershop_id);

CREATE INDEX IF NOT EXISTS idx_financial_arrangements_shop ON financial_arrangements(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_financial_arrangements_barber ON financial_arrangements(barber_id);

CREATE INDEX IF NOT EXISTS idx_product_sales_shop ON product_sales(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_product_sales_barber ON product_sales(barber_id);
CREATE INDEX IF NOT EXISTS idx_product_sales_date ON product_sales(sale_date);

CREATE INDEX IF NOT EXISTS idx_barbershop_staff_shop ON barbershop_staff(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_barbershop_staff_user ON barbershop_staff(user_id);

CREATE INDEX IF NOT EXISTS idx_organizations_owner ON organizations(owner_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================
-- Enable RLS on all tables
ALTER TABLE barber_customizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE barber_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE barber_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_arrangements ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE barbershop_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_view_sessions ENABLE ROW LEVEL SECURITY;

-- Barber Customizations Policies
CREATE POLICY "Users can view their own customizations" ON barber_customizations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own customizations" ON barber_customizations
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own customizations" ON barber_customizations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public can view active barber profiles" ON barber_customizations
    FOR SELECT USING (is_active = true);

-- Barber Services Policies
CREATE POLICY "Users can manage their own services" ON barber_services
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Public can view active services" ON barber_services
    FOR SELECT USING (is_active = true);

-- Financial Arrangements Policies (shop owners only)
CREATE POLICY "Shop owners can view their arrangements" ON financial_arrangements
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM barbershops 
            WHERE barbershops.id = financial_arrangements.barbershop_id 
            AND barbershops.owner_id = auth.uid()
        )
    );

CREATE POLICY "Barbers can view their own arrangements" ON financial_arrangements
    FOR SELECT USING (auth.uid() = barber_id);

-- Products Policies
CREATE POLICY "Shop owners can manage their products" ON products
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM barbershops 
            WHERE barbershops.id = products.barbershop_id 
            AND barbershops.owner_id = auth.uid()
        )
    );

CREATE POLICY "Staff can view shop products" ON products
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM barbershop_staff 
            WHERE barbershop_staff.barbershop_id = products.barbershop_id 
            AND barbershop_staff.user_id = auth.uid()
            AND barbershop_staff.is_active = true
        )
    );

-- Organizations Policies
CREATE POLICY "Owners can manage their organizations" ON organizations
    FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY "Public can view active organizations" ON organizations
    FOR SELECT USING (is_active = true);

-- ============================================
-- SAMPLE DATA (Optional - Remove in production)
-- ============================================
-- Uncomment below to insert sample data for testing

/*
-- Sample Organization
INSERT INTO organizations (name, owner_id, description)
VALUES ('Premium Cuts Enterprise', auth.uid(), 'Multi-location barbershop chain')
ON CONFLICT DO NOTHING;

-- Sample Financial Arrangement
INSERT INTO financial_arrangements (barbershop_id, barber_id, type, commission_percentage)
SELECT 
    (SELECT id FROM barbershops LIMIT 1),
    auth.uid(),
    'commission',
    60.00
WHERE EXISTS (SELECT 1 FROM barbershops)
ON CONFLICT DO NOTHING;
*/

-- ============================================
-- MIGRATION COMPLETE
-- ============================================