-- =====================================================
-- BookedBarber Inventory Marketplace - Production Deployment
-- Run this in Supabase SQL Editor
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- MASTER PRODUCT CATALOG (BookedBarber's Offerings)
-- =====================================================

CREATE TABLE IF NOT EXISTS master_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Product identifiers
  sku VARCHAR(100) UNIQUE NOT NULL,
  barcode VARCHAR(100),
  cin7_product_id VARCHAR(255),
  
  -- Product information
  name VARCHAR(255) NOT NULL,
  brand VARCHAR(100),
  category VARCHAR(50),
  subcategory VARCHAR(50),
  description TEXT,
  
  -- Pricing
  wholesale_price DECIMAL(10,2) NOT NULL,
  msrp DECIMAL(10,2),
  map_price DECIMAL(10,2),
  
  -- Bulk pricing stored as JSONB
  bulk_pricing_tiers JSONB DEFAULT '[]'::jsonb,
  
  -- Ordering rules
  min_order_quantity INTEGER DEFAULT 1,
  order_increment INTEGER DEFAULT 1,
  max_order_quantity INTEGER,
  
  -- Product details
  size VARCHAR(50),
  unit_of_measure VARCHAR(20),
  weight_kg DECIMAL(6,3),
  dimensions_cm JSONB,
  
  -- Media
  image_url TEXT,
  thumbnail_url TEXT,
  gallery_images JSONB DEFAULT '[]'::jsonb,
  video_url TEXT,
  
  -- Specifications
  ingredients TEXT,
  directions TEXT,
  warnings TEXT,
  specifications JSONB DEFAULT '{}'::jsonb,
  
  -- Metadata
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  is_new BOOLEAN DEFAULT false,
  launch_date DATE,
  discontinue_date DATE,
  
  -- SEO
  seo_title VARCHAR(255),
  seo_description TEXT,
  seo_keywords TEXT[],
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- WAREHOUSE INVENTORY (Synced with CIN7)
-- =====================================================

CREATE TABLE IF NOT EXISTS warehouse_inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  master_product_id UUID REFERENCES master_products(id) ON DELETE CASCADE,
  
  -- Stock levels
  quantity_available INTEGER DEFAULT 0,
  quantity_reserved INTEGER DEFAULT 0,
  quantity_on_order INTEGER DEFAULT 0,
  
  -- Warehouse location
  warehouse_location VARCHAR(100) DEFAULT 'main',
  bin_location VARCHAR(50),
  
  -- Reorder management
  reorder_point INTEGER DEFAULT 10,
  reorder_quantity INTEGER DEFAULT 50,
  max_stock_level INTEGER DEFAULT 500,
  lead_time_days INTEGER DEFAULT 7,
  
  -- Sync tracking
  last_cin7_sync TIMESTAMPTZ,
  cin7_sync_status VARCHAR(20),
  cin7_stock_level INTEGER,
  sync_discrepancy INTEGER,
  
  -- Cost tracking
  average_cost DECIMAL(10,2),
  last_cost DECIMAL(10,2),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(master_product_id, warehouse_location)
);

-- =====================================================
-- BARBERSHOP LOCAL INVENTORY
-- =====================================================

