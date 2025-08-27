-- BookedBarber Inventory Marketplace Schema
-- This schema enables individual barbershops to track their own inventory
-- while optionally ordering from the BookedBarber central warehouse (CIN7)

-- =====================================================
-- MASTER PRODUCT CATALOG (BookedBarber's Offerings)
-- =====================================================

CREATE TABLE IF NOT EXISTS master_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Product identifiers
  sku VARCHAR(100) UNIQUE NOT NULL,
  barcode VARCHAR(100),
  cin7_product_id VARCHAR(255), -- Link to CIN7 warehouse
  
  -- Product information
  name VARCHAR(255) NOT NULL,
  brand VARCHAR(100),
  category VARCHAR(50), -- 'hair_care', 'beard_care', 'styling', 'tools', 'accessories'
  subcategory VARCHAR(50),
  description TEXT,
  
  -- Pricing (BookedBarber's wholesale prices)
  wholesale_price DECIMAL(10,2) NOT NULL, -- What shops pay BookedBarber
  msrp DECIMAL(10,2), -- Manufacturer's suggested retail price
  map_price DECIMAL(10,2), -- Minimum advertised price
  
  -- Bulk pricing tiers
  bulk_pricing_tiers JSONB DEFAULT '[]'::jsonb,
  -- Example: [
  --   {"min_quantity": 12, "discount_percent": 5},
  --   {"min_quantity": 24, "discount_percent": 10},
  --   {"min_quantity": 48, "discount_percent": 15}
  -- ]
  
  -- Ordering rules
  min_order_quantity INTEGER DEFAULT 1,
  order_increment INTEGER DEFAULT 1, -- Must order in multiples of this
  max_order_quantity INTEGER,
  
  -- Product details
  size VARCHAR(50),
  unit_of_measure VARCHAR(20), -- 'oz', 'ml', 'piece', etc.
  weight_kg DECIMAL(6,3),
  dimensions_cm JSONB, -- {"length": 10, "width": 5, "height": 15}
  
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
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- BOOKEDBARBER WAREHOUSE INVENTORY (Synced with CIN7)
-- =====================================================

CREATE TABLE IF NOT EXISTS warehouse_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_product_id UUID REFERENCES master_products(id) ON DELETE CASCADE,
  
  -- Stock levels
  quantity_available INTEGER DEFAULT 0, -- Available to sell
  quantity_reserved INTEGER DEFAULT 0, -- Reserved for pending orders
  quantity_on_order INTEGER DEFAULT 0, -- On order from suppliers
  quantity_total INTEGER GENERATED ALWAYS AS (quantity_available + quantity_reserved) STORED,
  
  -- Warehouse location
  warehouse_location VARCHAR(100) DEFAULT 'main',
  bin_location VARCHAR(50),
  
  -- Reorder management
  reorder_point INTEGER DEFAULT 10,
  reorder_quantity INTEGER DEFAULT 50,
  max_stock_level INTEGER DEFAULT 500,
  lead_time_days INTEGER DEFAULT 7,
  
  -- Sync tracking
  last_cin7_sync TIMESTAMP WITH TIME ZONE,
  cin7_sync_status VARCHAR(20), -- 'success', 'failed', 'pending'
  cin7_stock_level INTEGER, -- Last known CIN7 stock
  sync_discrepancy INTEGER, -- Difference between our count and CIN7
  
  -- Cost tracking
  average_cost DECIMAL(10,2),
  last_cost DECIMAL(10,2),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(master_product_id, warehouse_location)
);

-- =====================================================
-- INDIVIDUAL BARBERSHOP LOCAL INVENTORY
-- =====================================================

CREATE TABLE IF NOT EXISTS barbershop_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID NOT NULL, -- References barbershops(id)
  
  -- Product source
  product_source VARCHAR(20) NOT NULL DEFAULT 'custom', 
  -- 'bookedbarber' = from our warehouse
  -- 'custom' = their own product
  -- 'other_supplier' = from another supplier
  
  master_product_id UUID REFERENCES master_products(id), -- NULL if custom product
  
  -- Product information (for custom products or overrides)
  name VARCHAR(255) NOT NULL,
  brand VARCHAR(100),
  sku VARCHAR(100) NOT NULL,
  barcode VARCHAR(100),
  category VARCHAR(50),
  subcategory VARCHAR(50),
  description TEXT,
  
  -- Local stock tracking (independent of CIN7/warehouse)
  quantity_on_hand INTEGER DEFAULT 0,
  quantity_reserved INTEGER DEFAULT 0, -- Reserved for appointments
  quantity_available INTEGER GENERATED ALWAYS AS (quantity_on_hand - quantity_reserved) STORED,
  
  -- Reorder settings (per location)
  reorder_point INTEGER DEFAULT 5,
  reorder_quantity INTEGER DEFAULT 10,
  max_stock_level INTEGER DEFAULT 50,
  preferred_supplier VARCHAR(50) DEFAULT 'bookedbarber',
  -- 'bookedbarber', 'direct', 'other'
  
  -- Pricing (what the barbershop charges customers)
  cost_price DECIMAL(10,2), -- What they paid for it
  retail_price DECIMAL(10,2) NOT NULL, -- What they charge customers
  sale_price DECIMAL(10,2), -- Special sale price
  member_price DECIMAL(10,2), -- Price for members/loyalty
  
  -- Commission settings (if sold by barbers)
  commission_rate DECIMAL(5,2) DEFAULT 10.00, -- Percentage
  commission_type VARCHAR(20) DEFAULT 'percentage', -- 'percentage', 'fixed'
  
  -- Display settings
  show_in_pos BOOLEAN DEFAULT true,
  show_online BOOLEAN DEFAULT false,
  pos_display_order INTEGER DEFAULT 999,
  online_display_order INTEGER DEFAULT 999,
  
  -- Inventory settings
  track_inventory BOOLEAN DEFAULT true,
  allow_backorder BOOLEAN DEFAULT false,
  auto_reorder BOOLEAN DEFAULT false,
  auto_reorder_approved BOOLEAN DEFAULT false, -- Pre-approved for auto orders
  
  -- Media (can override master product images)
  image_url TEXT,
  thumbnail_url TEXT,
  
  -- Analytics
  last_sold_at TIMESTAMP WITH TIME ZONE,
  last_received_at TIMESTAMP WITH TIME ZONE,
  last_counted_at TIMESTAMP WITH TIME ZONE,
  units_sold_30_days INTEGER DEFAULT 0,
  units_sold_90_days INTEGER DEFAULT 0,
  
  -- Metadata
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(barbershop_id, sku)
);

