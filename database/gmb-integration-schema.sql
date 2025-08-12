-- Google My Business Integration Database Schema
-- Supports OAuth account linking, review attribution, and automated responses

-- Table for storing Google My Business account connections
CREATE TABLE gmb_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    gmb_account_id VARCHAR(255) NOT NULL, -- Google My Business account ID
    gmb_location_id VARCHAR(255) NOT NULL, -- Specific GMB location ID
    business_name VARCHAR(255) NOT NULL,
    business_address TEXT,
    business_phone VARCHAR(50),
    business_website VARCHAR(255),
    
    -- OAuth 2.0 credentials
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    scope VARCHAR(500) DEFAULT 'https://www.googleapis.com/auth/business.manage',
    
    -- Connection status
    is_active BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    last_error TEXT,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id),
    
    -- Ensure one GMB account per barbershop location
    UNIQUE(barbershop_id, gmb_location_id)
);

-- Table for storing Google My Business reviews
CREATE TABLE gmb_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gmb_account_id UUID NOT NULL REFERENCES gmb_accounts(id) ON DELETE CASCADE,
    google_review_id VARCHAR(255) NOT NULL UNIQUE, -- GMB API review ID
    
    -- Review content
    reviewer_name VARCHAR(255),
    reviewer_profile_photo_url TEXT,
    review_text TEXT NOT NULL,
    star_rating INTEGER CHECK (star_rating BETWEEN 1 AND 5),
    review_date TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Review source and context
    review_url TEXT,
    review_language VARCHAR(10) DEFAULT 'en',
    
    -- Processing status
    processed_at TIMESTAMP WITH TIME ZONE,
    attribution_confidence VARCHAR(20) CHECK (attribution_confidence IN ('low', 'medium', 'high', 'certain')),
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    INDEX idx_gmb_reviews_account_date (gmb_account_id, review_date DESC),
    INDEX idx_gmb_reviews_rating (star_rating),
    INDEX idx_gmb_reviews_processed (processed_at)
);

-- Table for review attribution to specific barbers
CREATE TABLE gmb_review_attributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID NOT NULL REFERENCES gmb_reviews(id) ON DELETE CASCADE,
    barber_id UUID REFERENCES barbershop_staff(id) ON DELETE SET NULL,
    
    -- Attribution analysis results
    confidence_level VARCHAR(20) NOT NULL CHECK (confidence_level IN ('low', 'medium', 'high', 'certain')),
    confidence_score DECIMAL(5,2) CHECK (confidence_score BETWEEN 0 AND 100),
    
    -- Sentiment analysis
    sentiment VARCHAR(20) CHECK (sentiment IN ('positive', 'negative', 'neutral', 'mixed')),
    sentiment_score DECIMAL(3,2) CHECK (sentiment_score BETWEEN -1 AND 1),
    
    -- Attribution details
    mentioned_phrases TEXT[], -- Array of phrases that led to attribution
    extracted_names TEXT[], -- Array of names extracted from review
    ai_reasoning TEXT, -- AI explanation for attribution
    
    -- Manual overrides
    manual_override BOOLEAN DEFAULT false,
    manual_override_reason TEXT,
    manual_override_by UUID REFERENCES profiles(id),
    manual_override_at TIMESTAMP WITH TIME ZONE,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one attribution per review
    UNIQUE(review_id),
    INDEX idx_attributions_barber (barber_id),
    INDEX idx_attributions_confidence (confidence_level, confidence_score),
    INDEX idx_attributions_sentiment (sentiment)
);

-- Table for automated review responses
CREATE TABLE gmb_review_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID NOT NULL REFERENCES gmb_reviews(id) ON DELETE CASCADE,
    gmb_account_id UUID NOT NULL REFERENCES gmb_accounts(id) ON DELETE CASCADE,
    
    -- Response content
    response_text TEXT NOT NULL,
    response_type VARCHAR(50) DEFAULT 'ai_generated' CHECK (response_type IN ('ai_generated', 'template', 'manual', 'imported')),
    
    -- AI generation details
    ai_model_used VARCHAR(100), -- 'claude-3-5-sonnet', 'gpt-4', etc.
    generation_prompt TEXT,
    
    -- Publishing status
    published_to_gmb BOOLEAN DEFAULT false,
    published_at TIMESTAMP WITH TIME ZONE,
    gmb_response_id VARCHAR(255), -- Response ID from GMB API
    
    -- Approval workflow
    requires_approval BOOLEAN DEFAULT true,
    approved_by UUID REFERENCES profiles(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    approval_status VARCHAR(20) DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'auto_approved')),
    
    -- Error handling
    publish_error TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    INDEX idx_responses_review (review_id),
    INDEX idx_responses_status (approval_status, requires_approval),
    INDEX idx_responses_published (published_to_gmb, published_at)
);

