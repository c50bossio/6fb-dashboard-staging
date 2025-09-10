-- =====================================================
-- INVENTORY TABLE SCHEMA FOR 6FB AI AGENT SYSTEM
-- =====================================================
-- Based on mock data analysis from app/dashboard/inventory/page.js
-- Supports: Inventory management, stock tracking, reorder automation

-- Create product categories enum
CREATE TYPE product_category AS ENUM (
    'hair_products',
    'tools', 
    'consumables',
    'retail',
    'supplies'
);

-- Create inventory status enum
CREATE TYPE inventory_status AS ENUM (
    'good',
    'low',
    'critical',
    'out_of_stock',
    'discontinued'
);

-- Create inventory table
CREATE TABLE IF NOT EXISTS inventory (
    -- Primary identification
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Product identification
    name TEXT NOT NULL,
    sku TEXT UNIQUE NOT NULL,
    barcode TEXT UNIQUE,
    brand TEXT NOT NULL,
    category product_category NOT NULL,
    
    -- Stock management
    current_stock INTEGER NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
    min_stock INTEGER NOT NULL DEFAULT 0 CHECK (min_stock >= 0),
    max_stock INTEGER NOT NULL DEFAULT 100 CHECK (max_stock >= min_stock),
    reserved_stock INTEGER NOT NULL DEFAULT 0 CHECK (reserved_stock >= 0),
    available_stock INTEGER GENERATED ALWAYS AS (current_stock - reserved_stock) STORED,
    
    -- Stock status (computed)
    status inventory_status NOT NULL DEFAULT 'good',
    
    -- Pricing information
    unit_cost DECIMAL(10,2) NOT NULL DEFAULT 0.00 CHECK (unit_cost >= 0),
    retail_price DECIMAL(10,2) CHECK (retail_price >= 0),
    markup_percentage DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN unit_cost > 0 AND retail_price IS NOT NULL 
            THEN ROUND(((retail_price - unit_cost) / unit_cost * 100), 2)
            ELSE NULL
        END
    ) STORED,
    
    -- Supplier information
    supplier TEXT NOT NULL,
    supplier_sku TEXT,
    supplier_contact TEXT,
    
    -- Usage and ordering
    usage_rate DECIMAL(8,2) DEFAULT 0.0, -- units per week
    reorder_quantity INTEGER DEFAULT 0,
    lead_time_days INTEGER DEFAULT 7,
    
    -- Order history
    last_ordered DATE,
    last_received DATE,
    last_order_quantity INTEGER,
    
    -- Storage and location
    location TEXT,
    storage_requirements TEXT,
    
    -- Product details
    description TEXT,
    specifications JSONB DEFAULT '{}',
    expiration_date DATE,
    batch_number TEXT,
    
    -- Active status
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_retail BOOLEAN NOT NULL DEFAULT false, -- Can be sold to customers
    
    -- System fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- =====================================================
-- STOCK MOVEMENT TRACKING TABLE
-- =====================================================

CREATE TYPE stock_movement_type AS ENUM (
    'purchase',      -- Received from supplier
    'sale',          -- Sold to customer (retail)
    'usage',         -- Used in service
    'adjustment',    -- Manual stock adjustment
    'waste',         -- Damaged/expired/wasted
    'transfer',      -- Transfer between locations
    'return'         -- Return to supplier
);

CREATE TABLE IF NOT EXISTS stock_movements (
    -- Primary identification
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Inventory reference
    inventory_id UUID NOT NULL REFERENCES inventory(id),
    
    -- Movement details
    movement_type stock_movement_type NOT NULL,
    quantity INTEGER NOT NULL, -- Positive for additions, negative for reductions
    unit_cost DECIMAL(10,2),
    
    -- Reference information
    reference_id UUID, -- Order ID, appointment ID, etc.
    reference_type TEXT, -- 'order', 'appointment', 'adjustment', etc.
    
    -- Movement metadata
    reason TEXT,
    notes TEXT,
    batch_number TEXT,
    
    -- Timestamps
    movement_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- =====================================================
-- REORDER SUGGESTIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS reorder_suggestions (
    -- Primary identification
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Inventory reference
    inventory_id UUID NOT NULL REFERENCES inventory(id),
    
    -- Suggestion details
    suggested_quantity INTEGER NOT NULL,
    priority TEXT NOT NULL DEFAULT 'medium' 
        CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    estimated_stock_out_date DATE,
    
    -- Suggestion status
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'ordered', 'cancelled')),
    
    -- Order information (when approved)
    ordered_quantity INTEGER,
    order_date DATE,
    expected_delivery_date DATE,
    
    -- System fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- =====================================================

