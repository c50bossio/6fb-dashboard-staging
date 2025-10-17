-- Phase 7-8 Cross-Selling Intelligence Database Schema
-- Week 1 Day 1-2: Foundation & Cross-Selling Database Extensions

-- Product Affinities Table
-- Tracks which products are commonly purchased together
CREATE TABLE product_affinities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_a_id UUID REFERENCES products(id) ON DELETE CASCADE,
    product_b_id UUID REFERENCES products(id) ON DELETE CASCADE,
    affinity_score DECIMAL(5,4) NOT NULL CHECK (affinity_score >= 0 AND affinity_score <= 1),
    confidence_level INTEGER NOT NULL CHECK (confidence_level >= 0 AND confidence_level <= 100),
    shop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
    sample_size INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure products are different and avoid duplicate pairs
    CONSTRAINT different_products CHECK (product_a_id != product_b_id),
    CONSTRAINT unique_product_pair UNIQUE (shop_id, product_a_id, product_b_id),
    
    -- Index for fast lookups
    INDEX idx_product_affinities_shop_product_a (shop_id, product_a_id),
    INDEX idx_product_affinities_shop_product_b (shop_id, product_b_id),
    INDEX idx_product_affinities_score (affinity_score DESC),
    INDEX idx_product_affinities_updated (updated_at DESC)
);

-- Cross-Sell Analytics Table
-- Tracks the performance of cross-selling suggestions
CREATE TABLE cross_sell_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
    suggested_product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    anchor_product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    suggestion_shown_at TIMESTAMPTZ DEFAULT NOW(),
    customer_action VARCHAR(20) NOT NULL DEFAULT 'ignored' 
        CHECK (customer_action IN ('accepted', 'declined', 'ignored', 'viewed', 'dismissed')),
    revenue_impact DECIMAL(10,2) DEFAULT 0.00,
    suggestion_context JSONB, -- Store context like service type, time of day, etc.
    confidence_score DECIMAL(5,4), -- AI confidence in the suggestion
    suggestion_rank INTEGER DEFAULT 1, -- Position in suggestion list
    response_time_seconds INTEGER, -- How quickly customer responded
    
    -- Indexes for analytics queries
    INDEX idx_cross_sell_shop_date (shop_id, suggestion_shown_at DESC),
    INDEX idx_cross_sell_product_performance (suggested_product_id, customer_action),
    INDEX idx_cross_sell_customer_behavior (customer_id, customer_action),
    INDEX idx_cross_sell_revenue_impact (revenue_impact DESC),
    INDEX idx_cross_sell_confidence (confidence_score DESC)
);

-- Service Product Affinities Table
-- Tracks which products are commonly purchased with specific services
CREATE TABLE service_product_affinities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID REFERENCES services(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    shop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
    affinity_score DECIMAL(5,4) NOT NULL CHECK (affinity_score >= 0 AND affinity_score <= 1),
    purchase_frequency DECIMAL(5,4) NOT NULL DEFAULT 0, -- What % of this service leads to this product
    average_purchase_value DECIMAL(10,2) NOT NULL DEFAULT 0,
    sample_size INTEGER NOT NULL DEFAULT 0,
    seasonal_factor DECIMAL(3,2) DEFAULT 1.0, -- Seasonal adjustment multiplier
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_service_product UNIQUE (shop_id, service_id, product_id),
    
    -- Indexes for cross-selling queries
    INDEX idx_service_product_shop_service (shop_id, service_id),
    INDEX idx_service_product_score (affinity_score DESC),
    INDEX idx_service_product_frequency (purchase_frequency DESC),
    INDEX idx_service_product_value (average_purchase_value DESC)
);

-- Customer Purchase Patterns Table
-- Enhanced customer behavior tracking for personalized recommendations
CREATE TABLE customer_purchase_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    shop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
    product_category VARCHAR(100),
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    purchase_frequency INTEGER DEFAULT 0, -- Times purchased
    last_purchase_date TIMESTAMPTZ,
    average_purchase_interval_days INTEGER, -- Days between purchases
    preferred_price_range DECIMAL(10,2)[2], -- [min, max] price range
    seasonal_preferences JSONB, -- Month/season purchase patterns
    cross_sell_receptivity DECIMAL(3,2) DEFAULT 0.5, -- How likely to accept suggestions (0-1)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_customer_product UNIQUE (customer_id, shop_id, product_id),
    
    -- Indexes for customer analysis
    INDEX idx_customer_patterns_customer (customer_id),
    INDEX idx_customer_patterns_shop (shop_id),
    INDEX idx_customer_patterns_category (product_category),
    INDEX idx_customer_patterns_frequency (purchase_frequency DESC),
    INDEX idx_customer_patterns_receptivity (cross_sell_receptivity DESC)
);

