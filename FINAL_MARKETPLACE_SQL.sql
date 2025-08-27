-- =====================================================
-- BookedBarber Wholesale Marketplace - Final Production SQL
-- Execute this entire script in Supabase SQL Editor
-- =====================================================

-- PART 1: Extend Existing Tables
-- =====================================================

-- Extend master_products with tier_pricing column (the core feature)
ALTER TABLE master_products 
ADD COLUMN IF NOT EXISTS tier_pricing JSONB DEFAULT '{
  "free": 1.0,
  "premium": 0.95, 
  "enterprise": 0.85
}'::jsonb;

-- Add GIN index for JSONB tier_pricing queries
CREATE INDEX IF NOT EXISTS idx_master_products_tier_pricing 
ON master_products USING GIN (tier_pricing);

-- Extend barbershop_inventory with marketplace integration fields
ALTER TABLE barbershop_inventory 
ADD COLUMN IF NOT EXISTS marketplace_product_id UUID,
ADD COLUMN IF NOT EXISTS auto_reorder_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS preferred_supplier TEXT DEFAULT 'marketplace',
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

-- Extend marketplace_enrollment with subscription tiers (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'marketplace_enrollment') THEN
    ALTER TABLE marketplace_enrollment 
    ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free';
    
    CREATE INDEX IF NOT EXISTS idx_marketplace_enrollment_subscription_tier 
    ON marketplace_enrollment(subscription_tier);
  END IF;
END $$;

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
)
ON CONFLICT (sku) DO NOTHING; -- Prevent duplicates if script is run multiple times

-- Create warehouse inventory entries for all Tomb45 products (if warehouse_inventory table exists)
DO $$
DECLARE
    product_record RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'warehouse_inventory') THEN
    -- Loop through each Tomb45 product and insert if not exists
    FOR product_record IN 
      SELECT id FROM master_products WHERE brand = 'Tomb45' AND sku LIKE 'TOMB45-%'
    LOOP
      -- Check if warehouse inventory already exists for this product
      IF NOT EXISTS (SELECT 1 FROM warehouse_inventory WHERE master_product_id = product_record.id) THEN
        INSERT INTO warehouse_inventory (
          master_product_id, 
          quantity_available, 
          quantity_reserved, 
          quantity_on_order,
          reorder_point, 
          reorder_quantity, 
          max_stock_level,
          lead_time_days
        ) VALUES (
          product_record.id,
          500, -- Starting inventory
          0,   -- No reservations initially
          0,   -- No orders pending
          50,  -- Reorder when 50 left
          200, -- Reorder 200 units
          1000, -- Max stock 1000
          3     -- 3 day lead time from supplier
        );
      END IF;
    END LOOP;
  END IF;
END $$;

-- Final success notification
DO $$
BEGIN
  RAISE NOTICE '=====================================================';
  RAISE NOTICE '🎉 WHOLESALE MARKETPLACE DEPLOYMENT COMPLETE!';
  RAISE NOTICE '=====================================================';
  RAISE NOTICE '✅ Extended master_products with tier pricing';
  RAISE NOTICE '✅ Extended barbershop_inventory with marketplace fields';
  RAISE NOTICE '✅ Added subscription tier support (if table exists)';
  RAISE NOTICE '🎯 Added 12 professional Tomb45 products';
  RAISE NOTICE '💰 Configured tier-based pricing and bulk discounts';
  RAISE NOTICE '📊 Created warehouse inventory entries (if table exists)';
  RAISE NOTICE '🚀 Ready for wholesale marketplace browsing!';
  RAISE NOTICE '=====================================================';
  RAISE NOTICE 'Next: Visit /inventory → Browse Wholesale tab';
  RAISE NOTICE '=====================================================';
END $$;