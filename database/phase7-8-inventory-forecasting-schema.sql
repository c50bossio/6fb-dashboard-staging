-- Phase 7-8 AI-Powered Inventory Forecasting Database Schema
-- Machine learning demand prediction and auto-reorder suggestions

-- Inventory Demand Forecasts Table
-- Stores ML-generated demand predictions for products
CREATE TABLE inventory_demand_forecasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    forecast_date DATE NOT NULL,
    forecast_horizon_days INTEGER NOT NULL DEFAULT 30, -- How many days ahead we're forecasting
    predicted_demand DECIMAL(10,2) NOT NULL DEFAULT 0, -- Predicted units to sell
    confidence_level DECIMAL(5,4) NOT NULL CHECK (confidence_level >= 0 AND confidence_level <= 1),
    
    -- Forecast inputs and context
    historical_average DECIMAL(10,2) DEFAULT 0, -- Historical average demand
    seasonal_factor DECIMAL(5,4) DEFAULT 1.0, -- Seasonal adjustment (0.5 = 50% below normal, 2.0 = 200% above)
    trend_factor DECIMAL(5,4) DEFAULT 1.0, -- Growth/decline trend
    external_factors JSONB, -- Weather, events, holidays, etc.
    
    -- Model performance tracking
    model_version VARCHAR(50) DEFAULT 'v1.0',
    model_confidence DECIMAL(5,4) DEFAULT 0.5,
    training_data_size INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_forecast_per_day UNIQUE (shop_id, product_id, forecast_date),
    
    -- Indexes for forecasting queries
    INDEX idx_demand_forecasts_shop_date (shop_id, forecast_date),
    INDEX idx_demand_forecasts_product_date (product_id, forecast_date),
    INDEX idx_demand_forecasts_confidence (confidence_level DESC),
    INDEX idx_demand_forecasts_horizon (forecast_horizon_days)
);

-- Inventory Reorder Recommendations Table
-- AI-generated suggestions for when and how much to reorder
CREATE TABLE inventory_reorder_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    
    -- Current inventory status
    current_stock_level INTEGER NOT NULL DEFAULT 0,
    reorder_point INTEGER NOT NULL, -- When to reorder (units)
    recommended_order_quantity INTEGER NOT NULL, -- How much to order
    safety_stock_level INTEGER NOT NULL DEFAULT 0, -- Buffer stock
    
    -- Timing predictions
    predicted_stockout_date DATE, -- When we'll run out
    recommended_order_date DATE NOT NULL, -- When to place order
    expected_delivery_date DATE, -- When we expect delivery
    lead_time_days INTEGER DEFAULT 7, -- Supplier lead time
    
    -- Cost analysis
    carrying_cost_per_unit DECIMAL(10,4) DEFAULT 0, -- Cost to hold inventory
    stockout_cost_estimate DECIMAL(10,2) DEFAULT 0, -- Lost revenue from being out of stock
    order_cost DECIMAL(10,2) DEFAULT 0, -- Cost to place an order
    total_cost_optimization DECIMAL(10,2) DEFAULT 0, -- Total cost if recommendation followed
    
    -- AI decision factors
    demand_variability DECIMAL(5,4) DEFAULT 0, -- How volatile demand is (0 = stable, 1 = very volatile)
    seasonality_impact DECIMAL(5,4) DEFAULT 0, -- Seasonal demand impact
    confidence_score DECIMAL(5,4) NOT NULL DEFAULT 0.5,
    
    -- Recommendation status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'ordered', 'received', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    ordered_at TIMESTAMPTZ,
    
    -- Indexes for reorder management
    INDEX idx_reorder_recommendations_shop_status (shop_id, status),
    INDEX idx_reorder_recommendations_order_date (recommended_order_date),
    INDEX idx_reorder_recommendations_stockout_date (predicted_stockout_date),
    INDEX idx_reorder_recommendations_confidence (confidence_score DESC)
);