-- Primary lookup indexes
CREATE INDEX IF NOT EXISTS idx_inventory_sku ON inventory(sku) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_inventory_barcode ON inventory(barcode) WHERE barcode IS NOT NULL AND is_active = true;
CREATE INDEX IF NOT EXISTS idx_inventory_name_trgm ON inventory USING gin(name gin_trgm_ops) WHERE is_active = true;

-- Category and filtering indexes
CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory(category) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_inventory_status ON inventory(status) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_inventory_supplier ON inventory(supplier) WHERE is_active = true;

-- Stock management indexes
CREATE INDEX IF NOT EXISTS idx_inventory_current_stock ON inventory(current_stock) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_inventory_status_stock ON inventory(status, current_stock) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_inventory_low_stock ON inventory(current_stock, min_stock) 
    WHERE is_active = true AND current_stock <= min_stock;

-- Retail and pricing indexes
CREATE INDEX IF NOT EXISTS idx_inventory_retail ON inventory(is_retail) WHERE is_active = true AND is_retail = true;
CREATE INDEX IF NOT EXISTS idx_inventory_retail_price ON inventory(retail_price) 
    WHERE is_active = true AND retail_price IS NOT NULL;

-- Usage and reorder indexes
CREATE INDEX IF NOT EXISTS idx_inventory_usage_rate ON inventory(usage_rate DESC) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_inventory_last_ordered ON inventory(last_ordered) WHERE is_active = true;

