-- =====================================================
-- BookedBarber Wholesale Marketplace - Complete Production SQL
-- Execute this entire script in Supabase SQL Editor
-- =====================================================

-- PART 1: Marketplace Integration Schema
-- =====================================================

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

-- PART 2: Tomb45 Product Catalog
-- =====================================================

-- Insert Tomb45 Wholesale Products
INSERT INTO master_products (
  sku, name, brand, category, subcategory, description,
  wholesale_price, msrp, map_price,
  bulk_pricing_tiers, min_order_quantity, order_increment,
  size, unit_of_measure, weight_kg,
  image_url, thumbnail_url,
  ingredients, directions, warnings,
  is_active, is_featured, is_new,
  tier_pricing,
  seo_title, seo_description
) VALUES 
-- 1. Tomb45® Shave Gel
(
  'TOMB45-SHAVE-GEL-001',
  'Tomb45® Shave Gel',
  'Tomb45',
  'shaving_care',
  'shave_prep',
  'Premium shave gel for professional barbershops. Provides superior lubrication and protection for smooth, comfortable shaves.',
  4.50, 9.99, 7.99,
  '[
    {"min_quantity": 12, "discount_percent": 5},
    {"min_quantity": 24, "discount_percent": 10},
    {"min_quantity": 48, "discount_percent": 15}
  ]'::jsonb,
  6, 6, 
  '8 oz', 'oz', 0.227,
  'https://cdn.tomb45.com/products/shave-gel-green.jpg',
  'https://cdn.tomb45.com/products/thumbs/shave-gel-green-thumb.jpg',
  'Aqua, Glycerin, Sodium Laureth Sulfate, Cocamidopropyl Betaine, PEG-7 Glyceryl Cocoate, Menthol',
  'Apply small amount to wet skin. Massage to create rich lather. Shave with sharp razor. Rinse thoroughly.',
  'For external use only. Avoid contact with eyes. Keep out of reach of children.',
  true, true, false,
  '{
    "free": 1.0,
    "premium": 0.93,
    "enterprise": 0.84
  }'::jsonb,
  'Tomb45 Professional Shave Gel - Premium Barbershop Supply',
  'Professional-grade shave gel trusted by barbers worldwide. Superior lubrication and protection for smooth, comfortable shaves.'
),

-- 2. Tomb45® Pure Powder for Texturizing and Hairstyling  
(
  'TOMB45-PURE-POWDER-002',
  'Tomb45® Pure Powder for Texturizing and Hairstyling',
  'Tomb45',
  'styling',
  'texture_powder',
  'Professional texturizing powder for volume and grip. Perfect for creating textured styles with natural finish.',
  5.40, 11.99, 9.99,
  '[
    {"min_quantity": 12, "discount_percent": 5},
    {"min_quantity": 24, "discount_percent": 10},
    {"min_quantity": 48, "discount_percent": 15}
  ]'::jsonb,
  6, 6,
  '0.35 oz', 'oz', 0.010,
  'https://cdn.tomb45.com/products/pure-powder-black.jpg',
  'https://cdn.tomb45.com/products/thumbs/pure-powder-black-thumb.jpg',
  'Silica, Aluminum Starch Octenylsuccinate, Fragrance, Phenoxyethanol',
  'Shake well before use. Apply to damp or dry hair. Work through with fingers for desired texture.',
  'For external use only. Avoid inhalation of powder.',
  true, true, false,
  '{
    "free": 1.0,
    "premium": 0.93,
    "enterprise": 0.84
  }'::jsonb,
  'Tomb45 Pure Texturizing Powder - Professional Hair Styling',
  'Professional texturizing powder for volume and grip. Creates natural textured styles with long-lasting hold.'
),

