-- Barber Operations Hierarchy Schema Extensions
-- This schema adds support for individual barber customization, financial arrangements,
-- and product sales management

-- ==========================================
-- BARBER CUSTOMIZATION & PERSONALIZATION
-- ==========================================

-- Barber profile customizations for landing pages
CREATE TABLE IF NOT EXISTS barber_customizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  
  -- URL and SEO
  custom_path VARCHAR(100) UNIQUE, -- 'chris-bossio' for barbershop.com/chris-bossio
  page_title VARCHAR(200),
  meta_description TEXT,
  
  -- Visual Branding
  primary_color VARCHAR(7) DEFAULT '#000000', -- Hex color
  secondary_color VARCHAR(7) DEFAULT '#FFFFFF',
  accent_color VARCHAR(7) DEFAULT '#FFD700',
  background_image_url TEXT,
  logo_url TEXT,
  font_family VARCHAR(100) DEFAULT 'Inter',
  
  -- Professional Information
  bio TEXT,
  years_experience INTEGER,
  specialties TEXT[], -- Array of specialties
  certifications TEXT[],
  languages_spoken TEXT[],
  
  -- Portfolio
  portfolio_images JSONB DEFAULT '[]', -- Array of image URLs with captions
  before_after_images JSONB DEFAULT '[]',
  featured_work JSONB DEFAULT '[]',
  
  -- Contact & Social
  display_phone VARCHAR(20),
  display_email VARCHAR(255),
  instagram_handle VARCHAR(100),
  tiktok_handle VARCHAR(100),
  facebook_url TEXT,
  youtube_url TEXT,
  
  -- Business Settings
  accepts_walk_ins BOOLEAN DEFAULT false,
  booking_advance_days INTEGER DEFAULT 30,
  minimum_notice_hours INTEGER DEFAULT 24,
  cancellation_policy TEXT,
  deposit_required BOOLEAN DEFAULT false,
  deposit_amount DECIMAL(8,2),
  
  -- Approval Status
  approved_by_owner BOOLEAN DEFAULT false,
  approved_at TIMESTAMP WITH TIME ZONE,
  approval_notes TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, barbershop_id)
);

-- Barber-specific services (can override or add to shop defaults)
CREATE TABLE IF NOT EXISTS barber_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barber_id UUID REFERENCES users(id) ON DELETE CASCADE,
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  base_service_id UUID REFERENCES services(id) ON DELETE SET NULL, -- Optional: inherit from shop service
  
  -- Service details
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100), -- 'haircut', 'beard', 'styling', 'treatment', 'combo'
  
  -- Pricing and duration
  price DECIMAL(8,2) NOT NULL,
  duration_minutes INTEGER NOT NULL,
  
  -- Add-ons and options
  allows_addons BOOLEAN DEFAULT false,
  addon_options JSONB DEFAULT '[]', -- Array of addon options with prices
  
  -- Display settings
  is_featured BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  
  -- Booking rules
  online_booking_enabled BOOLEAN DEFAULT true,
  requires_consultation BOOLEAN DEFAULT false,
  max_daily_bookings INTEGER, -- Limit per day for this service
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- FINANCIAL ARRANGEMENTS
-- ==========================================

-- Track financial arrangements between shops and barbers
CREATE TABLE IF NOT EXISTS financial_arrangements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  barber_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Arrangement type
  arrangement_type VARCHAR(20) NOT NULL CHECK (arrangement_type IN ('commission', 'booth_rent', 'hybrid')),
  
  -- Commission settings (for commission-based)
  service_commission_rate DECIMAL(5,4), -- 0.6000 = 60% to barber
  product_commission_rate DECIMAL(5,4), -- 0.1000 = 10% to barber
  tip_commission_rate DECIMAL(5,4), -- 1.0000 = 100% to barber
  
  -- Commission tiers (progressive rates based on revenue)
  commission_tiers JSONB DEFAULT '[]', -- Array of {threshold, rate} objects
  
  -- Booth rent settings (for booth rent model)
  rent_amount DECIMAL(10,2),
  rent_frequency VARCHAR(20), -- 'weekly', 'biweekly', 'monthly'
  rent_due_day INTEGER, -- Day of week (1-7) or month (1-31)
  late_fee_amount DECIMAL(8,2),
  grace_period_days INTEGER DEFAULT 3,
  
  -- Hybrid model settings
  base_rent_amount DECIMAL(10,2), -- Lower rent + commission
  hybrid_commission_rate DECIMAL(5,4), -- Lower commission rate
  
  -- Payment settings
  payout_frequency VARCHAR(20) DEFAULT 'weekly', -- 'daily', 'weekly', 'biweekly', 'monthly'
  payout_method VARCHAR(50) DEFAULT 'bank_transfer', -- 'bank_transfer', 'check', 'cash'
  bank_account_last4 VARCHAR(4),
  
  -- Status and dates
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(barbershop_id, barber_id, effective_date)
);

