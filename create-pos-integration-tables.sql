-- SQL Script to create tables for BookBarber POS ↔ CIN7 Integration
-- Run this in Supabase SQL Editor

-- 1. Inventory Checks Table (tracks stock availability checks from POS)
CREATE TABLE IF NOT EXISTS inventory_checks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  product_sku VARCHAR(255) NOT NULL,
  requested_quantity INTEGER NOT NULL,
  available_stock INTEGER,
  check_result BOOLEAN DEFAULT false,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Sale Syncs Table (tracks sales synced between BookBarber and CIN7)
CREATE TABLE IF NOT EXISTS sale_syncs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  bookbarber_sale_id VARCHAR(255),
  cin7_sale_id VARCHAR(255),
  sync_status VARCHAR(50) CHECK (sync_status IN ('pending', 'success', 'failed')),
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. External Sales Table (tracks sales from other channels via webhooks)
CREATE TABLE IF NOT EXISTS external_sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cin7_sale_id VARCHAR(255) UNIQUE,
  invoice_number VARCHAR(255),
  total_amount DECIMAL(10, 2),
  items JSONB,
  sale_date TIMESTAMP WITH TIME ZONE,
  source VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Inventory Alerts Table (tracks out-of-stock and low-stock alerts)
CREATE TABLE IF NOT EXISTS inventory_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  alert_type VARCHAR(50) CHECK (alert_type IN ('out_of_stock', 'low_stock', 'restock_needed')),
  product_sku VARCHAR(255),
  product_name VARCHAR(255),
  message TEXT,
  severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Webhook Logs Table (tracks all incoming webhooks for debugging)
CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source VARCHAR(50),
  event_type VARCHAR(100),
  payload JSONB,
  processed BOOLEAN DEFAULT false,
  error_message TEXT,
  received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Add new columns to products table for better tracking
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS on_hand INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS allocated INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS incoming INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_cin7_update TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS sync_enabled BOOLEAN DEFAULT true;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_inventory_checks_barbershop ON inventory_checks(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_inventory_checks_sku ON inventory_checks(product_sku);
CREATE INDEX IF NOT EXISTS idx_sale_syncs_barbershop ON sale_syncs(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_sale_syncs_status ON sale_syncs(sync_status);
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_barbershop ON inventory_alerts(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_resolved ON inventory_alerts(resolved);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_source ON webhook_logs(source);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_processed ON webhook_logs(processed);

-- Create function to decrement stock (used by POS sales)
CREATE OR REPLACE FUNCTION decrement_stock(
  p_sku VARCHAR,
  p_quantity INTEGER,
  p_barbershop_id UUID DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  new_stock INTEGER,
  message TEXT
) AS $$
DECLARE
  v_current_stock INTEGER;
  v_product_id UUID;
BEGIN
  -- Get current stock
  SELECT id, current_stock INTO v_product_id, v_current_stock
  FROM products
  WHERE sku = p_sku
    AND (p_barbershop_id IS NULL OR barbershop_id = p_barbershop_id)
  LIMIT 1;
  
  IF v_product_id IS NULL THEN
    RETURN QUERY SELECT false::BOOLEAN, 0, 'Product not found'::TEXT;
    RETURN;
  END IF;
  
  IF v_current_stock < p_quantity THEN
    RETURN QUERY SELECT false::BOOLEAN, v_current_stock, 
      format('Insufficient stock. Available: %s, Requested: %s', v_current_stock, p_quantity)::TEXT;
    RETURN;
  END IF;
  
  -- Update stock
  UPDATE products
  SET current_stock = current_stock - p_quantity,
      updated_at = NOW()
  WHERE id = v_product_id
  RETURNING current_stock INTO v_current_stock;
  
  RETURN QUERY SELECT true::BOOLEAN, v_current_stock, 'Stock updated successfully'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Create function to check and alert on low stock
CREATE OR REPLACE FUNCTION check_low_stock_alert()
RETURNS TRIGGER AS $$
BEGIN
  -- If stock falls below minimum, create alert
  IF NEW.current_stock <= NEW.min_stock_level AND NEW.current_stock > 0 THEN
    INSERT INTO inventory_alerts (
      barbershop_id,
      alert_type,
      product_sku,
      product_name,
      message,
      severity
    ) VALUES (
      NEW.barbershop_id,
      'low_stock',
      NEW.sku,
      NEW.name,
      format('Low stock alert: %s has %s units remaining (min: %s)', 
        NEW.name, NEW.current_stock, NEW.min_stock_level),
      CASE 
        WHEN NEW.current_stock <= 5 THEN 'high'
        WHEN NEW.current_stock <= 10 THEN 'medium'
        ELSE 'low'
      END
    );
  END IF;
  
  -- If stock reaches zero, create out of stock alert
  IF NEW.current_stock = 0 AND OLD.current_stock > 0 THEN
    INSERT INTO inventory_alerts (
      barbershop_id,
      alert_type,
      product_sku,
      product_name,
      message,
      severity
    ) VALUES (
      NEW.barbershop_id,
      'out_of_stock',
      NEW.sku,
      NEW.name,
      format('%s is now OUT OF STOCK', NEW.name),
      'critical'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for low stock alerts
DROP TRIGGER IF EXISTS trigger_check_low_stock ON products;
CREATE TRIGGER trigger_check_low_stock
  AFTER UPDATE OF current_stock ON products
  FOR EACH ROW
  EXECUTE FUNCTION check_low_stock_alert();

-- Row Level Security Policies
ALTER TABLE inventory_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_syncs ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies (barbershop owners can see their own data)
CREATE POLICY "Barbershop owners can view their inventory checks"
  ON inventory_checks FOR SELECT
  USING (barbershop_id IN (
    SELECT id FROM barbershops WHERE owner_id = auth.uid()
  ));

CREATE POLICY "Barbershop owners can view their sale syncs"
  ON sale_syncs FOR SELECT
  USING (barbershop_id IN (
    SELECT id FROM barbershops WHERE owner_id = auth.uid()
  ));

CREATE POLICY "Barbershop owners can view their inventory alerts"
  ON inventory_alerts FOR SELECT
  USING (barbershop_id IN (
    SELECT id FROM barbershops WHERE owner_id = auth.uid()
  ));

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON inventory_checks TO authenticated;
GRANT SELECT, INSERT, UPDATE ON sale_syncs TO authenticated;
GRANT SELECT, INSERT ON external_sales TO authenticated;
GRANT SELECT, INSERT, UPDATE ON inventory_alerts TO authenticated;
GRANT SELECT, INSERT ON webhook_logs TO service_role;

-- Success message
SELECT 'BookBarber POS Integration Tables Created Successfully' AS status;