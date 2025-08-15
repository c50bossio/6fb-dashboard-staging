-- Enhanced Cin7 webhook and inventory management tables
-- Run this SQL in Supabase to support real-time inventory sync

-- Low stock alerts table
CREATE TABLE IF NOT EXISTS low_stock_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    current_stock INTEGER NOT NULL,
    min_stock_level INTEGER NOT NULL,
    alert_level TEXT NOT NULL CHECK (alert_level IN ('warning', 'critical')),
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product change logs for audit trail
CREATE TABLE IF NOT EXISTS product_change_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID NOT NULL,
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'stock_changed')),
    changes JSONB,
    previous_values JSONB,
    source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'cin7_webhook', 'cin7_sync', 'bulk_import')),
    user_id UUID,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Webhook activity logs
CREATE TABLE IF NOT EXISTS cin7_webhook_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    object_type TEXT,
    object_id TEXT,
    webhook_data JSONB,
    processed_at TIMESTAMPTZ DEFAULT NOW(),
    processing_status TEXT NOT NULL DEFAULT 'success' CHECK (processing_status IN ('success', 'failed', 'pending')),
    error_message TEXT,
    retry_count INTEGER DEFAULT 0
);

-- Inventory transactions table for detailed tracking
CREATE TABLE IF NOT EXISTS inventory_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('sale', 'purchase', 'adjustment', 'transfer', 'return')),
    quantity INTEGER NOT NULL,
    previous_stock INTEGER NOT NULL,
    new_stock INTEGER NOT NULL,
    unit_cost DECIMAL(10,2),
    total_value DECIMAL(10,2),
    reference_id TEXT, -- Order ID, Purchase ID, etc.
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bulk operations tracking
CREATE TABLE IF NOT EXISTS bulk_operations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    operation_type TEXT NOT NULL CHECK (operation_type IN ('import', 'export', 'sync', 'bulk_update')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    total_items INTEGER DEFAULT 0,
    processed_items INTEGER DEFAULT 0,
    success_items INTEGER DEFAULT 0,
    failed_items INTEGER DEFAULT 0,
    operation_data JSONB,
    error_log JSONB,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_by UUID
);

-- Add cin7_product_id to products table if not exists
ALTER TABLE products ADD COLUMN IF NOT EXISTS cin7_product_id TEXT UNIQUE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS last_cin7_sync TIMESTAMPTZ;
ALTER TABLE products ADD COLUMN IF NOT EXISTS cin7_deletion_date TIMESTAMPTZ;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_low_stock_alerts_barbershop_unresolved 
ON low_stock_alerts(barbershop_id, is_resolved, created_at);

CREATE INDEX IF NOT EXISTS idx_product_change_logs_product_timestamp 
ON product_change_logs(product_id, timestamp);

CREATE INDEX IF NOT EXISTS idx_cin7_webhook_logs_barbershop_event 
ON cin7_webhook_logs(barbershop_id, event_type, processed_at);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_product_date 
ON inventory_transactions(product_id, created_at);

CREATE INDEX IF NOT EXISTS idx_products_cin7_id 
ON products(cin7_product_id) WHERE cin7_product_id IS NOT NULL;

-- Row Level Security policies
ALTER TABLE low_stock_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_change_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cin7_webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulk_operations ENABLE ROW LEVEL SECURITY;

-- RLS policies for barbershop owners and staff
CREATE POLICY IF NOT EXISTS "Barbershop staff can view their alerts" ON low_stock_alerts
FOR SELECT USING (
    barbershop_id IN (
        SELECT barbershop_id FROM barbershop_staff WHERE user_id = auth.uid()
    )
);

CREATE POLICY IF NOT EXISTS "Barbershop staff can manage their alerts" ON low_stock_alerts
FOR ALL USING (
    barbershop_id IN (
        SELECT barbershop_id FROM barbershop_staff WHERE user_id = auth.uid()
    )
);

CREATE POLICY IF NOT EXISTS "Barbershop staff can view their logs" ON product_change_logs
FOR SELECT USING (
    barbershop_id IN (
        SELECT barbershop_id FROM barbershop_staff WHERE user_id = auth.uid()
    )
);

CREATE POLICY IF NOT EXISTS "Barbershop staff can view their webhook logs" ON cin7_webhook_logs
FOR SELECT USING (
    barbershop_id IN (
        SELECT barbershop_id FROM barbershop_staff WHERE user_id = auth.uid()
    )
);

CREATE POLICY IF NOT EXISTS "Barbershop staff can view their transactions" ON inventory_transactions
FOR SELECT USING (
    barbershop_id IN (
        SELECT barbershop_id FROM barbershop_staff WHERE user_id = auth.uid()
    )
);