-- =====================================================
-- MARKETPLACE ENROLLMENT & SETTINGS
-- =====================================================

CREATE TABLE IF NOT EXISTS marketplace_enrollment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID NOT NULL UNIQUE, -- References barbershops(id)
  
  -- Enrollment status
  is_enrolled BOOLEAN DEFAULT false,
  enrolled_at TIMESTAMP WITH TIME ZONE,
  enrollment_status VARCHAR(30) DEFAULT 'pending',
  -- 'pending', 'active', 'suspended', 'inactive'
  
  -- Account information
  account_number VARCHAR(50) UNIQUE,
  company_name VARCHAR(255),
  tax_id VARCHAR(50),
  reseller_permit VARCHAR(100),
  
  -- Credit & payment terms
  payment_terms VARCHAR(50) DEFAULT 'prepaid',
  -- 'prepaid', 'net15', 'net30', 'net60'
  credit_limit DECIMAL(10,2) DEFAULT 0.00,
  current_balance DECIMAL(10,2) DEFAULT 0.00,
  available_credit DECIMAL(10,2) GENERATED ALWAYS AS (credit_limit - current_balance) STORED,
  
  -- Account status
  account_standing VARCHAR(30) DEFAULT 'good',
  -- 'good', 'warning', 'hold', 'suspended'
  suspension_reason TEXT,
  last_order_date DATE,
  total_orders_placed INTEGER DEFAULT 0,
  total_amount_spent DECIMAL(12,2) DEFAULT 0.00,
  
  -- Preferences
  auto_reorder_enabled BOOLEAN DEFAULT false,
  preferred_shipping_day VARCHAR(10), -- 'monday', 'tuesday', etc.
  preferred_delivery_window VARCHAR(20), -- 'morning', 'afternoon'
  min_order_value DECIMAL(10,2) DEFAULT 100.00,
  
  -- Shipping defaults
  default_shipping_address JSONB,
  billing_address JSONB,
  shipping_notes TEXT,
  
  -- Discount & pricing tier
  discount_tier VARCHAR(20) DEFAULT 'standard',
  -- 'standard', 'silver', 'gold', 'platinum'
  flat_discount_percent DECIMAL(5,2) DEFAULT 0.00,
  
  -- Communication preferences
  order_notification_email VARCHAR(255),
  order_notification_sms VARCHAR(20),
  marketing_opt_in BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- MARKETPLACE ORDERS