CREATE TABLE IF NOT EXISTS barbershop_inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbershop_id UUID NOT NULL,
  
  -- Product source
  product_source VARCHAR(20) NOT NULL DEFAULT 'custom',
  master_product_id UUID REFERENCES master_products(id),
  
  -- Product information
  name VARCHAR(255) NOT NULL,
  brand VARCHAR(100),
  sku VARCHAR(100) NOT NULL,
  barcode VARCHAR(100),
  category VARCHAR(50),
  subcategory VARCHAR(50),
  description TEXT,
  
  -- Stock tracking
  quantity_on_hand INTEGER DEFAULT 0,
  quantity_reserved INTEGER DEFAULT 0,
  
  -- Reorder settings
  reorder_point INTEGER DEFAULT 5,
  reorder_quantity INTEGER DEFAULT 10,
  max_stock_level INTEGER DEFAULT 50,
  preferred_supplier VARCHAR(50) DEFAULT 'bookedbarber',
  
  -- Pricing
  cost_price DECIMAL(10,2),
  retail_price DECIMAL(10,2) NOT NULL,
  sale_price DECIMAL(10,2),
  member_price DECIMAL(10,2),
  
  -- Commission
  commission_rate DECIMAL(5,2) DEFAULT 10.00,
  commission_type VARCHAR(20) DEFAULT 'percentage',
  
  -- Display settings
  show_in_pos BOOLEAN DEFAULT true,
  show_online BOOLEAN DEFAULT false,
  pos_display_order INTEGER DEFAULT 999,
  online_display_order INTEGER DEFAULT 999,
  
  -- Inventory settings
  track_inventory BOOLEAN DEFAULT true,
  allow_backorder BOOLEAN DEFAULT false,
  auto_reorder BOOLEAN DEFAULT false,
  auto_reorder_approved BOOLEAN DEFAULT false,
  
  -- Media
  image_url TEXT,
  thumbnail_url TEXT,
  
  -- Analytics
  last_sold_at TIMESTAMPTZ,
  last_received_at TIMESTAMPTZ,
  last_counted_at TIMESTAMPTZ,
  units_sold_30_days INTEGER DEFAULT 0,
  units_sold_90_days INTEGER DEFAULT 0,
  
  -- Metadata
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(barbershop_id, sku)
);

-- Add computed column for available quantity
ALTER TABLE barbershop_inventory 
ADD COLUMN quantity_available INTEGER GENERATED ALWAYS AS (quantity_on_hand - quantity_reserved) STORED;

-- =====================================================
-- MARKETPLACE ENROLLMENT
-- =====================================================

CREATE TABLE IF NOT EXISTS marketplace_enrollment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbershop_id UUID NOT NULL UNIQUE,
  
  -- Enrollment status
  is_enrolled BOOLEAN DEFAULT false,
  enrolled_at TIMESTAMPTZ,
  enrollment_status VARCHAR(30) DEFAULT 'pending',
  
  -- Account information
  account_number VARCHAR(50) UNIQUE,
  company_name VARCHAR(255),
  tax_id VARCHAR(50),
  reseller_permit VARCHAR(100),
  
  -- Credit & payment
  payment_terms VARCHAR(50) DEFAULT 'prepaid',
  credit_limit DECIMAL(10,2) DEFAULT 0.00,
  current_balance DECIMAL(10,2) DEFAULT 0.00,
  
  -- Account status
  account_standing VARCHAR(30) DEFAULT 'good',
  suspension_reason TEXT,
  last_order_date DATE,
  total_orders_placed INTEGER DEFAULT 0,
  total_amount_spent DECIMAL(12,2) DEFAULT 0.00,
  
  -- Preferences
  auto_reorder_enabled BOOLEAN DEFAULT false,
  preferred_shipping_day VARCHAR(10),
  preferred_delivery_window VARCHAR(20),
  min_order_value DECIMAL(10,2) DEFAULT 100.00,
  
  -- Addresses
  default_shipping_address JSONB,
  billing_address JSONB,
  shipping_notes TEXT,
  
  -- Discount tier
  discount_tier VARCHAR(20) DEFAULT 'standard',
  flat_discount_percent DECIMAL(5,2) DEFAULT 0.00,
  
  -- Communication
  order_notification_email VARCHAR(255),
  order_notification_sms VARCHAR(20),
  marketing_opt_in BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add computed column for available credit
ALTER TABLE marketplace_enrollment 
ADD COLUMN available_credit DECIMAL(10,2) GENERATED ALWAYS AS (credit_limit - current_balance) STORED;

-- =====================================================
-- MARKETPLACE ORDERS
-- =====================================================