-- 3. Tomb45 Indestructible Clay, High Hold with Matte Finish
(
  'TOMB45-INDESTRUCTIBLE-CLAY-003',
  'Tomb45 Indestructible Clay, High Hold with Matte Finish',
  'Tomb45',
  'styling',
  'clay',
  'Maximum hold styling clay with natural matte finish. Professional-grade formula for all-day control and texture.',
  5.40, 11.99, 9.99,
  '[
    {"min_quantity": 12, "discount_percent": 5},
    {"min_quantity": 24, "discount_percent": 10},
    {"min_quantity": 48, "discount_percent": 15}
  ]'::jsonb,
  6, 6,
  '2.5 oz', 'oz', 0.071,
  'https://cdn.tomb45.com/products/indestructible-clay-gold.jpg',
  'https://cdn.tomb45.com/products/thumbs/indestructible-clay-gold-thumb.jpg',
  'Kaolin, Bentonite, Beeswax, Carnauba Wax, Castor Oil, Fragrance',
  'Work small amount between palms. Apply to damp or dry hair. Style as desired for matte finish.',
  'For external use only. Avoid contact with eyes.',
  true, true, false,
  '{
    "free": 1.0,
    "premium": 0.93,
    "enterprise": 0.84
  }'::jsonb,
  'Tomb45 Indestructible Clay - Maximum Hold Matte Finish',
  'Professional styling clay with maximum hold and natural matte finish. All-day control and texture for any style.'
),

-- 4. Tomb45® Hair Building Fibers
(
  'TOMB45-HAIR-FIBERS-004',
  'Tomb45® Hair Building Fibers',
  'Tomb45',
  'hair_care',
  'hair_fibers',
  'Keratin hair building fibers for instant hair density and coverage. Professional solution for thinning hair.',
  8.10, 17.99, 14.99,
  '[
    {"min_quantity": 12, "discount_percent": 8},
    {"min_quantity": 24, "discount_percent": 12},
    {"min_quantity": 48, "discount_percent": 18}
  ]'::jsonb,
  6, 6,
  '0.97 oz', 'oz', 0.027,
  'https://cdn.tomb45.com/products/hair-fibers-black.jpg',
  'https://cdn.tomb45.com/products/thumbs/hair-fibers-black-thumb.jpg',
  'Keratin Fibers, Silica, Ammonium Chloride, DMDM Hydantoin',
  'Shake fibers onto thinning areas. Pat gently to secure. Finish with light hairspray if desired.',
  'For external use only. Keep container tightly closed.',
  true, true, false,
  '{
    "free": 1.0,
    "premium": 0.92,
    "enterprise": 0.82
  }'::jsonb,
  'Tomb45 Hair Building Fibers - Professional Hair Thickening',
  'Keratin hair building fibers for instant density and coverage. Professional solution for thinning hair treatment.'
),

-- 5. Tomb45® Aftershave/Barber Cologne
(
  'TOMB45-AFTERSHAVE-COLOGNE-005',
  'Tomb45® Aftershave/Barber Cologne',
  'Tomb45',
  'aftercare',
  'aftershave',
  'Professional aftershave cologne with antiseptic properties. Soothes skin while providing refined masculine fragrance.',
  4.50, 9.99, 7.99,
  '[
    {"min_quantity": 12, "discount_percent": 5},
    {"min_quantity": 24, "discount_percent": 10},
    {"min_quantity": 48, "discount_percent": 15}
  ]'::jsonb,
  6, 6,
  '4 oz', 'oz', 0.118,
  'https://cdn.tomb45.com/products/aftershave-cologne-green.jpg',
  'https://cdn.tomb45.com/products/thumbs/aftershave-cologne-green-thumb.jpg',
  'Alcohol Denat, Aqua, Fragrance, Menthol, Glycerin, Benzyl Alcohol',
  'Apply to palm and pat onto freshly shaved skin. Allow to absorb naturally.',
  'For external use only. Flammable - keep away from heat and flame.',
  true, true, false,
  '{
    "free": 1.0,
    "premium": 0.93,
    "enterprise": 0.84
  }'::jsonb,
  'Tomb45 Professional Aftershave Cologne - Barbershop Classic',
  'Professional aftershave cologne with antiseptic properties and refined masculine fragrance for barbershops.'
),