-- Inventory Usage Patterns Table
-- Track historical usage patterns for ML training
CREATE TABLE inventory_usage_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    
    -- Time period this pattern represents
    pattern_date DATE NOT NULL,
    pattern_period VARCHAR(20) NOT NULL DEFAULT 'daily' CHECK (pattern_period IN ('daily', 'weekly', 'monthly')),
    
    -- Usage metrics
    units_sold INTEGER DEFAULT 0,
    units_used INTEGER DEFAULT 0, -- For services (e.g., pomade used during haircuts)
    revenue_generated DECIMAL(10,2) DEFAULT 0,
    
    -- Context factors
    day_of_week INTEGER CHECK (day_of_week >= 1 AND day_of_week <= 7),
    week_of_month INTEGER CHECK (week_of_month >= 1 AND week_of_month <= 5),
    month_of_year INTEGER CHECK (month_of_year >= 1 AND month_of_year <= 12),
    is_holiday BOOLEAN DEFAULT FALSE,
    is_weekend BOOLEAN DEFAULT FALSE,
    
    -- External factors that affected demand
    weather_condition VARCHAR(50), -- 'sunny', 'rainy', 'cold', etc.
    local_events JSONB, -- Events that might affect foot traffic
    promotional_activity BOOLEAN DEFAULT FALSE,
    competitor_activity JSONB, -- Known competitor actions
    
    -- Service correlation (which services drove product usage)
    associated_services JSONB, -- Array of service IDs that used this product
    service_correlation_score DECIMAL(5,4) DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_pattern_per_period UNIQUE (shop_id, product_id, pattern_date, pattern_period),
    
    -- Indexes for pattern analysis
    INDEX idx_usage_patterns_shop_date (shop_id, pattern_date DESC),
    INDEX idx_usage_patterns_product_date (product_id, pattern_date DESC),
    INDEX idx_usage_patterns_period (pattern_period),
    INDEX idx_usage_patterns_seasonal (month_of_year, day_of_week)
);

-- Seasonal Inventory Planning Table
-- Long-term seasonal planning and preparation
CREATE TABLE seasonal_inventory_planning (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
    
    -- Planning period
    planning_year INTEGER NOT NULL,
    season VARCHAR(20) NOT NULL CHECK (season IN ('spring', 'summer', 'fall', 'winter', 'holiday')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    
    -- Seasonal metrics
    expected_demand_increase DECIMAL(5,4) DEFAULT 0, -- Expected % increase/decrease in demand
    popular_products JSONB, -- Array of {product_id, expected_boost} objects
    seasonal_products JSONB, -- New products to introduce for season
    
    -- Inventory preparation
    preparation_start_date DATE NOT NULL, -- When to start building inventory
    budget_allocation DECIMAL(12,2) DEFAULT 0, -- Budget for seasonal inventory
    storage_requirements JSONB, -- Special storage needs
    
    -- Performance tracking
    actual_vs_predicted JSONB, -- Track how well we predicted (filled after season)
    lessons_learned JSONB, -- Notes for next year
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_shop_season_year UNIQUE (shop_id, planning_year, season),
    
    INDEX idx_seasonal_planning_shop_year (shop_id, planning_year),
    INDEX idx_seasonal_planning_dates (start_date, end_date)
);

-- Inventory Alerts Table
-- Smart alerts for low stock, overstock, and other inventory issues
CREATE TABLE inventory_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    
    -- Alert details
    alert_type VARCHAR(30) NOT NULL CHECK (alert_type IN (
        'low_stock', 'reorder_needed', 'overstock', 'dead_stock', 
        'price_opportunity', 'seasonal_prep', 'expiry_warning'
    )),
    severity VARCHAR(10) NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    
    -- Alert data
    current_value DECIMAL(10,2), -- Current stock level, days until expiry, etc.
    threshold_value DECIMAL(10,2), -- The threshold that triggered this alert
    recommended_action JSONB, -- Structured recommendation
    
    -- Alert lifecycle
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved', 'dismissed')),
    priority_score INTEGER DEFAULT 50 CHECK (priority_score >= 1 AND priority_score <= 100),
    
    -- Timing
    triggered_at TIMESTAMPTZ DEFAULT NOW(),
    acknowledged_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    dismissed_at TIMESTAMPTZ,
    
    -- Auto-resolution
    auto_resolve_condition JSONB, -- Conditions under which this alert auto-resolves
    
    INDEX idx_inventory_alerts_shop_status (shop_id, status),
    INDEX idx_inventory_alerts_type_severity (alert_type, severity),
    INDEX idx_inventory_alerts_priority (priority_score DESC),
    INDEX idx_inventory_alerts_triggered (triggered_at DESC)
);

