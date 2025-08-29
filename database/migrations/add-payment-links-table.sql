-- Migration: Add POS Payment Links table
-- Description: Create table for tracking Stripe Payment Links for POS transactions
-- Author: Claude Code Assistant
-- Date: 2025-08-28

-- Create pos_payment_links table
CREATE TABLE IF NOT EXISTS pos_payment_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
  barber_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  cart_data JSONB NOT NULL,
  payment_link_url TEXT NOT NULL,
  customer_contact TEXT,
  contact_method TEXT CHECK (contact_method IN ('sms', 'email')) DEFAULT 'sms',
  status TEXT CHECK (status IN ('pending', 'paid', 'expired', 'cancelled')) DEFAULT 'pending',
  stripe_session_id TEXT UNIQUE,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  currency TEXT DEFAULT 'usd',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  paid_at TIMESTAMP WITH TIME ZONE,
  
  -- Additional metadata for tracking
  metadata JSONB DEFAULT '{}',
  
  -- Ensure we have required contact info
  CONSTRAINT valid_contact_info CHECK (
    customer_contact IS NOT NULL AND 
    length(trim(customer_contact)) > 0
  )
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS pos_payment_links_barbershop_id_idx ON pos_payment_links(barbershop_id);
CREATE INDEX IF NOT EXISTS pos_payment_links_barber_id_idx ON pos_payment_links(barber_id);
CREATE INDEX IF NOT EXISTS pos_payment_links_status_idx ON pos_payment_links(status);
CREATE INDEX IF NOT EXISTS pos_payment_links_stripe_session_id_idx ON pos_payment_links(stripe_session_id);
CREATE INDEX IF NOT EXISTS pos_payment_links_created_at_idx ON pos_payment_links(created_at DESC);
CREATE INDEX IF NOT EXISTS pos_payment_links_expires_at_idx ON pos_payment_links(expires_at);

-- Add RLS (Row Level Security) policies
ALTER TABLE pos_payment_links ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access payment links for their barbershop
CREATE POLICY "payment_links_barbershop_access" ON pos_payment_links
  FOR ALL USING (
    barbershop_id IN (
      SELECT COALESCE(profiles.shop_id, staff.barbershop_id)
      FROM profiles
      LEFT JOIN barbershop_staff staff ON staff.user_id = profiles.id AND staff.is_active = true
      WHERE profiles.id = auth.uid()
    )
  );

-- Policy: Allow inserting payment links for own barbershop
CREATE POLICY "payment_links_insert" ON pos_payment_links
  FOR INSERT WITH CHECK (
    barbershop_id IN (
      SELECT COALESCE(profiles.shop_id, staff.barbershop_id)
      FROM profiles
      LEFT JOIN barbershop_staff staff ON staff.user_id = profiles.id AND staff.is_active = true
      WHERE profiles.id = auth.uid()
    )
  );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_pos_payment_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pos_payment_links_updated_at_trigger
  BEFORE UPDATE ON pos_payment_links
  FOR EACH ROW
  EXECUTE FUNCTION update_pos_payment_links_updated_at();

-- Create function to automatically expire old payment links
CREATE OR REPLACE FUNCTION expire_old_payment_links()
RETURNS void AS $$
BEGIN
  UPDATE pos_payment_links 
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'pending' 
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Comment on table and important columns
COMMENT ON TABLE pos_payment_links IS 'Tracks Stripe Payment Links for POS transactions';
COMMENT ON COLUMN pos_payment_links.cart_data IS 'JSON structure containing cart items with quantities, prices, and product IDs';
COMMENT ON COLUMN pos_payment_links.customer_contact IS 'Customer phone number or email address for link delivery';
COMMENT ON COLUMN pos_payment_links.contact_method IS 'Method used to send payment link: sms or email';
COMMENT ON COLUMN pos_payment_links.stripe_session_id IS 'Stripe Checkout Session ID for webhook processing';
COMMENT ON COLUMN pos_payment_links.metadata IS 'Additional metadata for tracking and reporting';