-- =====================================================

CREATE TABLE IF NOT EXISTS marketplace_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR(50) UNIQUE NOT NULL,
  barbershop_id UUID NOT NULL, -- References barbershops(id)
  
  -- Order status
  status VARCHAR(30) NOT NULL DEFAULT 'draft',
  -- 'draft', 'submitted', 'approved', 'processing', 
  -- 'partially_shipped', 'shipped', 'delivered', 'cancelled', 'returned'
  
  -- Important dates
  order_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_date TIMESTAMP WITH TIME ZONE,
  shipped_date TIMESTAMP WITH TIME ZONE,
  delivered_date TIMESTAMP WITH TIME ZONE,
  cancelled_date TIMESTAMP WITH TIME ZONE,
  
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
  -- 'credit_terms', 'credit_card', 'ach', 'check', 'wire'
  payment_status VARCHAR(30) DEFAULT 'pending',
  -- 'pending', 'paid', 'partial', 'overdue', 'refunded'
  payment_terms VARCHAR(50),
  payment_due_date DATE,
  amount_paid DECIMAL(10,2) DEFAULT 0.00,
  balance_due DECIMAL(10,2) GENERATED ALWAYS AS (total_amount - amount_paid) STORED,
  
  -- Shipping information
  shipping_method VARCHAR(50),
  shipping_address JSONB NOT NULL,
  shipping_tracking_number VARCHAR(100),
  shipping_carrier VARCHAR(50),
  estimated_delivery_date DATE,
  delivery_signature BOOLEAN DEFAULT false,
  
  -- Order source
  order_source VARCHAR(30) DEFAULT 'marketplace',
  -- 'marketplace', 'auto_reorder', 'sales_rep', 'phone'
  sales_rep_id UUID, -- References users(id)
  
  -- Notes
  customer_notes TEXT,
  internal_notes TEXT,
  shipping_notes TEXT,
  
  -- Metadata
  ip_address INET,
  user_agent TEXT,
  created_by UUID, -- References users(id)
  approved_by UUID, -- References users(id)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ORDER LINE ITEMS
-- =====================================================