-- Stock movements indexes
CREATE INDEX IF NOT EXISTS idx_stock_movements_inventory_id ON stock_movements(inventory_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(movement_date DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_reference ON stock_movements(reference_type, reference_id) 
    WHERE reference_id IS NOT NULL;

-- Reorder suggestions indexes
CREATE INDEX IF NOT EXISTS idx_reorder_suggestions_inventory_id ON reorder_suggestions(inventory_id);
CREATE INDEX IF NOT EXISTS idx_reorder_suggestions_status ON reorder_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_reorder_suggestions_priority ON reorder_suggestions(priority);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE reorder_suggestions ENABLE ROW LEVEL SECURITY;

-- Inventory policies
CREATE POLICY "Staff can view inventory" ON inventory
    FOR SELECT 
    USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can create inventory items" ON inventory
    FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Staff can update inventory" ON inventory
    FOR UPDATE 
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Stock movements policies
CREATE POLICY "Staff can view stock movements" ON stock_movements
    FOR SELECT 
    USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can create stock movements" ON stock_movements
    FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

-- Reorder suggestions policies  
CREATE POLICY "Staff can view reorder suggestions" ON reorder_suggestions
    FOR SELECT 
    USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can create reorder suggestions" ON reorder_suggestions
    FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Managers can approve reorder suggestions" ON reorder_suggestions
    FOR UPDATE 
    USING (
        auth.role() = 'authenticated'
        AND (
            auth.jwt() ->> 'user_role' IN ('admin', 'manager')
            OR auth.jwt() ->> 'role' IN ('admin', 'manager')
        )
    )
    WITH CHECK (
        auth.role() = 'authenticated'
        AND (
            auth.jwt() ->> 'user_role' IN ('admin', 'manager')
            OR auth.jwt() ->> 'role' IN ('admin', 'manager')
        )
    );

-- =====================================================
-- TRIGGERS FOR AUTOMATIC STOCK STATUS UPDATES
-- =====================================================

-- Function to update stock status based on current levels
CREATE OR REPLACE FUNCTION update_inventory_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Update status based on stock levels
    IF NEW.current_stock <= 0 THEN
        NEW.status = 'out_of_stock';
    ELSIF NEW.current_stock <= (NEW.min_stock * 0.5) THEN
        NEW.status = 'critical';
    ELSIF NEW.current_stock <= NEW.min_stock THEN
        NEW.status = 'low';
    ELSE
        NEW.status = 'good';
    END IF;
    
    NEW.updated_at = now();
    NEW.updated_by = auth.uid();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically update status
CREATE TRIGGER trigger_inventory_status_update
    BEFORE UPDATE OF current_stock ON inventory
    FOR EACH ROW
    EXECUTE FUNCTION update_inventory_status();

-- Function to create stock movement on inventory updates
CREATE OR REPLACE FUNCTION create_stock_movement()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create movement if current_stock changed
    IF NEW.current_stock != OLD.current_stock THEN
        INSERT INTO stock_movements (
            inventory_id,
            movement_type,
            quantity,
            reason,
            created_by
        ) VALUES (
            NEW.id,
            'adjustment',
            NEW.current_stock - OLD.current_stock,
            'Stock level adjustment',
            auth.uid()
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create stock movement
CREATE TRIGGER trigger_create_stock_movement
    AFTER UPDATE OF current_stock ON inventory
    FOR EACH ROW
    EXECUTE FUNCTION create_stock_movement();

-- =====================================================
-- VIEWS FOR INVENTORY ANALYTICS
-- =====================================================

-- View: Low stock items requiring reorder
CREATE OR REPLACE VIEW low_stock_items AS
SELECT 
    i.*,
    (i.max_stock - i.current_stock) as suggested_reorder_quantity,
    CASE 
        WHEN i.usage_rate > 0 
        THEN ROUND(i.current_stock / i.usage_rate, 1)
        ELSE NULL
    END as weeks_of_stock_remaining,
    CASE 
        WHEN i.usage_rate > 0 
        THEN CURRENT_DATE + INTERVAL '1 week' * (i.current_stock / i.usage_rate)
        ELSE NULL
    END as estimated_stock_out_date
FROM inventory i
WHERE i.is_active = true 
    AND i.status IN ('low', 'critical', 'out_of_stock')
ORDER BY 
    CASE i.status 
        WHEN 'out_of_stock' THEN 1
        WHEN 'critical' THEN 2 
        WHEN 'low' THEN 3
    END,
    i.current_stock ASC;

-- View: Inventory value summary
CREATE OR REPLACE VIEW inventory_value_summary AS
SELECT 
    category,
    COUNT(*) as item_count,
    SUM(current_stock) as total_units,
    ROUND(SUM(current_stock * unit_cost), 2) as total_cost_value,
    ROUND(SUM(CASE WHEN retail_price IS NOT NULL THEN current_stock * retail_price ELSE 0 END), 2) as total_retail_value,
    COUNT(CASE WHEN status = 'low' THEN 1 END) as low_stock_count,
    COUNT(CASE WHEN status = 'critical' THEN 1 END) as critical_stock_count,
    COUNT(CASE WHEN status = 'out_of_stock' THEN 1 END) as out_of_stock_count
FROM inventory
WHERE is_active = true
GROUP BY category
ORDER BY total_cost_value DESC;

-- View: Top selling retail products
CREATE OR REPLACE VIEW top_retail_products AS
SELECT 
    i.id,
    i.name,
    i.brand,
    i.retail_price,
    i.current_stock,
    COALESCE(sales.total_sold, 0) as units_sold_30_days,
    COALESCE(sales.revenue, 0) as revenue_30_days,
    ROUND(i.markup_percentage, 1) as markup_percentage
FROM inventory i
LEFT JOIN (
    SELECT 
        inventory_id,
        SUM(ABS(quantity)) as total_sold,
        SUM(ABS(quantity) * COALESCE(unit_cost, 0)) as revenue
    FROM stock_movements
    WHERE movement_type = 'sale' 
        AND movement_date >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY inventory_id
) sales ON i.id = sales.inventory_id
WHERE i.is_active = true 
    AND i.is_retail = true
ORDER BY COALESCE(sales.total_sold, 0) DESC
LIMIT 20;

-- View: Supplier performance
CREATE OR REPLACE VIEW supplier_performance AS
SELECT 
    supplier,
    COUNT(*) as products_supplied,
    COUNT(CASE WHEN status IN ('low', 'critical', 'out_of_stock') THEN 1 END) as low_stock_products,
    AVG(lead_time_days) as avg_lead_time,
    ROUND(SUM(current_stock * unit_cost), 2) as total_inventory_value,
    MAX(last_ordered) as last_order_date
FROM inventory
WHERE is_active = true
GROUP BY supplier
ORDER BY total_inventory_value DESC;

-- =====================================================
-- FUNCTIONS FOR INVENTORY MANAGEMENT
-- =====================================================

-- Function to adjust stock levels
CREATE OR REPLACE FUNCTION adjust_stock(
    p_inventory_id UUID,
    p_quantity INTEGER,
    p_movement_type stock_movement_type DEFAULT 'adjustment',
    p_reason TEXT DEFAULT NULL,
    p_unit_cost DECIMAL(10,2) DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    v_current_stock INTEGER;
BEGIN
    -- Get current stock
    SELECT current_stock INTO v_current_stock
    FROM inventory
    WHERE id = p_inventory_id AND is_active = true;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Inventory item not found or inactive';
    END IF;
    
    -- Check for negative stock after adjustment
    IF v_current_stock + p_quantity < 0 THEN
        RAISE EXCEPTION 'Insufficient stock. Current: %, Requested: %', v_current_stock, p_quantity;
    END IF;
    
    -- Update inventory stock
    UPDATE inventory
    SET current_stock = current_stock + p_quantity
    WHERE id = p_inventory_id;
    
    -- Create stock movement record
    INSERT INTO stock_movements (
        inventory_id,
        movement_type,
        quantity,
        unit_cost,
        reason,
        created_by
    ) VALUES (
        p_inventory_id,
        p_movement_type,
        p_quantity,
        p_unit_cost,
        p_reason,
        auth.uid()
    );
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate reorder suggestions
CREATE OR REPLACE FUNCTION generate_reorder_suggestions()
RETURNS INTEGER AS $$
DECLARE
    v_item RECORD;
    v_suggestion_count INTEGER := 0;
    v_suggested_quantity INTEGER;
    v_estimated_stockout DATE;
BEGIN
    -- Clear existing pending suggestions
    DELETE FROM reorder_suggestions WHERE status = 'pending';
    
    -- Generate new suggestions for low stock items
    FOR v_item IN 
        SELECT * FROM inventory 
        WHERE is_active = true 
            AND status IN ('low', 'critical', 'out_of_stock')
    LOOP
        -- Calculate suggested quantity (bring to max stock)
        v_suggested_quantity := v_item.max_stock - v_item.current_stock;
        
        -- Calculate estimated stockout date
        IF v_item.usage_rate > 0 THEN
            v_estimated_stockout := CURRENT_DATE + 
                INTERVAL '1 week' * (v_item.current_stock / v_item.usage_rate);
        ELSE
            v_estimated_stockout := CURRENT_DATE + INTERVAL '30 days';
        END IF;
        
        -- Insert suggestion
        INSERT INTO reorder_suggestions (
            inventory_id,
            suggested_quantity,
            priority,
            estimated_stock_out_date
        ) VALUES (
            v_item.id,
            v_suggested_quantity,
            CASE 
                WHEN v_item.status = 'out_of_stock' THEN 'urgent'
                WHEN v_item.status = 'critical' THEN 'high'
                ELSE 'medium'
            END,
            v_estimated_stockout
        );
        
        v_suggestion_count := v_suggestion_count + 1;
    END LOOP;
    
    RETURN v_suggestion_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE inventory IS 'Inventory management and stock tracking for 6FB barbershop system';
COMMENT ON COLUMN inventory.available_stock IS 'Current stock minus reserved stock (computed)';
COMMENT ON COLUMN inventory.markup_percentage IS 'Retail markup percentage over unit cost (computed)';
COMMENT ON TABLE stock_movements IS 'Historical record of all stock level changes';
COMMENT ON TABLE reorder_suggestions IS 'System-generated reorder recommendations';
COMMENT ON VIEW low_stock_items IS 'Items requiring reorder with suggested quantities and timing';
COMMENT ON VIEW inventory_value_summary IS 'Financial summary of inventory by category';
COMMENT ON VIEW top_retail_products IS 'Best selling retail products with performance metrics';
COMMENT ON VIEW supplier_performance IS 'Supplier evaluation metrics and performance summary';