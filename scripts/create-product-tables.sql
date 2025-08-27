-- Create product_sales table if it doesn't exist
CREATE TABLE IF NOT EXISTS product_sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  cost DECIMAL(10,2),
  customer_id UUID REFERENCES customers(id),
  sale_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_sales_shop_id ON product_sales(shop_id);
CREATE INDEX IF NOT EXISTS idx_product_sales_product_id ON product_sales(product_id);
CREATE INDEX IF NOT EXISTS idx_product_sales_sale_date ON product_sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_product_sales_customer_id ON product_sales(customer_id);

-- Add RLS policies
ALTER TABLE product_sales ENABLE ROW LEVEL SECURITY;

-- Policy for shop owners to see their sales
CREATE POLICY "Shop owners can view their sales" ON product_sales
  FOR SELECT
  USING (
    shop_id IN (
      SELECT id FROM barbershops WHERE owner_id = auth.uid()
      UNION
      SELECT barbershop_id FROM barbershop_staff WHERE user_id = auth.uid()
    )
  );

-- Policy for shop owners to create sales
CREATE POLICY "Shop owners can create sales" ON product_sales
  FOR INSERT
  WITH CHECK (
    shop_id IN (
      SELECT id FROM barbershops WHERE owner_id = auth.uid()
      UNION
      SELECT barbershop_id FROM barbershop_staff WHERE user_id = auth.uid()
    )
  );

-- Add missing columns to products table if they don't exist
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS cost DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS min_stock INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS max_stock INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS reorder_point INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS supplier TEXT,
ADD COLUMN IF NOT EXISTS last_restocked_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'General';

-- Create sample data generator function
CREATE OR REPLACE FUNCTION generate_sample_sales_data()
RETURNS void AS $$
DECLARE
  v_shop_id UUID;
  v_product RECORD;
  v_sale_date TIMESTAMP;
  v_quantity INTEGER;
  v_days_back INTEGER := 90;
BEGIN
  -- Get the first shop ID
  SELECT id INTO v_shop_id FROM barbershops LIMIT 1;
  
  IF v_shop_id IS NOT NULL THEN
    -- For each product in the shop
    FOR v_product IN SELECT * FROM products WHERE shop_id = v_shop_id LOOP
      -- Generate 20-50 sales per product over the last 90 days
      FOR i IN 1..(20 + floor(random() * 30))::INTEGER LOOP
        v_sale_date := NOW() - (floor(random() * v_days_back) || ' days')::INTERVAL;
        v_quantity := 1 + floor(random() * 5)::INTEGER;
        
        INSERT INTO product_sales (
          shop_id,
          product_id,
          quantity,
          unit_price,
          total_amount,
          cost,
          sale_date,
          payment_method
        ) VALUES (
          v_shop_id,
          v_product.id,
          v_quantity,
          v_product.price,
          v_product.price * v_quantity,
          COALESCE(v_product.cost, v_product.price * 0.6), -- 40% margin if no cost
          v_sale_date,
          CASE floor(random() * 4)::INTEGER
            WHEN 0 THEN 'cash'
            WHEN 1 THEN 'card'
            WHEN 2 THEN 'online'
            ELSE 'mobile'
          END
        );
      END LOOP;
    END LOOP;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Run the data generator (comment out if you don't want sample data)
-- SELECT generate_sample_sales_data();