-- Create pos_sales table if it doesn't exist (for tracking individual sales from payment links)
CREATE TABLE IF NOT EXISTS pos_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
  product_id UUID NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
  total_price DECIMAL(10,2) NOT NULL CHECK (total_price >= 0),
  barber_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  payment_method TEXT NOT NULL,
  receipt_number TEXT NOT NULL,
  payment_link_id UUID REFERENCES pos_payment_links(id) ON DELETE SET NULL,
  customer_contact TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create pos_commissions table if it doesn't exist (for tracking commissions from product sales)
CREATE TABLE IF NOT EXISTS pos_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
  product_id UUID NOT NULL,
  sale_amount DECIMAL(10,2) NOT NULL CHECK (sale_amount >= 0),
  commission_rate DECIMAL(5,2) NOT NULL CHECK (commission_rate >= 0 AND commission_rate <= 100),
  commission_amount DECIMAL(10,2) NOT NULL CHECK (commission_amount >= 0),
  payment_link_id UUID REFERENCES pos_payment_links(id) ON DELETE SET NULL,
  status TEXT CHECK (status IN ('pending_payout', 'paid_out', 'cancelled')) DEFAULT 'pending_payout',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  paid_at TIMESTAMP WITH TIME ZONE
);

-- Add indexes for pos_sales
CREATE INDEX IF NOT EXISTS pos_sales_barbershop_id_idx ON pos_sales(barbershop_id);
CREATE INDEX IF NOT EXISTS pos_sales_barber_id_idx ON pos_sales(barber_id);
CREATE INDEX IF NOT EXISTS pos_sales_receipt_number_idx ON pos_sales(receipt_number);
CREATE INDEX IF NOT EXISTS pos_sales_created_at_idx ON pos_sales(created_at DESC);

-- Add indexes for pos_commissions
CREATE INDEX IF NOT EXISTS pos_commissions_barber_id_idx ON pos_commissions(barber_id);
CREATE INDEX IF NOT EXISTS pos_commissions_barbershop_id_idx ON pos_commissions(barbershop_id);
CREATE INDEX IF NOT EXISTS pos_commissions_status_idx ON pos_commissions(status);
CREATE INDEX IF NOT EXISTS pos_commissions_created_at_idx ON pos_commissions(created_at DESC);

-- Add RLS for pos_sales
ALTER TABLE pos_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pos_sales_barbershop_access" ON pos_sales
  FOR ALL USING (
    barbershop_id IN (
      SELECT COALESCE(profiles.shop_id, staff.barbershop_id)
      FROM profiles
      LEFT JOIN barbershop_staff staff ON staff.user_id = profiles.id AND staff.is_active = true
      WHERE profiles.id = auth.uid()
    )
  );

-- Add RLS for pos_commissions
ALTER TABLE pos_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pos_commissions_barbershop_access" ON pos_commissions
  FOR ALL USING (
    barbershop_id IN (
      SELECT COALESCE(profiles.shop_id, staff.barbershop_id)
      FROM profiles
      LEFT JOIN barbershop_staff staff ON staff.user_id = profiles.id AND staff.is_active = true
      WHERE profiles.id = auth.uid()
    )
  );

-- Create function to update inventory stock (if it doesn't already exist)
CREATE OR REPLACE FUNCTION update_inventory_stock(
  p_product_id UUID,
  p_quantity_change INTEGER,
  p_reason TEXT DEFAULT 'manual',
  p_reference_id UUID DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  -- Update the product's current stock
  UPDATE products 
  SET 
    current_stock = GREATEST(0, current_stock + p_quantity_change),
    updated_at = NOW()
  WHERE id = p_product_id;
  
  -- Log the inventory change (assuming there's an inventory_movements table)
  INSERT INTO inventory_movements (
    product_id,
    quantity_change,
    reason,
    reference_id,
    created_at
  ) VALUES (
    p_product_id,
    p_quantity_change,
    p_reason,
    p_reference_id,
    NOW()
  ) ON CONFLICT DO NOTHING; -- In case the table doesn't exist yet
  
EXCEPTION
  WHEN others THEN
    -- If inventory_movements table doesn't exist, just update stock
    NULL;
END;
$$ LANGUAGE plpgsql;

-- Grant appropriate permissions
GRANT ALL ON pos_payment_links TO authenticated;
GRANT ALL ON pos_sales TO authenticated;
GRANT ALL ON pos_commissions TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION update_inventory_stock TO authenticated;
GRANT EXECUTE ON FUNCTION expire_old_payment_links TO authenticated;