-- ==========================================
-- PRODUCT INVENTORY & SALES
-- ==========================================

-- Product inventory management
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  
  -- Product information
  name VARCHAR(255) NOT NULL,
  brand VARCHAR(100),
  category VARCHAR(50), -- 'hair_care', 'beard_care', 'styling', 'tools', 'accessories'
  subcategory VARCHAR(50),
  description TEXT,
  
  -- Identifiers
  sku VARCHAR(100),
  barcode VARCHAR(100),
  supplier_code VARCHAR(100),
  
  -- Pricing
  cost_price DECIMAL(8,2), -- What shop pays supplier
  retail_price DECIMAL(8,2) NOT NULL, -- What customer pays
  wholesale_price DECIMAL(8,2), -- For bulk sales
  
  -- Inventory tracking
  current_stock INTEGER DEFAULT 0,
  reserved_stock INTEGER DEFAULT 0, -- Reserved for pending orders
  min_stock_level INTEGER DEFAULT 5,
  reorder_point INTEGER DEFAULT 10,
  max_stock_level INTEGER DEFAULT 100,
  
  -- Product details
  size VARCHAR(50),
  unit_of_measure VARCHAR(20), -- 'oz', 'ml', 'piece', etc.
  ingredients TEXT,
  directions TEXT,
  warnings TEXT,
  
  -- Images
  image_url TEXT,
  thumbnail_url TEXT,
  gallery_images JSONB DEFAULT '[]',
  
  -- Settings
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  online_sale_enabled BOOLEAN DEFAULT true,
  track_inventory BOOLEAN DEFAULT true,
  allow_backorder BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Product sales transactions
CREATE TABLE IF NOT EXISTS product_sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  barber_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Who sold it
  client_id UUID REFERENCES users(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL, -- Link to appointment if applicable
  
  -- Sale details
  sale_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Items (stored as JSONB for flexibility with multiple products)
  line_items JSONB NOT NULL, -- Array of {product_id, quantity, unit_price, discount, commission}
  
  -- Totals
  subtotal DECIMAL(10,2) NOT NULL,
  tax_amount DECIMAL(8,2) DEFAULT 0,
  discount_amount DECIMAL(8,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  
  -- Commission tracking
  total_commission DECIMAL(8,2) DEFAULT 0,
  commission_paid BOOLEAN DEFAULT false,
  commission_paid_date TIMESTAMP WITH TIME ZONE,
  
  -- Payment
  payment_method VARCHAR(50), -- 'card', 'cash', 'check', 'appointment_checkout'
  payment_status VARCHAR(20) DEFAULT 'completed', -- 'pending', 'completed', 'refunded'
  stripe_payment_id VARCHAR(255),
  
  -- Notes
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inventory adjustments and tracking
CREATE TABLE IF NOT EXISTS inventory_adjustments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  adjusted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Adjustment details
  adjustment_type VARCHAR(50) NOT NULL, -- 'sale', 'return', 'damage', 'theft', 'recount', 'received'
  quantity_change INTEGER NOT NULL, -- Positive for additions, negative for reductions
  
  -- Stock levels
  stock_before INTEGER NOT NULL,
  stock_after INTEGER NOT NULL,
  
  -- Reference
  reference_type VARCHAR(50), -- 'sale', 'purchase_order', 'manual'
  reference_id UUID, -- ID of related sale or purchase order
  
  -- Notes
  reason TEXT,
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- VIEW SWITCHING & CONTEXT MANAGEMENT
-- ==========================================

-- Track when higher-level users view as lower-level users
CREATE TABLE IF NOT EXISTS user_view_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  viewer_id UUID REFERENCES users(id) ON DELETE CASCADE, -- The actual logged-in user
  viewing_as_id UUID REFERENCES users(id) ON DELETE CASCADE, -- Who they're viewing as
  
  -- Context
  view_type VARCHAR(20) NOT NULL, -- 'barber', 'shop_owner'
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  
  -- Session tracking
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  ip_address INET,
  user_agent TEXT,
  
  -- Audit
  actions_taken JSONB DEFAULT '[]', -- Log of what was viewed
  
  is_active BOOLEAN DEFAULT true
);

-- ==========================================
-- BARBER PERFORMANCE METRICS
-- ==========================================

-- Track barber performance for analytics
CREATE TABLE IF NOT EXISTS barber_performance_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barber_id UUID REFERENCES users(id) ON DELETE CASCADE,
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  
  -- Time period
  metric_date DATE NOT NULL,
  metric_type VARCHAR(20) DEFAULT 'daily', -- 'daily', 'weekly', 'monthly'
  
  -- Appointment metrics
  appointments_completed INTEGER DEFAULT 0,
  appointments_cancelled INTEGER DEFAULT 0,
  appointments_no_show INTEGER DEFAULT 0,
  
  -- Revenue metrics
  service_revenue DECIMAL(10,2) DEFAULT 0,
  product_revenue DECIMAL(10,2) DEFAULT 0,
  tip_revenue DECIMAL(10,2) DEFAULT 0,
  total_revenue DECIMAL(10,2) DEFAULT 0,
  
  -- Commission/earnings
  service_commission DECIMAL(10,2) DEFAULT 0,
  product_commission DECIMAL(10,2) DEFAULT 0,
  total_earnings DECIMAL(10,2) DEFAULT 0,
  
  -- Client metrics
  new_clients INTEGER DEFAULT 0,
  returning_clients INTEGER DEFAULT 0,
  client_retention_rate DECIMAL(5,4) DEFAULT 0,
  
  -- Efficiency metrics
  average_service_time INTEGER, -- In minutes
  chair_utilization_rate DECIMAL(5,4) DEFAULT 0, -- Percentage of available time booked
  
  -- Product sales
  products_sold INTEGER DEFAULT 0,
  average_product_sale DECIMAL(8,2) DEFAULT 0,
  
  -- Ratings
  average_rating DECIMAL(3,2) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(barber_id, barbershop_id, metric_date, metric_type)
);