-- Cross-Sell Campaign Performance Table
-- Track A/B tests and campaign effectiveness
CREATE TABLE cross_sell_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
    campaign_name VARCHAR(255) NOT NULL,
    campaign_type VARCHAR(50) NOT NULL DEFAULT 'product_affinity' 
        CHECK (campaign_type IN ('product_affinity', 'service_upsell', 'seasonal', 'customer_segment', 'ab_test')),
    target_criteria JSONB, -- Targeting rules and conditions
    suggestion_logic JSONB, -- Algorithm configuration
    start_date TIMESTAMPTZ DEFAULT NOW(),
    end_date TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    
    -- Performance metrics
    total_suggestions INTEGER DEFAULT 0,
    total_acceptances INTEGER DEFAULT 0,
    total_revenue DECIMAL(12,2) DEFAULT 0,
    conversion_rate DECIMAL(5,4) GENERATED ALWAYS AS (
        CASE 
            WHEN total_suggestions > 0 THEN total_acceptances::decimal / total_suggestions
            ELSE 0
        END
    ) STORED,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    INDEX idx_cross_sell_campaigns_shop_active (shop_id, is_active),
    INDEX idx_cross_sell_campaigns_performance (conversion_rate DESC),
    INDEX idx_cross_sell_campaigns_revenue (total_revenue DESC),
    INDEX idx_cross_sell_campaigns_dates (start_date, end_date)
);

-- Real-time Cross-Sell Queue Table
-- Temporary storage for POS suggestions during checkout
CREATE TABLE cross_sell_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
    session_id VARCHAR(255) NOT NULL, -- POS session identifier
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    current_cart_items JSONB NOT NULL, -- Current items in cart/appointment
    suggested_products JSONB NOT NULL, -- AI-generated suggestions with scores
    context_data JSONB, -- Service type, time of day, customer history, etc.
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 minutes'),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    INDEX idx_cross_sell_queue_session (session_id),
    INDEX idx_cross_sell_queue_shop_customer (shop_id, customer_id),
    INDEX idx_cross_sell_queue_expires (expires_at)
);

-- Create a cleanup function for expired queue items
CREATE OR REPLACE FUNCTION cleanup_expired_cross_sell_queue()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM cross_sell_queue WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Triggers for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update triggers to all relevant tables
CREATE TRIGGER update_product_affinities_updated_at
    BEFORE UPDATE ON product_affinities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_service_product_affinities_updated_at
    BEFORE UPDATE ON service_product_affinities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_purchase_patterns_updated_at
    BEFORE UPDATE ON customer_purchase_patterns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cross_sell_campaigns_updated_at
    BEFORE UPDATE ON cross_sell_campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Views for common queries

-- Top Product Affinities by Shop
CREATE VIEW v_top_product_affinities AS
SELECT 
    pa.shop_id,
    pa.product_a_id,
    p1.name as product_a_name,
    pa.product_b_id,
    p2.name as product_b_name,
    pa.affinity_score,
    pa.confidence_level,
    pa.sample_size,
    pa.updated_at
FROM product_affinities pa
JOIN products p1 ON pa.product_a_id = p1.id
JOIN products p2 ON pa.product_b_id = p2.id
WHERE pa.affinity_score >= 0.3 AND pa.confidence_level >= 70
ORDER BY pa.shop_id, pa.affinity_score DESC;

-- Cross-Sell Performance Summary
CREATE VIEW v_cross_sell_performance AS
SELECT 
    shop_id,
    DATE(suggestion_shown_at) as suggestion_date,
    COUNT(*) as total_suggestions,
    COUNT(*) FILTER (WHERE customer_action = 'accepted') as acceptances,
    COUNT(*) FILTER (WHERE customer_action = 'declined') as declines,
    COUNT(*) FILTER (WHERE customer_action = 'ignored') as ignored,
    ROUND(
        COUNT(*) FILTER (WHERE customer_action = 'accepted')::decimal / 
        NULLIF(COUNT(*), 0) * 100, 2
    ) as conversion_rate_percent,
    SUM(revenue_impact) as total_revenue_impact,
    AVG(confidence_score) as avg_confidence_score