CREATE TABLE IF NOT EXISTS marketplace_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number VARCHAR(50) UNIQUE NOT NULL,
  barbershop_id UUID NOT NULL,
  
  -- Order status
  status VARCHAR(30) NOT NULL DEFAULT 'draft',
  
  -- Dates
  order_date TIMESTAMPTZ DEFAULT NOW(),
  approved_date TIMESTAMPTZ,
  shipped_date TIMESTAMPTZ,
  delivered_date TIMESTAMPTZ,
  cancelled_date TIMESTAMPTZ,
  
  -- Financial
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  discount_amount DECIMAL(10,2) DEFAULT 0.00,
  discount_code VARCHAR(50),
  tax_rate DECIMAL(5,2) DEFAULT 0.00,
  tax_amount DECIMAL(10,2) DEFAULT 0.00,
  shipping_cost DECIMAL(10,2) DEFAULT 0.00,
  handling_fee DECIMAL(10,2) DEFAULT 0.00,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  
  -- Payment
  payment_method VARCHAR(30),
  payment_status VARCHAR(30) DEFAULT 'pending',
  payment_terms VARCHAR(50),
  payment_due_date DATE,
  amount_paid DECIMAL(10,2) DEFAULT 0.00,
  
  -- Shipping
  shipping_method VARCHAR(50),
  shipping_address JSONB NOT NULL,
  shipping_tracking_number VARCHAR(100),
  shipping_carrier VARCHAR(50),
  estimated_delivery_date DATE,
  delivery_signature BOOLEAN DEFAULT false,
  
  -- Order source
  order_source VARCHAR(30) DEFAULT 'marketplace',
  sales_rep_id UUID,
  
  -- Notes
  customer_notes TEXT,
  internal_notes TEXT,
  shipping_notes TEXT,
  
  -- Metadata
  ip_address INET,
  user_agent TEXT,
  created_by UUID,
  approved_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add computed column for balance due
ALTER TABLE marketplace_orders 
ADD COLUMN balance_due DECIMAL(10,2) GENERATED ALWAYS AS (total_amount - amount_paid) STORED;

-- =====================================================
-- ORDER LINE ITEMS
-- =====================================================

CREATE TABLE IF NOT EXISTS marketplace_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES marketplace_orders(id) ON DELETE CASCADE,
  master_product_id UUID REFERENCES master_products(id),
  
  -- Quantities
  quantity_ordered INTEGER NOT NULL,
  quantity_approved INTEGER,
  quantity_shipped INTEGER DEFAULT 0,
  quantity_received INTEGER DEFAULT 0,
  quantity_returned INTEGER DEFAULT 0,
  
  -- Pricing
  unit_price DECIMAL(10,2) NOT NULL,
  discount_percent DECIMAL(5,2) DEFAULT 0.00,
  discount_amount DECIMAL(10,2) DEFAULT 0.00,
  tax_rate DECIMAL(5,2) DEFAULT 0.00,
  tax_amount DECIMAL(10,2) DEFAULT 0.00,
  line_subtotal DECIMAL(10,2) NOT NULL,
  line_total DECIMAL(10,2) NOT NULL,
  
  -- Fulfillment
  fulfillment_status VARCHAR(30) DEFAULT 'pending',
  warehouse_location VARCHAR(100),
  bin_location VARCHAR(50),
  pick_list_number VARCHAR(50),
  
  -- Tracking
  lot_number VARCHAR(100),
  expiry_date DATE,
  serial_numbers TEXT[],
  
  -- Notes
  customer_notes TEXT,
  warehouse_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INVENTORY MOVEMENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS inventory_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbershop_id UUID NOT NULL,
  barbershop_inventory_id UUID REFERENCES barbershop_inventory(id),
  
  -- Movement details
  movement_type VARCHAR(30) NOT NULL,
  quantity_change INTEGER NOT NULL,
  
  -- Stock snapshot
  stock_before INTEGER NOT NULL,
  stock_after INTEGER NOT NULL,
  
  -- Related records
  sale_id UUID,
  order_id UUID REFERENCES marketplace_orders(id),
  transfer_id UUID,
  
  -- Details
  reason TEXT,
  notes TEXT,
  performed_by UUID,
  
  -- Cost tracking
  unit_cost DECIMAL(10,2),
  total_cost_change DECIMAL(10,2),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INVENTORY ALERTS