CREATE POLICY IF NOT EXISTS "Barbershop staff can manage their transactions" ON inventory_transactions
FOR ALL USING (
    barbershop_id IN (
        SELECT barbershop_id FROM barbershop_staff WHERE user_id = auth.uid()
    )
);

CREATE POLICY IF NOT EXISTS "Barbershop staff can view their bulk operations" ON bulk_operations
FOR SELECT USING (
    barbershop_id IN (
        SELECT barbershop_id FROM barbershop_staff WHERE user_id = auth.uid()
    )
);

CREATE POLICY IF NOT EXISTS "Barbershop staff can manage their bulk operations" ON bulk_operations
FOR ALL USING (
    barbershop_id IN (
        SELECT barbershop_id FROM barbershop_staff WHERE user_id = auth.uid()
    )
);

-- Functions for automated triggers

-- Function to automatically create low stock alerts
CREATE OR REPLACE FUNCTION check_low_stock_alert()
RETURNS TRIGGER AS $$
BEGIN
    -- If stock went below minimum level
    IF NEW.current_stock <= NEW.min_stock_level AND 
       (OLD.current_stock IS NULL OR OLD.current_stock > NEW.min_stock_level) THEN
        
        INSERT INTO low_stock_alerts (
            barbershop_id,
            product_id,
            product_name,
            current_stock,
            min_stock_level,
            alert_level,
            is_resolved
        ) VALUES (
            NEW.barbershop_id,
            NEW.id,
            NEW.name,
            NEW.current_stock,
            NEW.min_stock_level,
            CASE WHEN NEW.current_stock = 0 THEN 'critical' ELSE 'warning' END,
            FALSE
        );
    END IF;
    
    -- Resolve existing alerts if stock is back above minimum
    IF NEW.current_stock > NEW.min_stock_level AND 
       OLD.current_stock IS NOT NULL AND OLD.current_stock <= NEW.min_stock_level THEN
        
        UPDATE low_stock_alerts 
        SET is_resolved = TRUE, 
            resolved_at = NOW() 
        WHERE product_id = NEW.id 
          AND is_resolved = FALSE;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for automatic low stock alerts
DROP TRIGGER IF EXISTS trigger_check_low_stock ON products;
CREATE TRIGGER trigger_check_low_stock
    AFTER UPDATE OF current_stock ON products
    FOR EACH ROW
    EXECUTE FUNCTION check_low_stock_alert();

-- Function to log product changes
CREATE OR REPLACE FUNCTION log_product_changes()
RETURNS TRIGGER AS $$
DECLARE
    action_type TEXT;
    changes_data JSONB;
    previous_data JSONB;
BEGIN
    IF TG_OP = 'INSERT' THEN
        action_type := 'created';
        changes_data := to_jsonb(NEW);
        previous_data := NULL;
    ELSIF TG_OP = 'UPDATE' THEN
        action_type := 'updated';
        changes_data := to_jsonb(NEW);
        previous_data := to_jsonb(OLD);
    ELSIF TG_OP = 'DELETE' THEN
        action_type := 'deleted';
        changes_data := NULL;
        previous_data := to_jsonb(OLD);
    END IF;
    
    INSERT INTO product_change_logs (
        product_id,
        barbershop_id,
        action,
        changes,
        previous_values,
        source,
        timestamp
    ) VALUES (
        COALESCE(NEW.id, OLD.id),
        COALESCE(NEW.barbershop_id, OLD.barbershop_id),
        action_type,
        changes_data,
        previous_data,
        'manual',
        NOW()
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger for automatic change logging
DROP TRIGGER IF EXISTS trigger_log_product_changes ON products;
CREATE TRIGGER trigger_log_product_changes
    AFTER INSERT OR UPDATE OR DELETE ON products
    FOR EACH ROW
    EXECUTE FUNCTION log_product_changes();

-- Helper views for common queries

-- View for low stock products
CREATE OR REPLACE VIEW low_stock_products AS
SELECT 
    p.*,
    'warning' as alert_level
FROM products p
WHERE p.current_stock <= p.min_stock_level 
  AND p.current_stock > 0
  AND p.is_active = true
UNION ALL
SELECT 
    p.*,
    'critical' as alert_level  
FROM products p
WHERE p.current_stock = 0 
  AND p.is_active = true;

-- View for inventory value summary
CREATE OR REPLACE VIEW inventory_value_summary AS
SELECT 
    barbershop_id,
    COUNT(*) as total_products,
    SUM(current_stock * cost_price) as total_cost_value,
    SUM(current_stock * retail_price) as total_retail_value,
    SUM(CASE WHEN current_stock <= min_stock_level THEN 1 ELSE 0 END) as low_stock_items,
    SUM(CASE WHEN current_stock = 0 THEN 1 ELSE 0 END) as out_of_stock_items
FROM products 
WHERE is_active = true
GROUP BY barbershop_id;