-- Marketplace Integration Schema Extensions
-- Extends existing tables to support wholesale marketplace integration

-- Extend marketplace_enrollment with subscription tiers
ALTER TABLE marketplace_enrollment 
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium', 'enterprise'));

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_marketplace_enrollment_subscription_tier 
ON marketplace_enrollment(subscription_tier);

-- Extend barbershop_inventory with marketplace integration fields
ALTER TABLE barbershop_inventory 
ADD COLUMN IF NOT EXISTS marketplace_product_id UUID REFERENCES master_products(id),
ADD COLUMN IF NOT EXISTS auto_reorder_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS preferred_supplier TEXT DEFAULT 'marketplace' CHECK (preferred_supplier IN ('manual', 'cin7', 'marketplace')),
ADD COLUMN IF NOT EXISTS last_marketplace_sync TIMESTAMP,
ADD COLUMN IF NOT EXISTS reorder_threshold INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS auto_reorder_quantity INTEGER DEFAULT 24;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_barbershop_inventory_marketplace_product 
ON barbershop_inventory(marketplace_product_id) WHERE marketplace_product_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_barbershop_inventory_auto_reorder 
ON barbershop_inventory(auto_reorder_enabled) WHERE auto_reorder_enabled = true;

CREATE INDEX IF NOT EXISTS idx_barbershop_inventory_supplier 
ON barbershop_inventory(preferred_supplier);

-- Extend master_products with tier_pricing column
ALTER TABLE master_products 
ADD COLUMN IF NOT EXISTS tier_pricing JSONB DEFAULT '{
  "free": 1.0,
  "premium": 0.95, 
  "enterprise": 0.85
}'::jsonb;

-- Add GIN index for JSONB tier_pricing queries
CREATE INDEX IF NOT EXISTS idx_master_products_tier_pricing 
ON master_products USING GIN (tier_pricing);

-- Create marketplace_orders table for order tracking
CREATE TABLE IF NOT EXISTS marketplace_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
  order_number VARCHAR(50) UNIQUE NOT NULL DEFAULT ('MKT-' || EXTRACT(year FROM NOW()) || '-' || LPAD(nextval('marketplace_order_seq')::TEXT, 6, '0')),
  
  -- Order details
  order_status TEXT DEFAULT 'pending' CHECK (order_status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')),
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  shipping_cost DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  
  -- Subscription tier at time of order
  subscription_tier_used TEXT DEFAULT 'free',
  discount_tier_applied TEXT DEFAULT 'standard',
  
  -- Shipping information
  shipping_address JSONB NOT NULL,
  estimated_delivery_date DATE,
  tracking_number VARCHAR(100),
  
  -- Order metadata
  order_notes TEXT,
  internal_notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  confirmed_at TIMESTAMP,
  shipped_at TIMESTAMP,
  delivered_at TIMESTAMP
);

-- Create sequence for order numbers
CREATE SEQUENCE IF NOT EXISTS marketplace_order_seq START 1;

-- Create marketplace_order_items table
CREATE TABLE IF NOT EXISTS marketplace_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES marketplace_orders(id) ON DELETE CASCADE,
  master_product_id UUID NOT NULL REFERENCES master_products(id),
  
  -- Product details at time of order (historical data)
  product_name VARCHAR(255) NOT NULL,
  product_sku VARCHAR(100) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  line_total DECIMAL(10,2) NOT NULL,
  
  -- Discount information
  bulk_discount_applied DECIMAL(5,2) DEFAULT 0, -- Percentage
  tier_discount_applied DECIMAL(5,2) DEFAULT 0, -- Percentage
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for marketplace orders
CREATE INDEX IF NOT EXISTS idx_marketplace_orders_barbershop 
ON marketplace_orders(barbershop_id);

CREATE INDEX IF NOT EXISTS idx_marketplace_orders_status 
ON marketplace_orders(order_status);

CREATE INDEX IF NOT EXISTS idx_marketplace_orders_created 
ON marketplace_orders(created_at);

CREATE INDEX IF NOT EXISTS idx_marketplace_order_items_order 
ON marketplace_order_items(order_id);

CREATE INDEX IF NOT EXISTS idx_marketplace_order_items_product 
ON marketplace_order_items(master_product_id);

-- Create marketplace_favorites table for shop-specific product curation
CREATE TABLE IF NOT EXISTS marketplace_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
  master_product_id UUID NOT NULL REFERENCES master_products(id) ON DELETE CASCADE,
  
  -- Favorite metadata
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  
  UNIQUE(barbershop_id, master_product_id)
);

CREATE INDEX IF NOT EXISTS idx_marketplace_favorites_barbershop 
ON marketplace_favorites(barbershop_id);