-- =====================================================

CREATE TABLE IF NOT EXISTS inventory_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbershop_id UUID NOT NULL,
  alert_type VARCHAR(30) NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'info',
  
  -- Alert details
  barbershop_inventory_id UUID REFERENCES barbershop_inventory(id),
  product_name VARCHAR(255),
  current_stock INTEGER,
  reorder_point INTEGER,
  
  -- Status
  is_acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID,
  acknowledged_at TIMESTAMPTZ,
  
  is_resolved BOOLEAN DEFAULT false,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  
  -- Auto-reorder
  auto_reorder_triggered BOOLEAN DEFAULT false,
  auto_reorder_id UUID REFERENCES marketplace_orders(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_master_products_sku ON master_products(sku);
CREATE INDEX IF NOT EXISTS idx_master_products_cin7 ON master_products(cin7_product_id);
CREATE INDEX IF NOT EXISTS idx_master_products_category ON master_products(category);
CREATE INDEX IF NOT EXISTS idx_master_products_active ON master_products(is_active);

CREATE INDEX IF NOT EXISTS idx_warehouse_inventory_product ON warehouse_inventory(master_product_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_inventory_location ON warehouse_inventory(warehouse_location);
CREATE INDEX IF NOT EXISTS idx_warehouse_inventory_reorder ON warehouse_inventory(quantity_available, reorder_point);

CREATE INDEX IF NOT EXISTS idx_barbershop_inventory_shop ON barbershop_inventory(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_barbershop_inventory_sku ON barbershop_inventory(barbershop_id, sku);
CREATE INDEX IF NOT EXISTS idx_barbershop_inventory_master ON barbershop_inventory(master_product_id);
CREATE INDEX IF NOT EXISTS idx_barbershop_inventory_reorder ON barbershop_inventory(quantity_available, reorder_point);
CREATE INDEX IF NOT EXISTS idx_barbershop_inventory_pos ON barbershop_inventory(barbershop_id, show_in_pos);

CREATE INDEX IF NOT EXISTS idx_marketplace_enrollment_shop ON marketplace_enrollment(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_enrollment_status ON marketplace_enrollment(enrollment_status);

CREATE INDEX IF NOT EXISTS idx_marketplace_orders_shop ON marketplace_orders(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_orders_status ON marketplace_orders(status);
CREATE INDEX IF NOT EXISTS idx_marketplace_orders_date ON marketplace_orders(order_date DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_orders_number ON marketplace_orders(order_number);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON marketplace_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON marketplace_order_items(master_product_id);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_shop ON inventory_movements(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_inventory ON inventory_movements(barbershop_inventory_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_date ON inventory_movements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_type ON inventory_movements(movement_type);

CREATE INDEX IF NOT EXISTS idx_inventory_alerts_shop ON inventory_alerts(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_unresolved ON inventory_alerts(barbershop_id, is_resolved);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE master_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE barbershop_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_enrollment ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_alerts ENABLE ROW LEVEL SECURITY;

-- Master products are viewable by all authenticated users
CREATE POLICY "View master products" ON master_products
  FOR SELECT USING (auth.role() = 'authenticated');

-- Warehouse inventory viewable by all authenticated users  
CREATE POLICY "View warehouse inventory" ON warehouse_inventory
  FOR SELECT USING (auth.role() = 'authenticated');

-- Barbershop inventory - users can manage their shop's inventory
CREATE POLICY "Manage own barbershop inventory" ON barbershop_inventory
  FOR ALL USING (
    barbershop_id IN (
      SELECT id FROM barbershops WHERE owner_id = auth.uid()
      UNION
      SELECT barbershop_id FROM barbershop_staff WHERE user_id = auth.uid()
    )
  );

-- Marketplace enrollment - barbershops manage their own enrollment
CREATE POLICY "Manage own marketplace enrollment" ON marketplace_enrollment
  FOR ALL USING (
    barbershop_id IN (
      SELECT id FROM barbershops WHERE owner_id = auth.uid()
    )
  );

-- Marketplace orders - barbershops manage their own orders
CREATE POLICY "Manage own marketplace orders" ON marketplace_orders
  FOR ALL USING (
    barbershop_id IN (
      SELECT id FROM barbershops WHERE owner_id = auth.uid()
      UNION
      SELECT barbershop_id FROM barbershop_staff WHERE user_id = auth.uid()
    )
  );

-- Order items - accessible if order is accessible
CREATE POLICY "Manage own order items" ON marketplace_order_items
  FOR ALL USING (
    order_id IN (
      SELECT id FROM marketplace_orders WHERE barbershop_id IN (
        SELECT id FROM barbershops WHERE owner_id = auth.uid()
        UNION
        SELECT barbershop_id FROM barbershop_staff WHERE user_id = auth.uid()
      )
    )
  );

-- Inventory movements - barbershops view their own
CREATE POLICY "View own inventory movements" ON inventory_movements
  FOR SELECT USING (
    barbershop_id IN (
      SELECT id FROM barbershops WHERE owner_id = auth.uid()
      UNION
      SELECT barbershop_id FROM barbershop_staff WHERE user_id = auth.uid()
    )
  );

-- Inventory alerts - barbershops manage their own
CREATE POLICY "Manage own inventory alerts" ON inventory_alerts
  FOR ALL USING (
    barbershop_id IN (
      SELECT id FROM barbershops WHERE owner_id = auth.uid()
      UNION
      SELECT barbershop_id FROM barbershop_staff WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- INITIAL SAMPLE DATA
-- =====================================================

-- Insert sample master products
INSERT INTO master_products (sku, name, brand, category, wholesale_price, msrp, description, is_active, is_featured)
VALUES 
  ('BB-POMADE-001', 'Premium Hair Pomade', 'BookedBarber Essentials', 'hair_care', 12.50, 25.00, 'Professional-grade pomade with strong hold and natural shine', true, true),
  ('BB-SHAMPOO-001', 'Clarifying Shampoo', 'BookedBarber Essentials', 'hair_care', 8.00, 16.00, 'Deep-cleaning shampoo for all hair types', true, false),
  ('BB-RAZOR-001', 'Professional Straight Razor', 'BookedBarber Pro', 'tools', 45.00, 90.00, 'High-carbon steel straight razor for precision cuts', true, true),
  ('BB-CLIPPER-001', 'Cordless Hair Clipper', 'BookedBarber Pro', 'tools', 75.00, 150.00, 'Professional cordless clipper with 3-hour battery life', true, true),
  ('BB-OIL-001', 'Beard Oil', 'BookedBarber Essentials', 'beard_care', 10.00, 20.00, 'Nourishing beard oil with natural ingredients', true, false)
ON CONFLICT (sku) DO NOTHING;

-- Add warehouse inventory for sample products
INSERT INTO warehouse_inventory (master_product_id, quantity_available, quantity_reserved, reorder_point, reorder_quantity)
SELECT 
  id, 
  100, -- Available stock
  0,   -- Reserved
  20,  -- Reorder point
  50   -- Reorder quantity
FROM master_products
WHERE sku LIKE 'BB-%'
ON CONFLICT (master_product_id, warehouse_location) DO NOTHING;

-- Add bulk pricing tiers to products
UPDATE master_products 
SET bulk_pricing_tiers = '[
  {"min_quantity": 12, "discount_percent": 5},
  {"min_quantity": 24, "discount_percent": 10},
  {"min_quantity": 48, "discount_percent": 15}
]'::jsonb
WHERE sku LIKE 'BB-%';

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

-- Check if tables were created successfully
DO $$
BEGIN
  RAISE NOTICE 'Inventory Marketplace Schema deployed successfully!';
  RAISE NOTICE 'Tables created: master_products, warehouse_inventory, barbershop_inventory, marketplace_enrollment, marketplace_orders, etc.';
  RAISE NOTICE 'Sample products added with SKUs: BB-POMADE-001, BB-SHAMPOO-001, BB-RAZOR-001, BB-CLIPPER-001, BB-OIL-001';
END $$;