-- 6. Tomb45® Texture Powder with Spray Pump
(
  'TOMB45-TEXTURE-SPRAY-006',
  'Tomb45® Texture Powder with Spray Pump',
  'Tomb45',
  'styling',
  'texture_spray',
  'Revolutionary texture powder in convenient spray format. Adds instant volume and grip without residue.',
  5.40, 11.99, 9.99,
  '[
    {"min_quantity": 12, "discount_percent": 5},
    {"min_quantity": 24, "discount_percent": 10},
    {"min_quantity": 48, "discount_percent": 15}
  ]'::jsonb,
  6, 6,
  '5 oz', 'oz', 0.142,
  'https://cdn.tomb45.com/products/texture-spray-black.jpg',
  'https://cdn.tomb45.com/products/thumbs/texture-spray-black-thumb.jpg',
  'Isobutane, Alcohol Denat, Silica, Fragrance, Panthenol',
  'Shake well. Hold 6 inches from hair. Spray evenly through damp or dry hair. Style as desired.',
  'Pressurized container. Do not pierce or burn. Keep out of reach of children.',
  true, true, false,
  '{
    "free": 1.0,
    "premium": 0.93,
    "enterprise": 0.84
  }'::jsonb,
  'Tomb45 Texture Powder Spray - Professional Volume and Grip',
  'Revolutionary texture powder spray for instant volume and grip. Convenient application with professional results.'
),

-- 7. Tomb45 Sea Salt Spray
(
  'TOMB45-SEA-SALT-SPRAY-007',
  'Tomb45 Sea Salt Spray',
  'Tomb45',
  'styling',
  'sea_salt_spray',
  'Natural sea salt spray for beachy texture and volume. Creates effortless, tousled styles with natural hold.',
  5.40, 11.99, 9.99,
  '[
    {"min_quantity": 12, "discount_percent": 5},
    {"min_quantity": 24, "discount_percent": 10},
    {"min_quantity": 48, "discount_percent": 15}
  ]'::jsonb,
  6, 6,
  '8 oz', 'oz', 0.227,
  'https://cdn.tomb45.com/products/sea-salt-spray-black.jpg',
  'https://cdn.tomb45.com/products/thumbs/sea-salt-spray-black-thumb.jpg',
  'Aqua, Sea Salt, Magnesium Sulfate, PVP, Fragrance, Phenoxyethanol',
  'Spray onto damp hair from roots to ends. Scrunch with hands and air dry for natural texture.',
  'For external use only. Shake well before use.',
  true, true, false,
  '{
    "free": 1.0,
    "premium": 0.93,
    "enterprise": 0.84
  }'::jsonb,
  'Tomb45 Sea Salt Spray - Natural Texture and Volume',
  'Natural sea salt spray for beachy texture and effortless volume. Professional quality for tousled, natural styles.'
),

-- 8. Tomb45 Destructible Clay, Soft Matte Clay for Hairstyling
(
  'TOMB45-DESTRUCTIBLE-CLAY-008',
  'Tomb45 Destructible Clay, Soft Matte Clay for Hairstyling',
  'Tomb45',
  'styling',
  'clay',
  'Flexible styling clay with soft matte finish. Reworkable formula provides natural texture and medium hold.',
  5.40, 11.99, 9.99,
  '[
    {"min_quantity": 12, "discount_percent": 5},
    {"min_quantity": 24, "discount_percent": 10},
    {"min_quantity": 48, "discount_percent": 15}
  ]'::jsonb,
  6, 6,
  '2 oz', 'oz', 0.057,
  'https://cdn.tomb45.com/products/destructible-clay-silver.jpg',
  'https://cdn.tomb45.com/products/thumbs/destructible-clay-silver-thumb.jpg',
  'Kaolin, Beeswax, Carnauba Wax, Coconut Oil, Shea Butter, Fragrance',
  'Warm between palms. Apply to damp or dry hair. Rework throughout day as needed.',
  'For external use only. Avoid contact with eyes.',
  true, false, false,
  '{
    "free": 1.0,
    "premium": 0.93,
    "enterprise": 0.84
  }'::jsonb,
  'Tomb45 Destructible Clay - Flexible Matte Styling',
  'Flexible styling clay with soft matte finish. Reworkable formula for natural texture and medium hold.'
),