-- Table for tracking barber performance metrics based on reviews
CREATE TABLE barber_review_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barber_id UUID NOT NULL REFERENCES barbershop_staff(id) ON DELETE CASCADE,
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    
    -- Time period for metrics
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    period_type VARCHAR(20) NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
    
    -- Review metrics
    total_reviews_attributed INTEGER DEFAULT 0,
    total_positive_reviews INTEGER DEFAULT 0,
    total_negative_reviews INTEGER DEFAULT 0,
    total_neutral_reviews INTEGER DEFAULT 0,
    
    -- Rating metrics
    average_rating DECIMAL(3,2) CHECK (average_rating BETWEEN 0 AND 5),
    total_rating_points INTEGER DEFAULT 0, -- Sum of all star ratings
    
    -- Confidence metrics
    high_confidence_attributions INTEGER DEFAULT 0,
    medium_confidence_attributions INTEGER DEFAULT 0,
    low_confidence_attributions INTEGER DEFAULT 0,
    
    -- Mention frequency
    mention_rate DECIMAL(5,2), -- Percentage of total shop reviews that mention this barber
    name_mention_count INTEGER DEFAULT 0, -- How many times barber was specifically named
    
    -- Business impact
    estimated_bookings_influenced INTEGER DEFAULT 0, -- Based on positive review attribution
    review_response_engagement DECIMAL(5,2), -- Engagement rate on reviews this barber is mentioned in
    
    -- Comparative metrics
    rank_in_shop INTEGER, -- Ranking among all barbers in this shop by review quality
    percentile_score DECIMAL(5,2), -- Percentile ranking (0-100)
    
    -- Audit fields
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one record per barber per period
    UNIQUE(barber_id, period_start, period_end, period_type),
    INDEX idx_barber_metrics_period (period_start, period_end, period_type),
    INDEX idx_barber_metrics_barber_shop (barber_id, barbershop_id),
    INDEX idx_barber_metrics_rating (average_rating DESC)
);

-- Table for GMB API synchronization tracking
CREATE TABLE gmb_sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gmb_account_id UUID NOT NULL REFERENCES gmb_accounts(id) ON DELETE CASCADE,
    
    -- Sync details
    sync_type VARCHAR(50) NOT NULL CHECK (sync_type IN ('reviews', 'responses', 'posts', 'insights', 'full')),
    sync_status VARCHAR(20) NOT NULL CHECK (sync_status IN ('started', 'completed', 'failed', 'partial')),
    
    -- Sync results
    items_processed INTEGER DEFAULT 0,
    items_success INTEGER DEFAULT 0,
    items_failed INTEGER DEFAULT 0,
    new_items_added INTEGER DEFAULT 0,
    
    -- Error tracking
    error_message TEXT,
    error_details JSONB,
    
    -- Performance tracking
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    
    -- API usage tracking
    api_calls_made INTEGER DEFAULT 0,
    api_quota_remaining INTEGER,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    INDEX idx_sync_logs_account_date (gmb_account_id, started_at DESC),
    INDEX idx_sync_logs_status (sync_status),
    INDEX idx_sync_logs_type (sync_type)
);

-- Table for storing barber name aliases and variations for better matching
CREATE TABLE barber_name_aliases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barber_id UUID NOT NULL REFERENCES barbershop_staff(id) ON DELETE CASCADE,
    
    -- Name variations
    alias_name VARCHAR(100) NOT NULL,
    alias_type VARCHAR(30) CHECK (alias_type IN ('nickname', 'short_name', 'formal_name', 'misspelling', 'customer_given')),
    
    -- Usage tracking
    times_matched INTEGER DEFAULT 0,
    last_matched_at TIMESTAMP WITH TIME ZONE,
    confidence_boost DECIMAL(5,2) DEFAULT 0, -- How much this alias boosts attribution confidence
    
    -- Source tracking
    source VARCHAR(50) DEFAULT 'manual' CHECK (source IN ('manual', 'ai_discovered', 'review_analysis', 'staff_input')),
    discovered_from_review_id UUID REFERENCES gmb_reviews(id),
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    verified_by_staff BOOLEAN DEFAULT false,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id),
    
    UNIQUE(barber_id, alias_name),
    INDEX idx_aliases_barber (barber_id),
    INDEX idx_aliases_name (alias_name),
    INDEX idx_aliases_active (is_active)
);

