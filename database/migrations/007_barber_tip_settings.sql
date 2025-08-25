-- Migration: Add barber-level tip settings override capability
-- This allows individual barbers to customize their tip percentages
-- while inheriting barbershop defaults as a baseline

-- Create barber_tip_settings table for individual barber overrides
CREATE TABLE IF NOT EXISTS barber_tip_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id UUID NOT NULL,
  barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
  
  -- Override control
  use_shop_defaults BOOLEAN DEFAULT true,
  
  -- Custom tip settings (NULL = inherit from shop)
  service_tip_percentages INTEGER[] DEFAULT NULL,
  service_tip_fixed_amounts DECIMAL(10,2)[] DEFAULT NULL, 
  smart_tip_threshold DECIMAL(10,2) DEFAULT NULL,
  product_tips_enabled BOOLEAN DEFAULT NULL,
  tip_distribution_mode TEXT DEFAULT NULL CHECK (tip_distribution_mode IN ('individual', 'pooled') OR tip_distribution_mode IS NULL),
  
  -- Default selection at checkout
  default_tip_index INTEGER DEFAULT 1, -- 0-based index, 1 = middle option
  
  -- Stripe sync tracking
  stripe_config_id TEXT DEFAULT NULL,
  last_synced_at TIMESTAMPTZ DEFAULT NULL,
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  
  -- Constraints
  CONSTRAINT fk_barber_staff 
    FOREIGN KEY (barber_id, barbershop_id) 
    REFERENCES barbershop_staff(user_id, barbershop_id)
    ON DELETE CASCADE,
  
  -- Ensure one settings record per barber per shop
  UNIQUE(barber_id, barbershop_id)
);

-- Add indexes for performance
CREATE INDEX idx_barber_tip_settings_barber ON barber_tip_settings(barber_id);
CREATE INDEX idx_barber_tip_settings_barbershop ON barber_tip_settings(barbershop_id);
CREATE INDEX idx_barber_tip_settings_defaults ON barber_tip_settings(use_shop_defaults) WHERE use_shop_defaults = false;

-- Create service-level tip overrides (for future enhancement)
CREATE TABLE IF NOT EXISTS service_tip_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
  barber_id UUID DEFAULT NULL, -- NULL = shop-wide override, otherwise barber-specific
  
  -- Override settings
  tips_enabled BOOLEAN DEFAULT true,
  custom_percentages INTEGER[] DEFAULT NULL,
  custom_fixed_amounts DECIMAL(10,2)[] DEFAULT NULL,
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(service_id, barbershop_id, barber_id)
);

-- Add indexes for service overrides
CREATE INDEX idx_service_tip_overrides_service ON service_tip_overrides(service_id);
CREATE INDEX idx_service_tip_overrides_barbershop ON service_tip_overrides(barbershop_id);
CREATE INDEX idx_service_tip_overrides_barber ON service_tip_overrides(barber_id) WHERE barber_id IS NOT NULL;

-- Row Level Security Policies
ALTER TABLE barber_tip_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_tip_overrides ENABLE ROW LEVEL SECURITY;

-- Barbers can view and edit their own tip settings
CREATE POLICY barber_tip_settings_self ON barber_tip_settings
  FOR ALL
  USING (auth.uid() = barber_id);

-- Shop owners/managers can view all barber settings in their shop
CREATE POLICY barber_tip_settings_shop_owner ON barber_tip_settings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM barbershop_staff
      WHERE barbershop_staff.barbershop_id = barber_tip_settings.barbershop_id
      AND barbershop_staff.user_id = auth.uid()
      AND barbershop_staff.role IN ('owner', 'manager')
    )
  );

-- Service overrides - barbers can manage their own
CREATE POLICY service_tip_overrides_barber ON service_tip_overrides
  FOR ALL
  USING (
    barber_id = auth.uid() 
    OR (
      barber_id IS NULL 
      AND EXISTS (
        SELECT 1 FROM barbershop_staff
        WHERE barbershop_staff.barbershop_id = service_tip_overrides.barbershop_id
        AND barbershop_staff.user_id = auth.uid()
        AND barbershop_staff.role IN ('owner', 'manager')
      )
    )
  );

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_barber_tip_settings_updated_at
  BEFORE UPDATE ON barber_tip_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_service_tip_overrides_updated_at
  BEFORE UPDATE ON service_tip_overrides
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to get merged tip settings (barber overrides + shop defaults)
CREATE OR REPLACE FUNCTION get_merged_tip_settings(
  p_barber_id UUID,
  p_barbershop_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_barber_settings RECORD;
  v_shop_settings JSONB;
  v_merged_settings JSONB;
BEGIN
  -- Get barber settings
  SELECT * INTO v_barber_settings
  FROM barber_tip_settings
  WHERE barber_id = p_barber_id 
  AND barbershop_id = p_barbershop_id;
  
  -- Get shop settings
  SELECT tip_settings INTO v_shop_settings
  FROM barbershop_settings
  WHERE barbershop_id = p_barbershop_id;
  
  -- If no shop settings, use system defaults
  IF v_shop_settings IS NULL THEN
    v_shop_settings = jsonb_build_object(
      'service_tip_percentages', ARRAY[15, 20, 25],
      'service_tip_fixed_amounts', ARRAY[3, 5, 10],
      'smart_tip_threshold', 10,
      'product_tips_enabled', false,
      'tip_distribution_mode', 'individual'
    );
  END IF;
  
  -- If barber uses shop defaults or has no settings
  IF v_barber_settings IS NULL OR v_barber_settings.use_shop_defaults THEN
    RETURN v_shop_settings;
  END IF;
  
  -- Merge settings (barber overrides take precedence)
  v_merged_settings = jsonb_build_object(
    'service_tip_percentages', 
      COALESCE(v_barber_settings.service_tip_percentages, 
               (v_shop_settings->>'service_tip_percentages')::INTEGER[]),
    'service_tip_fixed_amounts',
      COALESCE(v_barber_settings.service_tip_fixed_amounts,
               (v_shop_settings->>'service_tip_fixed_amounts')::DECIMAL[]),
    'smart_tip_threshold',
      COALESCE(v_barber_settings.smart_tip_threshold,
               (v_shop_settings->>'smart_tip_threshold')::DECIMAL),
    'product_tips_enabled',
      COALESCE(v_barber_settings.product_tips_enabled,
               (v_shop_settings->>'product_tips_enabled')::BOOLEAN),
    'tip_distribution_mode',
      COALESCE(v_barber_settings.tip_distribution_mode,
               v_shop_settings->>'tip_distribution_mode'),
    'default_tip_index',
      COALESCE(v_barber_settings.default_tip_index, 1),
    'source', 
      CASE 
        WHEN v_barber_settings.use_shop_defaults THEN 'shop'
        ELSE 'barber'
      END
  );
  
  RETURN v_merged_settings;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_merged_tip_settings TO authenticated;

-- Add comment documentation
COMMENT ON TABLE barber_tip_settings IS 'Individual barber tip configuration overrides';
COMMENT ON TABLE service_tip_overrides IS 'Service-specific tip overrides for barbershops and barbers';
COMMENT ON FUNCTION get_merged_tip_settings IS 'Returns merged tip settings with barber overrides applied to shop defaults';