-- 9. Tomb45 Styling Paste
(
  'TOMB45-STYLING-PASTE-009',
  'Tomb45 Styling Paste',
  'Tomb45',
  'styling',
  'paste',
  'Versatile styling paste with medium hold and natural shine. Perfect for classic and modern hairstyles.',
  5.40, 11.99, 9.99,
  '[
    {"min_quantity": 12, "discount_percent": 5},
    {"min_quantity": 24, "discount_percent": 10},
    {"min_quantity": 48, "discount_percent": 15}
  ]'::jsonb,
  6, 6,
  '2.5 oz', 'oz', 0.071,
  'https://cdn.tomb45.com/products/styling-paste-dark.jpg',
  'https://cdn.tomb45.com/products/thumbs/styling-paste-dark-thumb.jpg',
  'Petrolatum, Beeswax, Lanolin, Castor Oil, Fragrance, Tocopherol',
  'Apply to damp or towel-dried hair. Work through with fingers or comb for desired style.',
  'For external use only. May stain light-colored fabrics.',
  true, false, false,
  '{
    "free": 1.0,
    "premium": 0.93,
    "enterprise": 0.84
  }'::jsonb,
  'Tomb45 Styling Paste - Medium Hold Natural Shine',
  'Versatile styling paste with medium hold and natural shine. Professional quality for classic and modern styles.'
),

-- 10. Tomb45 Hair Styling Pomade
(
  'TOMB45-HAIR-POMADE-010',
  'Tomb45 Hair Styling Pomade',
  'Tomb45',
  'styling',
  'pomade',
  'Classic water-based pomade with strong hold and high shine. Traditional barbershop styling product.',
  5.40, 11.99, 9.99,
  '[
    {"min_quantity": 12, "discount_percent": 5},
    {"min_quantity": 24, "discount_percent": 10},
    {"min_quantity": 48, "discount_percent": 15}
  ]'::jsonb,
  6, 6,
  '2 oz', 'oz', 0.057,
  'https://cdn.tomb45.com/products/hair-pomade-dark.jpg',
  'https://cdn.tomb45.com/products/thumbs/hair-pomade-dark-thumb.jpg',
  'Aqua, Ceteareth-25, PEG-7 Glyceryl Cocoate, Propylene Glycol, Fragrance',
  'Apply to damp hair. Comb into place for classic wet look or finger style for modern texture.',
  'For external use only. Water-soluble formula washes out easily.',
  true, false, false,
  '{
    "free": 1.0,
    "premium": 0.93,
    "enterprise": 0.84
  }'::jsonb,
  'Tomb45 Hair Styling Pomade - Strong Hold High Shine',
  'Classic water-based pomade with strong hold and high shine. Traditional barbershop styling excellence.'
),

-- 11. Tomb45 Hair Tonic
(
  'TOMB45-HAIR-TONIC-011',
  'Tomb45 Hair Tonic',
  'Tomb45',
  'hair_care',
  'tonic',
  'Refreshing hair tonic with menthol for scalp stimulation. Provides light hold with healthy shine.',
  5.40, 11.99, 9.99,
  '[
    {"min_quantity": 12, "discount_percent": 5},
    {"min_quantity": 24, "discount_percent": 10},
    {"min_quantity": 48, "discount_percent": 15}
  ]'::jsonb,
  6, 6,
  '8 oz', 'oz', 0.227,
  'https://cdn.tomb45.com/products/hair-tonic-green.jpg',
  'https://cdn.tomb45.com/products/thumbs/hair-tonic-green-thumb.jpg',
  'Aqua, Alcohol Denat, Menthol, Glycerin, Fragrance, Panthenol',
  'Apply to damp or dry hair and scalp. Massage gently. Style as desired or leave natural.',
  'For external use only. Avoid contact with eyes. Cooling sensation is normal.',
  true, false, false,
  '{
    "free": 1.0,
    "premium": 0.93,
    "enterprise": 0.84
  }'::jsonb,
  'Tomb45 Hair Tonic - Refreshing Scalp Stimulation',
  'Refreshing hair tonic with menthol for scalp stimulation. Light hold with healthy shine and cooling effect.'
),