-- Table for storing automated response templates
CREATE TABLE gmb_response_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    
    -- Template details
    template_name VARCHAR(100) NOT NULL,
    template_category VARCHAR(50) CHECK (template_category IN ('positive_general', 'positive_specific', 'negative_general', 'negative_specific', 'neutral', 'first_time', 'repeat_customer')),
    
    -- Template content
    template_text TEXT NOT NULL,
    personalization_fields TEXT[], -- Array of fields that can be personalized (e.g., 'customer_name', 'barber_name', 'service_type')
    
    -- Usage conditions
    min_star_rating INTEGER CHECK (min_star_rating BETWEEN 1 AND 5),
    max_star_rating INTEGER CHECK (max_star_rating BETWEEN 1 AND 5),
    requires_barber_mention BOOLEAN DEFAULT false,
    requires_service_mention BOOLEAN DEFAULT false,
    
    -- Usage tracking
    times_used INTEGER DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,
    effectiveness_score DECIMAL(3,2), -- Based on customer engagement with responses
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id),
    
    INDEX idx_templates_barbershop (barbershop_id),
    INDEX idx_templates_category (template_category),
    INDEX idx_templates_rating_range (min_star_rating, max_star_rating),
    INDEX idx_templates_active (is_active)
);

-- Add RLS (Row Level Security) policies for multi-tenant access

-- Enable RLS on all tables
ALTER TABLE gmb_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE gmb_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE gmb_review_attributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE gmb_review_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE barber_review_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE gmb_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE barber_name_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE gmb_response_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for barbershop-based access control

-- GMB Accounts: Only accessible by barbershop owners/staff
CREATE POLICY "GMB accounts access" ON gmb_accounts
    FOR ALL USING (
        barbershop_id IN (
            SELECT barbershop_id FROM barbershop_staff 
            WHERE user_id = auth.uid()
            UNION
            SELECT id FROM barbershops 
            WHERE owner_id = auth.uid()
        )
    );

-- GMB Reviews: Accessible by barbershop with connected GMB account
CREATE POLICY "GMB reviews access" ON gmb_reviews
    FOR ALL USING (
        gmb_account_id IN (
            SELECT ga.id FROM gmb_accounts ga
            JOIN barbershop_staff bs ON ga.barbershop_id = bs.barbershop_id
            WHERE bs.user_id = auth.uid()
            UNION
            SELECT ga.id FROM gmb_accounts ga
            JOIN barbershops b ON ga.barbershop_id = b.id
            WHERE b.owner_id = auth.uid()
        )
    );

-- Review Attributions: Same access as reviews
CREATE POLICY "Review attributions access" ON gmb_review_attributions
    FOR ALL USING (
        review_id IN (
            SELECT gr.id FROM gmb_reviews gr
            JOIN gmb_accounts ga ON gr.gmb_account_id = ga.id
            JOIN barbershop_staff bs ON ga.barbershop_id = bs.barbershop_id
            WHERE bs.user_id = auth.uid()
            UNION
            SELECT gr.id FROM gmb_reviews gr
            JOIN gmb_accounts ga ON gr.gmb_account_id = ga.id
            JOIN barbershops b ON ga.barbershop_id = b.id
            WHERE b.owner_id = auth.uid()
        )
    );

-- Review Responses: Same access as reviews
CREATE POLICY "Review responses access" ON gmb_review_responses
    FOR ALL USING (
        gmb_account_id IN (
            SELECT ga.id FROM gmb_accounts ga
            JOIN barbershop_staff bs ON ga.barbershop_id = bs.barbershop_id
            WHERE bs.user_id = auth.uid()
            UNION
            SELECT ga.id FROM gmb_accounts ga
            JOIN barbershops b ON ga.barbershop_id = b.id
            WHERE b.owner_id = auth.uid()
        )
    );

-- Barber Review Metrics: Accessible by barbershop staff
CREATE POLICY "Barber metrics access" ON barber_review_metrics
    FOR ALL USING (
        barbershop_id IN (
            SELECT barbershop_id FROM barbershop_staff 
            WHERE user_id = auth.uid()
            UNION
            SELECT id FROM barbershops 
            WHERE owner_id = auth.uid()
        )
    );