-- ==========================================
-- INDEXES FOR PERFORMANCE
-- ==========================================

-- Barber customization indexes
CREATE INDEX idx_barber_custom_user ON barber_customizations(user_id);
CREATE INDEX idx_barber_custom_shop ON barber_customizations(barbershop_id);
CREATE INDEX idx_barber_custom_path ON barber_customizations(custom_path);
CREATE INDEX idx_barber_custom_approved ON barber_customizations(approved_by_owner);

-- Barber services indexes
CREATE INDEX idx_barber_services_barber ON barber_services(barber_id);
CREATE INDEX idx_barber_services_shop ON barber_services(barbershop_id);
CREATE INDEX idx_barber_services_active ON barber_services(is_active);

-- Financial arrangements indexes
CREATE INDEX idx_financial_shop ON financial_arrangements(barbershop_id);
CREATE INDEX idx_financial_barber ON financial_arrangements(barber_id);
CREATE INDEX idx_financial_active ON financial_arrangements(is_active);
CREATE INDEX idx_financial_dates ON financial_arrangements(effective_date, end_date);

-- Product indexes
CREATE INDEX idx_products_shop ON products(barbershop_id);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_category ON products(category);

-- Product sales indexes
CREATE INDEX idx_sales_shop ON product_sales(barbershop_id);
CREATE INDEX idx_sales_barber ON product_sales(barber_id);
CREATE INDEX idx_sales_date ON product_sales(sale_date);
CREATE INDEX idx_sales_appointment ON product_sales(appointment_id);

-- Inventory adjustment indexes
CREATE INDEX idx_inventory_product ON inventory_adjustments(product_id);
CREATE INDEX idx_inventory_date ON inventory_adjustments(created_at);

-- View session indexes
CREATE INDEX idx_view_sessions_viewer ON user_view_sessions(viewer_id);
CREATE INDEX idx_view_sessions_viewing ON user_view_sessions(viewing_as_id);
CREATE INDEX idx_view_sessions_active ON user_view_sessions(is_active);

-- Performance metrics indexes
CREATE INDEX idx_perf_barber ON barber_performance_metrics(barber_id);
CREATE INDEX idx_perf_shop ON barber_performance_metrics(barbershop_id);
CREATE INDEX idx_perf_date ON barber_performance_metrics(metric_date);
CREATE INDEX idx_perf_type ON barber_performance_metrics(metric_type);