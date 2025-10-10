-- Migration 004: Add location tracking to inventory for CIN7 marketplace integration
-- This enables separation between shop inventory vs warehouse inventory

-- Add location tracking columns to existing inventory table
ALTER TABLE inventory 
ADD COLUMN IF NOT EXISTS location_type VARCHAR(50) DEFAULT 'shop',
ADD COLUMN IF NOT EXISTS cin7_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS last_ordered_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_tomb45 BOOLEAN DEFAULT false;

-- Add comment to describe location_type values
COMMENT ON COLUMN inventory.location_type IS 'Location of inventory: shop (in barbershop), warehouse (CIN7), transit (ordered but not received)';

-- Add index for faster filtering by location type
CREATE INDEX IF NOT EXISTS idx_inventory_location_type ON inventory(location_type);

-- Add index for CIN7 integration lookups
CREATE INDEX IF NOT EXISTS idx_inventory_cin7_id ON inventory(cin7_id) WHERE cin7_id IS NOT NULL;

-- Add index for Tomb45 products
CREATE INDEX IF NOT EXISTS idx_inventory_tomb45 ON inventory(is_tomb45) WHERE is_tomb45 = true;

-- Update existing records to set location_type based on current_stock
-- If current_stock > 0, assume it's in shop, otherwise mark as warehouse
UPDATE inventory 
SET location_type = CASE 
  WHEN current_stock > 0 THEN 'shop'
  ELSE 'warehouse'
END
WHERE location_type = 'shop'; -- Only update default values

-- Update any existing Tomb45/Tune 45 products
UPDATE inventory 
SET is_tomb45 = true
WHERE (
  LOWER(brand) LIKE '%tomb45%' OR 
  LOWER(brand) LIKE '%tune 45%' OR
  LOWER(name) LIKE '%tomb45%' OR
  LOWER(name) LIKE '%tune 45%'
);

-- Add constraint to ensure location_type values are valid
ALTER TABLE inventory 
ADD CONSTRAINT chk_inventory_location_type 
CHECK (location_type IN ('shop', 'warehouse', 'transit'));