-- GMB Sync Logs: Same access as GMB accounts
CREATE POLICY "GMB sync logs access" ON gmb_sync_logs
    FOR ALL USING (
        gmb_account_id IN (
            SELECT ga.id FROM gmb_accounts ga
            JOIN barbershop_staff bs ON ga.barbershop_id = bs.barbershop_id
            WHERE bs.user_id = auth.uid()
            UNION
            SELECT ga.id FROM gmb_accounts ga
            JOIN barbershops b ON ga.barbershop_id = b.id
            WHERE b.owner_id = auth.uid()
        )
    );

-- Barber Name Aliases: Accessible by barbershop staff
CREATE POLICY "Barber aliases access" ON barber_name_aliases
    FOR ALL USING (
        barber_id IN (
            SELECT bs1.id FROM barbershop_staff bs1
            JOIN barbershop_staff bs2 ON bs1.barbershop_id = bs2.barbershop_id
            WHERE bs2.user_id = auth.uid()
            UNION
            SELECT bs.id FROM barbershop_staff bs
            JOIN barbershops b ON bs.barbershop_id = b.id
            WHERE b.owner_id = auth.uid()
        )
    );

-- Response Templates: Accessible by barbershop staff
CREATE POLICY "Response templates access" ON gmb_response_templates
    FOR ALL USING (
        barbershop_id IN (
            SELECT barbershop_id FROM barbershop_staff 
            WHERE user_id = auth.uid()
            UNION
            SELECT id FROM barbershops 
            WHERE owner_id = auth.uid()
        )
    );

-- Create indexes for better query performance
CREATE INDEX CONCURRENTLY idx_gmb_reviews_attribution_lookup 
ON gmb_reviews (gmb_account_id, review_date DESC, processed_at);

CREATE INDEX CONCURRENTLY idx_barber_metrics_leaderboard 
ON barber_review_metrics (barbershop_id, period_type, average_rating DESC, total_reviews_attributed DESC);

CREATE INDEX CONCURRENTLY idx_review_responses_pending_approval 
ON gmb_review_responses (approval_status, requires_approval, created_at) 
WHERE approval_status = 'pending' AND requires_approval = true;

-- Add functions for common operations

-- Function to calculate barber review metrics for a given period
CREATE OR REPLACE FUNCTION calculate_barber_review_metrics(
    p_barber_id UUID,
    p_period_start DATE,
    p_period_end DATE,
    p_period_type VARCHAR
) RETURNS UUID AS $$
DECLARE
    v_metric_id UUID;
    v_barbershop_id UUID;
    v_total_reviews INTEGER;
    v_positive_reviews INTEGER;
    v_negative_reviews INTEGER;
    v_neutral_reviews INTEGER;
    v_avg_rating DECIMAL(3,2);
    v_total_rating_points INTEGER;
    v_high_confidence INTEGER;
    v_medium_confidence INTEGER;
    v_low_confidence INTEGER;
    v_mention_count INTEGER;
    v_shop_total_reviews INTEGER;
    v_mention_rate DECIMAL(5,2);