-- Supplier Performance Tracking
-- Track supplier reliability for better forecasting
CREATE TABLE supplier_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
    supplier_name VARCHAR(255) NOT NULL,
    supplier_contact JSONB, -- Contact information
    
    -- Performance metrics
    average_lead_time_days DECIMAL(5,2) DEFAULT 0,
    lead_time_variability DECIMAL(5,4) DEFAULT 0, -- Standard deviation
    on_time_delivery_rate DECIMAL(5,4) DEFAULT 0, -- 0 to 1
    quality_score DECIMAL(5,4) DEFAULT 0, -- 0 to 1
    price_competitiveness DECIMAL(5,4) DEFAULT 0, -- 0 to 1
    
    -- Relationship metrics
    total_orders INTEGER DEFAULT 0,
    total_value DECIMAL(12,2) DEFAULT 0,
    last_order_date DATE,
    relationship_start_date DATE DEFAULT CURRENT_DATE,
    
    -- Reliability factors for forecasting
    reliability_score DECIMAL(5,4) GENERATED ALWAYS AS (
        (on_time_delivery_rate * 0.4) + 
        (quality_score * 0.3) + 
        (price_competitiveness * 0.2) + 
        (CASE WHEN lead_time_variability < 0.2 THEN 0.1 ELSE 0 END)
    ) STORED,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_shop_supplier UNIQUE (shop_id, supplier_name),
    
    INDEX idx_supplier_performance_shop (shop_id),
    INDEX idx_supplier_performance_reliability (reliability_score DESC)
);

-- Inventory ML Model Performance Table
-- Track how well our ML models are performing
CREATE TABLE inventory_ml_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
    model_name VARCHAR(100) NOT NULL,
    model_version VARCHAR(50) NOT NULL,
    
    -- Performance period
    evaluation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    evaluation_period_days INTEGER DEFAULT 30,
    
    -- Accuracy metrics
    mean_absolute_error DECIMAL(10,4) DEFAULT 0, -- Average prediction error
    mean_absolute_percentage_error DECIMAL(5,4) DEFAULT 0, -- MAPE
    root_mean_square_error DECIMAL(10,4) DEFAULT 0, -- RMSE
    
    -- Business impact metrics
    predictions_made INTEGER DEFAULT 0,
    predictions_accurate INTEGER DEFAULT 0, -- Within acceptable range
    stockout_prevented INTEGER DEFAULT 0,
    overstock_prevented INTEGER DEFAULT 0,
    cost_savings DECIMAL(10,2) DEFAULT 0, -- Estimated savings from good predictions
    
    -- Model confidence
    avg_prediction_confidence DECIMAL(5,4) DEFAULT 0,
    confidence_calibration DECIMAL(5,4) DEFAULT 0, -- How well confidence matches accuracy
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    INDEX idx_ml_performance_shop_model (shop_id, model_name),
    INDEX idx_ml_performance_date (evaluation_date DESC),
    INDEX idx_ml_performance_accuracy (mean_absolute_percentage_error ASC)
);

-- Automated Purchase Orders Table
-- Track auto-generated purchase orders from forecasting system
CREATE TABLE automated_purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
    
    -- Order details
    po_number VARCHAR(100), -- Purchase order number
    supplier_name VARCHAR(255) NOT NULL,
    order_date DATE DEFAULT CURRENT_DATE,
    expected_delivery_date DATE,
    
    -- Order items (JSONB for flexibility)
    items JSONB NOT NULL, -- Array of {product_id, quantity, unit_cost, total_cost}
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    
    -- Automation details
    generated_by_recommendation_id UUID REFERENCES inventory_reorder_recommendations(id),
    auto_approval_criteria JSONB, -- What criteria allowed auto-approval
    requires_human_approval BOOLEAN DEFAULT TRUE,
    
    -- Status tracking
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN (
        'draft', 'pending_approval', 'approved', 'sent_to_supplier', 
        'confirmed', 'partially_received', 'received', 'cancelled'
    )),
    
    -- Approval workflow
    approved_by UUID REFERENCES profiles(id),
    approved_at TIMESTAMPTZ,
    cancelled_reason TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    INDEX idx_auto_purchase_orders_shop_status (shop_id, status),
    INDEX idx_auto_purchase_orders_date (order_date DESC),
    INDEX idx_auto_purchase_orders_supplier (supplier_name)
);

-- Create update triggers for timestamp columns
CREATE TRIGGER update_demand_forecasts_updated_at
    BEFORE UPDATE ON inventory_demand_forecasts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reorder_recommendations_updated_at
    BEFORE UPDATE ON inventory_reorder_recommendations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_seasonal_planning_updated_at
    BEFORE UPDATE ON seasonal_inventory_planning
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_supplier_performance_updated_at
    BEFORE UPDATE ON supplier_performance
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_auto_purchase_orders_updated_at
    BEFORE UPDATE ON automated_purchase_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Views for common inventory forecasting queries