FROM cross_sell_analytics
WHERE suggestion_shown_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY shop_id, DATE(suggestion_shown_at)
ORDER BY shop_id, suggestion_date DESC;

-- Customer Receptivity Analysis
CREATE VIEW v_customer_receptivity AS
SELECT 
    cpp.shop_id,
    cpp.customer_id,
    c.name as customer_name,
    cpp.cross_sell_receptivity,
    COUNT(csa.id) as total_suggestions_received,
    COUNT(csa.id) FILTER (WHERE csa.customer_action = 'accepted') as suggestions_accepted,
    SUM(csa.revenue_impact) as total_revenue_contributed
FROM customer_purchase_patterns cpp
LEFT JOIN customers c ON cpp.customer_id = c.id
LEFT JOIN cross_sell_analytics csa ON cpp.customer_id = csa.customer_id 
    AND csa.suggestion_shown_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY cpp.shop_id, cpp.customer_id, c.name, cpp.cross_sell_receptivity
HAVING COUNT(csa.id) > 0
ORDER BY cpp.shop_id, suggestions_accepted DESC, total_revenue_contributed DESC;

-- Grant appropriate permissions (adjust based on your user roles)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO read_only_user;
-- GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- Sample data insertion function for testing
CREATE OR REPLACE FUNCTION seed_cross_sell_test_data(shop_uuid UUID)
RETURNS VOID AS $$
BEGIN
    -- Insert some sample product affinities
    INSERT INTO product_affinities (shop_id, product_a_id, product_b_id, affinity_score, confidence_level, sample_size)
    SELECT 
        shop_uuid,
        p1.id,
        p2.id,
        (RANDOM() * 0.7 + 0.3)::decimal(5,4), -- Score between 0.3 and 1.0
        (RANDOM() * 30 + 70)::integer, -- Confidence between 70-100
        (RANDOM() * 50 + 10)::integer -- Sample size between 10-60
    FROM products p1
    CROSS JOIN products p2
    WHERE p1.shop_id = shop_uuid 
      AND p2.shop_id = shop_uuid
      AND p1.id != p2.id
      AND RANDOM() < 0.3 -- Only create affinities for 30% of product pairs
    ON CONFLICT (shop_id, product_a_id, product_b_id) DO NOTHING;
    
    RAISE NOTICE 'Sample cross-sell data seeded for shop %', shop_uuid;
END;
$$ LANGUAGE plpgsql;

-- Performance optimization: Analyze tables after creation
ANALYZE product_affinities;
ANALYZE cross_sell_analytics;
ANALYZE service_product_affinities;
ANALYZE customer_purchase_patterns;
ANALYZE cross_sell_campaigns;
ANALYZE cross_sell_queue;

-- Comments for documentation
COMMENT ON TABLE product_affinities IS 'Tracks statistical relationships between products based on purchase history';
COMMENT ON TABLE cross_sell_analytics IS 'Records performance metrics for cross-selling suggestions shown to customers';
COMMENT ON TABLE service_product_affinities IS 'Maps relationships between services and commonly purchased products';
COMMENT ON TABLE customer_purchase_patterns IS 'Stores individual customer behavior patterns for personalized recommendations';
COMMENT ON TABLE cross_sell_campaigns IS 'Manages A/B testing and campaign performance for different cross-selling strategies';
COMMENT ON TABLE cross_sell_queue IS 'Temporary storage for real-time POS cross-selling suggestions during checkout';

COMMENT ON COLUMN product_affinities.affinity_score IS 'Statistical correlation score (0-1) indicating how often products are purchased together';
COMMENT ON COLUMN cross_sell_analytics.customer_action IS 'Customer response to suggestion: accepted, declined, ignored, viewed, dismissed';
COMMENT ON COLUMN service_product_affinities.purchase_frequency IS 'Percentage of service appointments that result in product purchase';
COMMENT ON COLUMN customer_purchase_patterns.cross_sell_receptivity IS 'Customer likelihood to accept cross-sell suggestions (0-1)';