BEGIN
    -- Get barbershop ID
    SELECT barbershop_id INTO v_barbershop_id 
    FROM barbershop_staff 
    WHERE id = p_barber_id;
    
    -- Calculate metrics from review attributions
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE gra.sentiment = 'positive'),
        COUNT(*) FILTER (WHERE gra.sentiment = 'negative'),
        COUNT(*) FILTER (WHERE gra.sentiment = 'neutral'),
        AVG(gr.star_rating),
        SUM(gr.star_rating),
        COUNT(*) FILTER (WHERE gra.confidence_level = 'high' OR gra.confidence_level = 'certain'),
        COUNT(*) FILTER (WHERE gra.confidence_level = 'medium'),
        COUNT(*) FILTER (WHERE gra.confidence_level = 'low'),
        COUNT(*) FILTER (WHERE array_length(gra.mentioned_phrases, 1) > 0)
    INTO v_total_reviews, v_positive_reviews, v_negative_reviews, v_neutral_reviews,
         v_avg_rating, v_total_rating_points, v_high_confidence, v_medium_confidence, 
         v_low_confidence, v_mention_count
    FROM gmb_review_attributions gra
    JOIN gmb_reviews gr ON gra.review_id = gr.id
    JOIN gmb_accounts ga ON gr.gmb_account_id = ga.id
    WHERE gra.barber_id = p_barber_id
      AND ga.barbershop_id = v_barbershop_id
      AND gr.review_date >= p_period_start
      AND gr.review_date <= p_period_end;
    
    -- Calculate total shop reviews for mention rate
    SELECT COUNT(*) INTO v_shop_total_reviews
    FROM gmb_reviews gr
    JOIN gmb_accounts ga ON gr.gmb_account_id = ga.id
    WHERE ga.barbershop_id = v_barbershop_id
      AND gr.review_date >= p_period_start
      AND gr.review_date <= p_period_end;
    
    -- Calculate mention rate
    v_mention_rate := CASE 
        WHEN v_shop_total_reviews > 0 THEN (v_total_reviews * 100.0 / v_shop_total_reviews)
        ELSE 0
    END;
    
    -- Insert or update metrics record
    INSERT INTO barber_review_metrics (
        barber_id, barbershop_id, period_start, period_end, period_type,
        total_reviews_attributed, total_positive_reviews, total_negative_reviews, total_neutral_reviews,
        average_rating, total_rating_points,
        high_confidence_attributions, medium_confidence_attributions, low_confidence_attributions,
        mention_rate, name_mention_count
    ) VALUES (
        p_barber_id, v_barbershop_id, p_period_start, p_period_end, p_period_type,
        COALESCE(v_total_reviews, 0), COALESCE(v_positive_reviews, 0), 
        COALESCE(v_negative_reviews, 0), COALESCE(v_neutral_reviews, 0),
        v_avg_rating, COALESCE(v_total_rating_points, 0),
        COALESCE(v_high_confidence, 0), COALESCE(v_medium_confidence, 0), COALESCE(v_low_confidence, 0),
        v_mention_rate, COALESCE(v_mention_count, 0)
    )
    ON CONFLICT (barber_id, period_start, period_end, period_type)
    DO UPDATE SET
        total_reviews_attributed = EXCLUDED.total_reviews_attributed,
        total_positive_reviews = EXCLUDED.total_positive_reviews,
        total_negative_reviews = EXCLUDED.total_negative_reviews,
        total_neutral_reviews = EXCLUDED.total_neutral_reviews,
        average_rating = EXCLUDED.average_rating,
        total_rating_points = EXCLUDED.total_rating_points,
        high_confidence_attributions = EXCLUDED.high_confidence_attributions,
        medium_confidence_attributions = EXCLUDED.medium_confidence_attributions,
        low_confidence_attributions = EXCLUDED.low_confidence_attributions,
        mention_rate = EXCLUDED.mention_rate,
        name_mention_count = EXCLUDED.name_mention_count,
        calculated_at = NOW(),
        updated_at = NOW()
    RETURNING id INTO v_metric_id;
    
    RETURN v_metric_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update barber metrics when review attributions change
CREATE OR REPLACE FUNCTION trigger_update_barber_metrics() RETURNS TRIGGER AS $$
BEGIN
    -- Schedule metrics recalculation for the affected barber
    -- This would typically be handled by a background job
    PERFORM pg_notify('barber_metrics_update', 
        json_build_object(
            'barber_id', COALESCE(NEW.barber_id, OLD.barber_id),
            'review_date', (
                SELECT gr.review_date 
                FROM gmb_reviews gr 
                WHERE gr.id = COALESCE(NEW.review_id, OLD.review_id)
            )
        )::text
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER gmb_attribution_metrics_update
    AFTER INSERT OR UPDATE OR DELETE ON gmb_review_attributions
    FOR EACH ROW EXECUTE FUNCTION trigger_update_barber_metrics();

-- Comment on tables for documentation
COMMENT ON TABLE gmb_accounts IS 'OAuth-connected Google My Business accounts for barbershops';
COMMENT ON TABLE gmb_reviews IS 'Customer reviews imported from Google My Business';
COMMENT ON TABLE gmb_review_attributions IS 'AI-powered attribution of reviews to specific barbers';
COMMENT ON TABLE gmb_review_responses IS 'Automated and manual responses to GMB reviews';
COMMENT ON TABLE barber_review_metrics IS 'Performance metrics for barbers based on review attribution';
COMMENT ON TABLE gmb_sync_logs IS 'Audit log for GMB API synchronization operations';
COMMENT ON TABLE barber_name_aliases IS 'Name variations and aliases for improved barber matching';
COMMENT ON TABLE gmb_response_templates IS 'Templates for automated review responses';