CREATE TABLE IF NOT EXISTS marketplace_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  -- 'pending', 'processing', 'shipped', 'delivered', 'cancelled'
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
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INVENTORY MOVEMENTS/ADJUSTMENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID NOT NULL, -- References barbershops(id)
  barbershop_inventory_id UUID REFERENCES barbershop_inventory(id),
  
  -- Movement details
  movement_type VARCHAR(30) NOT NULL,
  -- 'sale', 'return', 'received', 'adjustment', 'count', 
  -- 'damage', 'theft', 'expired', 'transfer_in', 'transfer_out'
  
  quantity_change INTEGER NOT NULL, -- Positive for additions, negative for reductions
  
  -- Stock levels snapshot
  stock_before INTEGER NOT NULL,
  stock_after INTEGER NOT NULL,
  
  -- Related records
  sale_id UUID, -- References product_sales(id)
  order_id UUID REFERENCES marketplace_orders(id),
  transfer_id UUID, -- For inter-location transfers
  
  -- Details
  reason TEXT,
  notes TEXT,
  performed_by UUID, -- References users(id)
  
  -- Cost tracking
  unit_cost DECIMAL(10,2),
  total_cost_change DECIMAL(10,2),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INVENTORY ALERTS & NOTIFICATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS inventory_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID NOT NULL, -- References barbershops(id)
  alert_type VARCHAR(30) NOT NULL,
  -- 'low_stock', 'out_of_stock', 'overstock', 'expired', 'reorder_needed'
  
  severity VARCHAR(20) NOT NULL DEFAULT 'info',
  -- 'info', 'warning', 'critical'
  
  -- Alert details
  barbershop_inventory_id UUID REFERENCES barbershop_inventory(id),
  product_name VARCHAR(255),
  current_stock INTEGER,
  reorder_point INTEGER,
  
  -- Status
  is_acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID, -- References users(id)
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  
  is_resolved BOOLEAN DEFAULT false,
  resolved_by UUID, -- References users(id)
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  
  -- Auto-reorder
  auto_reorder_triggered BOOLEAN DEFAULT false,
  auto_reorder_id UUID REFERENCES marketplace_orders(id),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Master products
CREATE INDEX idx_master_products_sku ON master_products(sku);
CREATE INDEX idx_master_products_cin7 ON master_products(cin7_product_id);
CREATE INDEX idx_master_products_category ON master_products(category);
CREATE INDEX idx_master_products_active ON master_products(is_active);

-- Warehouse inventory
CREATE INDEX idx_warehouse_inventory_product ON warehouse_inventory(master_product_id);
CREATE INDEX idx_warehouse_inventory_location ON warehouse_inventory(warehouse_location);
CREATE INDEX idx_warehouse_inventory_reorder ON warehouse_inventory(quantity_available, reorder_point);

-- Barbershop inventory
CREATE INDEX idx_barbershop_inventory_shop ON barbershop_inventory(barbershop_id);
CREATE INDEX idx_barbershop_inventory_sku ON barbershop_inventory(barbershop_id, sku);
CREATE INDEX idx_barbershop_inventory_master ON barbershop_inventory(master_product_id);
CREATE INDEX idx_barbershop_inventory_reorder ON barbershop_inventory(quantity_available, reorder_point);
CREATE INDEX idx_barbershop_inventory_pos ON barbershop_inventory(barbershop_id, show_in_pos);

-- Marketplace enrollment
CREATE INDEX idx_marketplace_enrollment_shop ON marketplace_enrollment(barbershop_id);
CREATE INDEX idx_marketplace_enrollment_status ON marketplace_enrollment(enrollment_status);

-- Orders
CREATE INDEX idx_marketplace_orders_shop ON marketplace_orders(barbershop_id);
CREATE INDEX idx_marketplace_orders_status ON marketplace_orders(status);
CREATE INDEX idx_marketplace_orders_date ON marketplace_orders(order_date DESC);
CREATE INDEX idx_marketplace_orders_number ON marketplace_orders(order_number);

-- Order items
CREATE INDEX idx_order_items_order ON marketplace_order_items(order_id);
CREATE INDEX idx_order_items_product ON marketplace_order_items(master_product_id);

-- Inventory movements
CREATE INDEX idx_inventory_movements_shop ON inventory_movements(barbershop_id);
CREATE INDEX idx_inventory_movements_inventory ON inventory_movements(barbershop_inventory_id);
CREATE INDEX idx_inventory_movements_date ON inventory_movements(created_at DESC);
CREATE INDEX idx_inventory_movements_type ON inventory_movements(movement_type);