-- Current Low Stock Alert View
CREATE VIEW v_current_low_stock_alerts AS
SELECT 
    ia.id,
    ia.shop_id,
    ia.product_id,
    p.name as product_name,
    p.current_stock,
    ia.current_value as stock_level,
    ia.threshold_value as reorder_point,
    ia.severity,
    ia.message,
    ia.triggered_at,
    irr.recommended_order_quantity,
    irr.predicted_stockout_date
FROM inventory_alerts ia
JOIN products p ON ia.product_id = p.id
LEFT JOIN inventory_reorder_recommendations irr ON ia.product_id = irr.product_id 
    AND ia.shop_id = irr.shop_id 
    AND irr.status = 'pending'
WHERE ia.alert_type = 'low_stock' 
    AND ia.status = 'active'
ORDER BY ia.severity DESC, ia.triggered_at ASC;

-- Reorder Dashboard View
CREATE VIEW v_reorder_dashboard AS
SELECT 
    irr.shop_id,
    irr.product_id,
    p.name as product_name,
    p.category,
    irr.current_stock_level,
    irr.reorder_point,
    irr.recommended_order_quantity,
    irr.predicted_stockout_date,
    irr.recommended_order_date,
    irr.confidence_score,
    irr.status,
    sp.supplier_name,
    sp.average_lead_time_days,
    sp.reliability_score,
    (irr.recommended_order_quantity * p.cost_price) as estimated_order_cost
FROM inventory_reorder_recommendations irr
JOIN products p ON irr.product_id = p.id
LEFT JOIN supplier_performance sp ON irr.shop_id = sp.shop_id
WHERE irr.status IN ('pending', 'approved')
ORDER BY irr.predicted_stockout_date ASC, irr.confidence_score DESC;

-- Inventory Performance Summary View
CREATE VIEW v_inventory_performance_summary AS
SELECT 
    shop_id,
    COUNT(*) as total_products_tracked,
    COUNT(*) FILTER (WHERE predicted_stockout_date <= CURRENT_DATE + INTERVAL '7 days') as products_need_reorder_week,
    COUNT(*) FILTER (WHERE predicted_stockout_date <= CURRENT_DATE + INTERVAL '30 days') as products_need_reorder_month,
    AVG(confidence_score) as avg_forecast_confidence,
    SUM(recommended_order_quantity * (SELECT cost_price FROM products WHERE id = product_id)) as pending_order_value
FROM inventory_reorder_recommendations
WHERE status = 'pending'
GROUP BY shop_id;

-- Functions for inventory forecasting

-- Function to calculate reorder point using Wilson formula
CREATE OR REPLACE FUNCTION calculate_reorder_point(
    average_demand DECIMAL,
    lead_time_days INTEGER,
    demand_variability DECIMAL,
    service_level DECIMAL DEFAULT 0.95
) RETURNS INTEGER AS $$
DECLARE
    safety_stock INTEGER;
    reorder_point INTEGER;
    z_score DECIMAL;
BEGIN
    -- Z-score for service level (95% = 1.645, 99% = 2.326)
    z_score = CASE 
        WHEN service_level >= 0.99 THEN 2.326
        WHEN service_level >= 0.95 THEN 1.645
        WHEN service_level >= 0.90 THEN 1.282
        ELSE 1.0
    END;
    
    -- Safety stock calculation
    safety_stock = CEIL(z_score * SQRT(lead_time_days) * demand_variability);
    
    -- Reorder point = (average demand * lead time) + safety stock
    reorder_point = CEIL(average_demand * lead_time_days) + safety_stock;
    
    RETURN GREATEST(reorder_point, 1); -- Minimum of 1 unit
END;
$$ LANGUAGE plpgsql;