-- 12. Tomb45 Royal Wax for Hairstyling for Men
(
  'TOMB45-ROYAL-WAX-012',
  'Tomb45 Royal Wax for Hairstyling for Men',
  'Tomb45',
  'styling',
  'wax',
  'Premium styling wax with firm hold and natural finish. Professional-grade formula for sophisticated styles.',
  5.40, 11.99, 9.99,
  '[
    {"min_quantity": 12, "discount_percent": 5},
    {"min_quantity": 24, "discount_percent": 10},
    {"min_quantity": 48, "discount_percent": 15}
  ]'::jsonb,
  6, 6,
  '2.4 oz', 'oz', 0.068,
  'https://cdn.tomb45.com/products/royal-wax-dark.jpg',
  'https://cdn.tomb45.com/products/thumbs/royal-wax-dark-thumb.jpg',
  'Beeswax, Carnauba Wax, Microcrystalline Wax, Coconut Oil, Fragrance',
  'Warm small amount between palms. Work through dry hair for firm hold and natural finish.',
  'For external use only. May require shampooing for complete removal.',
  true, false, false,
  '{
    "free": 1.0,
    "premium": 0.93,
    "enterprise": 0.84
  }'::jsonb,
  'Tomb45 Royal Wax - Premium Firm Hold Styling',
  'Premium styling wax with firm hold and natural finish. Professional-grade formula for sophisticated masculine styles.'
);

-- Create warehouse inventory entries for all Tomb45 products
INSERT INTO warehouse_inventory (
  master_product_id, 
  quantity_available, 
  quantity_reserved, 
  quantity_on_order,
  reorder_point, 
  reorder_quantity, 
  max_stock_level,
  lead_time_days
) 
SELECT 
  id,
  500, -- Starting inventory
  0,   -- No reservations initially
  0,   -- No orders pending
  50,  -- Reorder when 50 left
  200, -- Reorder 200 units
  1000, -- Max stock 1000
  3     -- 3 day lead time from supplier
FROM master_products 
WHERE brand = 'Tomb45' 
AND sku LIKE 'TOMB45-%';

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

-- Final success notification
DO $$
BEGIN
  RAISE NOTICE '=====================================================';
  RAISE NOTICE '🎉 WHOLESALE MARKETPLACE DEPLOYMENT COMPLETE!';
  RAISE NOTICE '=====================================================';
  RAISE NOTICE '✅ Marketplace integration schema created successfully!';
  RAISE NOTICE '📊 Added subscription tier pricing support';
  RAISE NOTICE '🔗 Extended barbershop_inventory with marketplace fields';
  RAISE NOTICE '📦 Created marketplace orders and tracking tables';
  RAISE NOTICE '⭐ Added favorites and performance tracking';
  RAISE NOTICE '🔒 Implemented Row Level Security policies';
  RAISE NOTICE '🎯 Added 12 professional Tomb45 products';
  RAISE NOTICE '💰 Configured tier-based pricing and bulk discounts';
  RAISE NOTICE '📊 Created warehouse inventory entries';
  RAISE NOTICE '🚀 Ready for wholesale marketplace browsing!';
  RAISE NOTICE '=====================================================';
  RAISE NOTICE 'Next: Visit /inventory → Browse Wholesale tab';
  RAISE NOTICE '=====================================================';
END $$;