-- Alerts
CREATE INDEX idx_inventory_alerts_shop ON inventory_alerts(barbershop_id);
CREATE INDEX idx_inventory_alerts_unresolved ON inventory_alerts(barbershop_id, is_resolved);

-- =====================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all relevant tables
CREATE TRIGGER update_master_products_updated_at BEFORE UPDATE ON master_products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_warehouse_inventory_updated_at BEFORE UPDATE ON warehouse_inventory
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_barbershop_inventory_updated_at BEFORE UPDATE ON barbershop_inventory
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_marketplace_enrollment_updated_at BEFORE UPDATE ON marketplace_enrollment
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_marketplace_orders_updated_at BEFORE UPDATE ON marketplace_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Check if a barbershop is enrolled in marketplace
CREATE OR REPLACE FUNCTION is_marketplace_enrolled(shop_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM marketplace_enrollment 
        WHERE barbershop_id = shop_id 
        AND is_enrolled = true
        AND enrollment_status = 'active'
    );
END;
$$ LANGUAGE plpgsql;

-- Get available credit for a barbershop
CREATE OR REPLACE FUNCTION get_available_credit(shop_id UUID)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    credit DECIMAL(10,2);
BEGIN
    SELECT available_credit INTO credit
    FROM marketplace_enrollment
    WHERE barbershop_id = shop_id;
    
    RETURN COALESCE(credit, 0.00);
END;
$$ LANGUAGE plpgsql;

-- Calculate bulk pricing for a product
CREATE OR REPLACE FUNCTION calculate_bulk_price(
    product_id UUID,
    quantity INTEGER
) RETURNS DECIMAL(10,2) AS $$
DECLARE
    base_price DECIMAL(10,2);
    bulk_tiers JSONB;
    discount_percent DECIMAL(5,2) := 0;
    tier JSONB;
BEGIN
    -- Get base price and bulk tiers
    SELECT wholesale_price, bulk_pricing_tiers 
    INTO base_price, bulk_tiers
    FROM master_products 
    WHERE id = product_id;
    
    -- Find applicable discount tier
    IF bulk_tiers IS NOT NULL THEN
        FOR tier IN SELECT * FROM jsonb_array_elements(bulk_tiers)
        LOOP
            IF quantity >= (tier->>'min_quantity')::INTEGER THEN
                discount_percent = (tier->>'discount_percent')::DECIMAL;
            END IF;
        END LOOP;
    END IF;
    
    -- Calculate final price
    RETURN base_price * (1 - discount_percent / 100);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- INITIAL DATA & PERMISSIONS
-- =====================================================

-- Add sample categories if needed
INSERT INTO master_products (sku, name, brand, category, wholesale_price, msrp)
SELECT 'SAMPLE-001', 'Sample Product', 'BookedBarber', 'hair_care', 10.00, 20.00
WHERE NOT EXISTS (SELECT 1 FROM master_products WHERE sku = 'SAMPLE-001');

-- Grant appropriate permissions (adjust based on your user roles)
-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO authenticated;
-- GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

COMMENT ON TABLE master_products IS 'Master catalog of products available from BookedBarber warehouse';
COMMENT ON TABLE warehouse_inventory IS 'BookedBarber warehouse inventory levels synced with CIN7';
COMMENT ON TABLE barbershop_inventory IS 'Individual barbershop local inventory tracking';
COMMENT ON TABLE marketplace_enrollment IS 'Barbershop enrollment and settings for ordering from BookedBarber';
COMMENT ON TABLE marketplace_orders IS 'Orders placed by barbershops to BookedBarber warehouse';
COMMENT ON TABLE marketplace_order_items IS 'Line items for marketplace orders';
COMMENT ON TABLE inventory_movements IS 'Track all inventory changes for audit trail';
COMMENT ON TABLE inventory_alerts IS 'Low stock and other inventory alerts';