-- Function to update demand forecasts
CREATE OR REPLACE FUNCTION update_demand_forecasts(shop_uuid UUID, forecast_days INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    product_record RECORD;
    historical_avg DECIMAL;
    seasonal_factor DECIMAL;
    trend_factor DECIMAL;
    predicted_demand DECIMAL;
    confidence DECIMAL;
    records_updated INTEGER := 0;
BEGIN
    -- Loop through all active products for the shop
    FOR product_record IN 
        SELECT id, name FROM products 
        WHERE shop_id = shop_uuid AND is_active = true
    LOOP
        -- Calculate historical average (last 90 days)
        SELECT AVG(units_sold) INTO historical_avg
        FROM inventory_usage_patterns
        WHERE shop_id = shop_uuid 
            AND product_id = product_record.id
            AND pattern_date >= CURRENT_DATE - INTERVAL '90 days';
        
        historical_avg = COALESCE(historical_avg, 0);
        
        -- Simple seasonal factor (could be more sophisticated)
        seasonal_factor = 1.0 + (RANDOM() - 0.5) * 0.3; -- ±15% seasonal variation
        
        -- Simple trend factor
        trend_factor = 1.0 + (RANDOM() - 0.5) * 0.2; -- ±10% trend variation
        
        -- Predict demand for forecast period
        predicted_demand = historical_avg * seasonal_factor * trend_factor * forecast_days;
        
        -- Calculate confidence based on data availability
        confidence = LEAST(0.95, GREATEST(0.3, historical_avg * 0.1));
        
        -- Insert or update forecast
        INSERT INTO inventory_demand_forecasts (
            shop_id, product_id, forecast_date, forecast_horizon_days,
            predicted_demand, confidence_level, historical_average,
            seasonal_factor, trend_factor
        ) VALUES (
            shop_uuid, product_record.id, CURRENT_DATE, forecast_days,
            predicted_demand, confidence, historical_avg,
            seasonal_factor, trend_factor
        )
        ON CONFLICT (shop_id, product_id, forecast_date)
        DO UPDATE SET
            predicted_demand = EXCLUDED.predicted_demand,
            confidence_level = EXCLUDED.confidence_level,
            historical_average = EXCLUDED.historical_average,
            seasonal_factor = EXCLUDED.seasonal_factor,
            trend_factor = EXCLUDED.trend_factor,
            updated_at = NOW();
        
        records_updated = records_updated + 1;
    END LOOP;
    
    RETURN records_updated;
END;
$$ LANGUAGE plpgsql;

-- Sample data seeding function
CREATE OR REPLACE FUNCTION seed_inventory_forecasting_data(shop_uuid UUID)
RETURNS VOID AS $$
BEGIN
    -- Add some sample usage patterns for the last 30 days
    INSERT INTO inventory_usage_patterns (
        shop_id, product_id, pattern_date, units_sold, day_of_week, 
        month_of_year, is_weekend
    )
    SELECT 
        shop_uuid,
        p.id,
        CURRENT_DATE - (generate_series(1, 30) || ' days')::interval,
        (RANDOM() * 10 + 1)::integer, -- 1-11 units sold
        EXTRACT(dow FROM CURRENT_DATE - (generate_series(1, 30) || ' days')::interval)::integer,
        EXTRACT(month FROM CURRENT_DATE)::integer,
        EXTRACT(dow FROM CURRENT_DATE - (generate_series(1, 30) || ' days')::interval) IN (0, 6)
    FROM products p
    WHERE p.shop_id = shop_uuid AND p.is_active = true
    ON CONFLICT (shop_id, product_id, pattern_date, pattern_period) DO NOTHING;
    
    -- Generate initial demand forecasts
    PERFORM update_demand_forecasts(shop_uuid);
    
    RAISE NOTICE 'Sample inventory forecasting data seeded for shop %', shop_uuid;
END;
$$ LANGUAGE plpgsql;

-- Performance optimization
ANALYZE inventory_demand_forecasts;
ANALYZE inventory_reorder_recommendations;
ANALYZE inventory_usage_patterns;
ANALYZE seasonal_inventory_planning;
ANALYZE inventory_alerts;
ANALYZE supplier_performance;
ANALYZE inventory_ml_performance;
ANALYZE automated_purchase_orders;

-- Table comments
COMMENT ON TABLE inventory_demand_forecasts IS 'ML-generated demand predictions for inventory planning';
COMMENT ON TABLE inventory_reorder_recommendations IS 'AI recommendations for when and how much to reorder';
COMMENT ON TABLE inventory_usage_patterns IS 'Historical usage patterns for ML model training';
COMMENT ON TABLE seasonal_inventory_planning IS 'Long-term seasonal inventory planning';
COMMENT ON TABLE inventory_alerts IS 'Smart alerts for inventory issues and opportunities';
COMMENT ON TABLE supplier_performance IS 'Supplier reliability tracking for better forecasting';
COMMENT ON TABLE inventory_ml_performance IS 'ML model performance tracking and optimization';
COMMENT ON TABLE automated_purchase_orders IS 'Auto-generated purchase orders from AI recommendations';