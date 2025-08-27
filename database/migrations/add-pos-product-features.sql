-- Migration: Add POS features and product sales tracking
-- Date: 2025-08-26
-- Purpose: Enable real product sales through POS with CIN7 integration

-- Add POS-specific columns to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS show_in_pos BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS pos_display_order INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
ADD COLUMN IF NOT EXISTS supplier VARCHAR(255),
ADD COLUMN IF NOT EXISTS reorder_point INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS last_sold_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS barcode VARCHAR(100),
ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5,2) DEFAULT 40.00; -- Default 40% commission on products

-- Create index for POS queries
CREATE INDEX IF NOT EXISTS idx_products_pos ON products(barbershop_id, show_in_pos, pos_display_order);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);

-- Create product_sales table for tracking actual sales
CREATE TABLE IF NOT EXISTS product_sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE SET NULL,
  
  -- Sale information
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  cost_price DECIMAL(10,2), -- Cost at time of sale for margin tracking
  
  -- Who and when
  barber_id UUID REFERENCES profiles(id),
  customer_id UUID REFERENCES customers(id),
  appointment_id UUID REFERENCES appointments(id),
  sale_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Payment information
  payment_method VARCHAR(50), -- 'cash', 'card', 'online', 'house_account'
  payment_intent_id VARCHAR(255), -- Stripe payment intent if applicable
  
  -- Additional tracking
  notes TEXT,
  pos_terminal_id VARCHAR(100),
  receipt_number VARCHAR(50),
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for product_sales
CREATE INDEX IF NOT EXISTS idx_product_sales_barbershop ON product_sales(barbershop_id, sale_date);
CREATE INDEX IF NOT EXISTS idx_product_sales_product ON product_sales(product_id, sale_date);
CREATE INDEX IF NOT EXISTS idx_product_sales_barber ON product_sales(barber_id, sale_date);
CREATE INDEX IF NOT EXISTS idx_product_sales_customer ON product_sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_product_sales_appointment ON product_sales(appointment_id);
CREATE INDEX IF NOT EXISTS idx_product_sales_date ON product_sales(sale_date);

-- Create product bundles table for package deals
CREATE TABLE IF NOT EXISTS product_bundles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  bundle_price DECIMAL(10,2) NOT NULL,
  discount_percentage DECIMAL(5,2),
  is_active BOOLEAN DEFAULT true,
  show_in_pos BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bundle items junction table
CREATE TABLE IF NOT EXISTS bundle_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bundle_id UUID NOT NULL REFERENCES product_bundles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  UNIQUE(bundle_id, product_id)
);

-- Product recommendations table
CREATE TABLE IF NOT EXISTS product_recommendations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
  trigger_product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  trigger_service_id UUID REFERENCES services(id) ON DELETE CASCADE,
  recommended_product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  recommendation_type VARCHAR(50), -- 'cross_sell', 'upsell', 'bundle', 'complement'
  confidence_score DECIMAL(3,2) DEFAULT 0.50, -- 0-1 confidence
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(trigger_product_id, recommended_product_id),
  UNIQUE(trigger_service_id, recommended_product_id)
);

-- Add RLS policies for new tables
ALTER TABLE product_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bundle_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_recommendations ENABLE ROW LEVEL SECURITY;

-- Policy for shop staff to manage product sales
CREATE POLICY "Shop staff can manage product sales" ON product_sales
  FOR ALL
  USING (
    barbershop_id IN (
      SELECT id FROM barbershops WHERE owner_id = auth.uid()
      UNION
      SELECT barbershop_id FROM barbershop_staff WHERE user_id = auth.uid()
    )
  );

-- Policy for shop owners to manage bundles
CREATE POLICY "Shop owners can manage bundles" ON product_bundles
  FOR ALL
  USING (
    barbershop_id IN (
      SELECT id FROM barbershops WHERE owner_id = auth.uid()
      UNION
      SELECT barbershop_id FROM barbershop_staff 
      WHERE user_id = auth.uid() AND role IN ('manager', 'admin')
    )
  );

-- Policy for bundle items (inherit from bundles)
CREATE POLICY "Access bundle items through bundles" ON bundle_items
  FOR ALL
  USING (
    bundle_id IN (
      SELECT id FROM product_bundles WHERE barbershop_id IN (
        SELECT id FROM barbershops WHERE owner_id = auth.uid()
        UNION
        SELECT barbershop_id FROM barbershop_staff WHERE user_id = auth.uid()
      )
    )
  );

-- Policy for recommendations
CREATE POLICY "Shop staff can view recommendations" ON product_recommendations
  FOR SELECT
  USING (
    barbershop_id IN (
      SELECT id FROM barbershops WHERE owner_id = auth.uid()
      UNION
      SELECT barbershop_id FROM barbershop_staff WHERE user_id = auth.uid()
    )
  );

-- Function to update product stock after sale
CREATE OR REPLACE FUNCTION update_product_stock_on_sale()
RETURNS TRIGGER AS $$
BEGIN
  -- Decrease stock when product is sold
  UPDATE products 
  SET 
    current_stock = GREATEST(0, current_stock - NEW.quantity),
    last_sold_at = NEW.sale_date,
    on_hand = GREATEST(0, on_hand - NEW.quantity)
  WHERE id = NEW.product_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for stock updates
DROP TRIGGER IF EXISTS trigger_update_product_stock ON product_sales;
CREATE TRIGGER trigger_update_product_stock
  AFTER INSERT ON product_sales
  FOR EACH ROW
  EXECUTE FUNCTION update_product_stock_on_sale();

-- Function to calculate product analytics
CREATE OR REPLACE FUNCTION get_product_analytics(
  p_barbershop_id UUID,
  p_period_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  product_id UUID,
  product_name TEXT,
  units_sold BIGINT,
  total_revenue DECIMAL,
  total_profit DECIMAL,
  avg_sale_price DECIMAL,
  sales_velocity DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ps.product_id,
    p.name::TEXT as product_name,
    SUM(ps.quantity)::BIGINT as units_sold,
    SUM(ps.total_amount) as total_revenue,
    SUM(ps.total_amount - COALESCE(ps.cost_price * ps.quantity, 0)) as total_profit,
    AVG(ps.unit_price) as avg_sale_price,
    (SUM(ps.quantity)::DECIMAL / p_period_days) as sales_velocity
  FROM product_sales ps
  JOIN products p ON p.id = ps.product_id
  WHERE ps.barbershop_id = p_barbershop_id
    AND ps.sale_date >= NOW() - INTERVAL '1 day' * p_period_days
  GROUP BY ps.product_id, p.name
  ORDER BY total_revenue DESC;
END;
$$ LANGUAGE plpgsql;