-- Create product performance tracking
CREATE TABLE IF NOT EXISTS marketplace_product_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_product_id UUID NOT NULL REFERENCES master_products(id) ON DELETE CASCADE,
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE, -- NULL for aggregate stats
  
  -- Performance metrics
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_ordered INTEGER DEFAULT 0,
  total_revenue DECIMAL(12,2) DEFAULT 0,
  average_order_quantity DECIMAL(8,2) DEFAULT 0,
  reorder_rate DECIMAL(5,4) DEFAULT 0, -- Percentage as decimal
  
  -- Aggregation level
  aggregation_level TEXT DEFAULT 'monthly' CHECK (aggregation_level IN ('daily', 'weekly', 'monthly', 'yearly')),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(master_product_id, barbershop_id, period_start, aggregation_level)
);

CREATE INDEX IF NOT EXISTS idx_marketplace_performance_product 
ON marketplace_product_performance(master_product_id);

CREATE INDEX IF NOT EXISTS idx_marketplace_performance_period 
ON marketplace_product_performance(period_start, period_end);

-- Add trigger to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_marketplace_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_marketplace_orders_updated_at
  BEFORE UPDATE ON marketplace_orders
  FOR EACH ROW EXECUTE FUNCTION update_marketplace_timestamp();

CREATE TRIGGER trigger_marketplace_performance_updated_at
  BEFORE UPDATE ON marketplace_product_performance
  FOR EACH ROW EXECUTE FUNCTION update_marketplace_timestamp();

-- Row Level Security (RLS) Policies
ALTER TABLE marketplace_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_favorites ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see orders for their barbershop
CREATE POLICY marketplace_orders_barbershop_access ON marketplace_orders
  USING (barbershop_id IN (
    SELECT shop_id FROM profiles WHERE id = auth.uid()
    UNION
    SELECT barbershop_id FROM barbershop_staff WHERE user_id = auth.uid() AND is_active = true
  ));

-- Policy: Order items follow order access
CREATE POLICY marketplace_order_items_access ON marketplace_order_items
  USING (order_id IN (
    SELECT id FROM marketplace_orders
    WHERE barbershop_id IN (
      SELECT shop_id FROM profiles WHERE id = auth.uid()
      UNION
      SELECT barbershop_id FROM barbershop_staff WHERE user_id = auth.uid() AND is_active = true
    )
  ));

-- Policy: Favorites follow barbershop access
CREATE POLICY marketplace_favorites_access ON marketplace_favorites
  USING (barbershop_id IN (
    SELECT shop_id FROM profiles WHERE id = auth.uid()
    UNION
    SELECT barbershop_id FROM barbershop_staff WHERE user_id = auth.uid() AND is_active = true
  ));

-- Comments for documentation
COMMENT ON TABLE marketplace_orders IS 'Orders placed by barbershops through the wholesale marketplace';
COMMENT ON TABLE marketplace_order_items IS 'Individual line items for marketplace orders';
COMMENT ON TABLE marketplace_favorites IS 'Barbershop-specific favorite products for easy reordering';
COMMENT ON TABLE marketplace_product_performance IS 'Performance tracking for marketplace products by barbershop and aggregate';

COMMENT ON COLUMN barbershop_inventory.marketplace_product_id IS 'Reference to master_products when item was added from marketplace';
COMMENT ON COLUMN barbershop_inventory.auto_reorder_enabled IS 'Whether to automatically reorder this product when stock is low';
COMMENT ON COLUMN barbershop_inventory.preferred_supplier IS 'Preferred source: manual, cin7, or marketplace';
COMMENT ON COLUMN barbershop_inventory.reorder_threshold IS 'Stock level that triggers auto-reorder';
COMMENT ON COLUMN barbershop_inventory.auto_reorder_quantity IS 'Quantity to automatically reorder';

COMMENT ON COLUMN master_products.tier_pricing IS 'Subscription tier pricing multipliers: {"free": 1.0, "premium": 0.95, "enterprise": 0.85}';
COMMENT ON COLUMN marketplace_enrollment.subscription_tier IS 'Subscription tier: free, premium, or enterprise - affects wholesale pricing and features';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Marketplace integration schema created successfully!';
  RAISE NOTICE '📊 Added subscription tier pricing support';
  RAISE NOTICE '🔗 Extended barbershop_inventory with marketplace fields';
  RAISE NOTICE '📦 Created marketplace orders and tracking tables';
  RAISE NOTICE '⭐ Added favorites and performance tracking';
  RAISE NOTICE '🔒 Implemented Row Level Security policies';
END $$;