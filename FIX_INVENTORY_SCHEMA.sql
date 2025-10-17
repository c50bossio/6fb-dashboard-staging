-- =====================================================
-- Fix Inventory Schema - Add Missing Columns
-- =====================================================

-- Check and add missing columns to inventory_alerts table
DO $$ 
BEGIN
    -- Add is_resolved column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'inventory_alerts' 
        AND column_name = 'is_resolved'
    ) THEN
        ALTER TABLE inventory_alerts 
        ADD COLUMN is_resolved BOOLEAN DEFAULT false;
    END IF;

    -- Add resolved_by column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'inventory_alerts' 
        AND column_name = 'resolved_by'
    ) THEN
        ALTER TABLE inventory_alerts 
        ADD COLUMN resolved_by UUID;
    END IF;

    -- Add resolved_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'inventory_alerts' 
        AND column_name = 'resolved_at'
    ) THEN
        ALTER TABLE inventory_alerts 
        ADD COLUMN resolved_at TIMESTAMPTZ;
    END IF;

    -- Add resolution_notes column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'inventory_alerts' 
        AND column_name = 'resolution_notes'
    ) THEN
        ALTER TABLE inventory_alerts 
        ADD COLUMN resolution_notes TEXT;
    END IF;
END $$;

-- Now create the index that was failing
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_unresolved 
ON inventory_alerts(barbershop_id, is_resolved);

-- Verify the columns were added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'inventory_alerts'
ORDER BY ordinal_position;