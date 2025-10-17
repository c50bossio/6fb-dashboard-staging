-- Payout History System Database Schema
-- Extends existing commission and payout tracking with comprehensive history and status updates
-- Integrates with existing commission_payout_records table

-- Payout Status Updates Table
-- Tracks real-time status changes from Stripe webhooks
CREATE TABLE IF NOT EXISTS payout_status_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payout_record_id UUID REFERENCES commission_payout_records(id) ON DELETE CASCADE,
    barbershop_id UUID NOT NULL,
    
    -- Status tracking
    previous_status TEXT,
    new_status TEXT NOT NULL,
    status_reason TEXT,
    
    -- Stripe integration
    stripe_transfer_id TEXT,
    stripe_event_id TEXT,
    stripe_event_type TEXT,
    
    -- Timeline information
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    estimated_arrival_date TIMESTAMPTZ,
    actual_arrival_date TIMESTAMPTZ,
    
    -- Additional metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Indexes
    INDEX idx_payout_status_updates_record (payout_record_id),
    INDEX idx_payout_status_updates_barbershop (barbershop_id),
    INDEX idx_payout_status_updates_status (new_status),
    INDEX idx_payout_status_updates_occurred_at (occurred_at DESC),
    INDEX idx_payout_status_updates_stripe_transfer (stripe_transfer_id)
);

-- Payout Transaction Metadata Table
-- Extended transaction details and reconciliation data
CREATE TABLE IF NOT EXISTS payout_transaction_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payout_record_id UUID REFERENCES commission_payout_records(id) ON DELETE CASCADE,
    barbershop_id UUID NOT NULL,
    
    -- Commission breakdown
    service_commission_amount DECIMAL(10,2) DEFAULT 0,
    product_commission_amount DECIMAL(10,2) DEFAULT 0,
    tier_bonus_amount DECIMAL(10,2) DEFAULT 0,
    adjustment_amount DECIMAL(10,2) DEFAULT 0,
    
    -- Fee breakdown
    stripe_fee_amount DECIMAL(10,2) DEFAULT 0,
    platform_fee_amount DECIMAL(10,2) DEFAULT 0,
    processing_fee_amount DECIMAL(10,2) DEFAULT 0,
    
    -- Reconciliation data
    source_transactions JSONB DEFAULT '[]', -- Array of commission_transaction IDs
    reconciliation_status TEXT DEFAULT 'pending' CHECK (reconciliation_status IN ('pending', 'matched', 'discrepancy', 'resolved')),
    reconciliation_notes TEXT,
    reconciled_at TIMESTAMPTZ,
    reconciled_by UUID,
    
    -- Tax information
    tax_year INTEGER,
    tax_quarter INTEGER,
    requires_1099 BOOLEAN DEFAULT false,
    
    -- Timeline tracking
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Indexes
    INDEX idx_payout_metadata_record (payout_record_id),
    INDEX idx_payout_metadata_barbershop (barbershop_id),
    INDEX idx_payout_metadata_reconciliation (reconciliation_status),
    INDEX idx_payout_metadata_tax_year (tax_year),
    
    -- Unique constraint
    UNIQUE (payout_record_id)
);

-- Payout Reconciliation Reports Table
-- Admin reconciliation tracking between internal records and Stripe transfers
CREATE TABLE IF NOT EXISTS payout_reconciliation_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbershop_id UUID NOT NULL,
    
    -- Report period
    report_date DATE NOT NULL,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    
    -- Reconciliation summary
    total_internal_payouts DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_stripe_transfers DECIMAL(10,2) NOT NULL DEFAULT 0,
    reconciliation_difference DECIMAL(10,2) NOT NULL DEFAULT 0,
    
    -- Count tracking
    internal_payout_count INTEGER DEFAULT 0,
    stripe_transfer_count INTEGER DEFAULT 0,
    matched_transactions_count INTEGER DEFAULT 0,
    unmatched_internal_count INTEGER DEFAULT 0,
    unmatched_stripe_count INTEGER DEFAULT 0,
    
    -- Status tracking
    reconciliation_status TEXT DEFAULT 'pending' CHECK (reconciliation_status IN ('pending', 'in_progress', 'completed', 'requires_attention')),
    discrepancy_flags JSONB DEFAULT '[]',
    
    -- Processing information
    generated_by UUID,
    generated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    completed_at TIMESTAMPTZ,
    
    -- Report data
    detailed_breakdown JSONB DEFAULT '{}',
    discrepancy_details JSONB DEFAULT '[]',
    
    -- Indexes
    INDEX idx_reconciliation_reports_barbershop (barbershop_id),
    INDEX idx_reconciliation_reports_date (report_date DESC),
    INDEX idx_reconciliation_reports_status (reconciliation_status),
    INDEX idx_reconciliation_reports_period (period_start, period_end),
    
    -- Unique constraint for one report per barbershop per day
    UNIQUE (barbershop_id, report_date)
);

-- Payout Audit Trail Table
-- Comprehensive audit logging for all payout-related actions
CREATE TABLE IF NOT EXISTS payout_audit_trail (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbershop_id UUID NOT NULL,
    
    -- Action details
    action_type TEXT NOT NULL CHECK (action_type IN ('payout_created', 'payout_updated', 'payout_cancelled', 'status_changed', 'reconciliation_updated', 'manual_adjustment', 'webhook_processed')),
    entity_type TEXT NOT NULL CHECK (entity_type IN ('payout_record', 'status_update', 'metadata', 'reconciliation_report')),
    entity_id UUID NOT NULL,
    
    -- User and context
    performed_by UUID, -- NULL for system actions
    performer_role TEXT, -- 'system', 'admin', 'shop_owner', 'api'
    
    -- Change tracking
    previous_values JSONB,
    new_values JSONB,
    change_summary TEXT,
    
    -- Additional context
    ip_address INET,
    user_agent TEXT,
    api_endpoint TEXT,
    webhook_event_id TEXT,
    
    -- Timing
    occurred_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Indexes
    INDEX idx_payout_audit_barbershop (barbershop_id),
    INDEX idx_payout_audit_action_type (action_type),
    INDEX idx_payout_audit_entity (entity_type, entity_id),
    INDEX idx_payout_audit_performed_by (performed_by),
    INDEX idx_payout_audit_occurred_at (occurred_at DESC)
);

-- Payout Failed Attempts Table
-- Track failed payout attempts for retry and analysis
CREATE TABLE IF NOT EXISTS payout_failed_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payout_record_id UUID REFERENCES commission_payout_records(id) ON DELETE CASCADE,
    barbershop_id UUID NOT NULL,
    barber_id UUID NOT NULL,
    
    -- Failure details
    attempt_number INTEGER NOT NULL DEFAULT 1,
    failure_reason TEXT NOT NULL,
    failure_code TEXT,
    stripe_error_code TEXT,
    stripe_error_message TEXT,
    
    -- Attempt context
    attempted_amount DECIMAL(10,2) NOT NULL,
    attempted_method TEXT NOT NULL,
    attempted_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Retry information
    next_retry_at TIMESTAMPTZ,
    max_retry_attempts INTEGER DEFAULT 3,
    retry_enabled BOOLEAN DEFAULT true,
    
    -- Resolution
    resolved_at TIMESTAMPTZ,
    resolution_method TEXT, -- 'retry_successful', 'manual_intervention', 'abandoned'
    resolution_notes TEXT,
    
    -- Additional context
    metadata JSONB DEFAULT '{}',
    
    -- Indexes
    INDEX idx_failed_attempts_record (payout_record_id),
    INDEX idx_failed_attempts_barbershop (barbershop_id),
    INDEX idx_failed_attempts_barber (barber_id),
    INDEX idx_failed_attempts_next_retry (next_retry_at),
    INDEX idx_failed_attempts_unresolved (resolved_at) WHERE resolved_at IS NULL
);

-- Payout Performance Metrics Table
-- Track payout processing performance and trends
CREATE TABLE IF NOT EXISTS payout_performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbershop_id UUID NOT NULL,
    
    -- Metric period
    metric_date DATE NOT NULL,
    metric_period TEXT NOT NULL CHECK (metric_period IN ('daily', 'weekly', 'monthly')),
    
    -- Volume metrics
    total_payouts_count INTEGER DEFAULT 0,
    total_payouts_amount DECIMAL(10,2) DEFAULT 0,
    successful_payouts_count INTEGER DEFAULT 0,
    failed_payouts_count INTEGER DEFAULT 0,
    
    -- Performance metrics
    average_processing_time_hours DECIMAL(8,2) DEFAULT 0,
    fastest_payout_hours DECIMAL(8,2) DEFAULT 0,
    slowest_payout_hours DECIMAL(8,2) DEFAULT 0,
    
    -- Method breakdown
    stripe_transfer_count INTEGER DEFAULT 0,
    manual_payout_count INTEGER DEFAULT 0,
    other_method_count INTEGER DEFAULT 0,
    
    -- Commission breakdown
    service_commission_total DECIMAL(10,2) DEFAULT 0,
    product_commission_total DECIMAL(10,2) DEFAULT 0,
    tier_bonus_total DECIMAL(10,2) DEFAULT 0,
    
    -- Reconciliation metrics
    reconciliation_accuracy_percentage DECIMAL(5,2) DEFAULT 100.00,
    discrepancy_count INTEGER DEFAULT 0,
    discrepancy_total_amount DECIMAL(10,2) DEFAULT 0,
    
    -- Timing
    calculated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Indexes
    INDEX idx_performance_metrics_barbershop (barbershop_id),
    INDEX idx_performance_metrics_date (metric_date DESC),
    INDEX idx_performance_metrics_period (metric_period),
    
    -- Unique constraint
    UNIQUE (barbershop_id, metric_date, metric_period)
);

-- Enable Row Level Security
ALTER TABLE payout_status_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_transaction_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_reconciliation_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_audit_trail ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_failed_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_performance_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payout_status_updates
CREATE POLICY "Users can view status updates from their barbershop" ON payout_status_updates
    FOR SELECT TO authenticated
    USING (
        barbershop_id IN (
            SELECT shop_id FROM profiles WHERE id = auth.uid()
            UNION
            SELECT barbershop_id FROM barbershop_staff WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "System can insert status updates" ON payout_status_updates
    FOR INSERT TO authenticated
    WITH CHECK (
        barbershop_id IN (
            SELECT shop_id FROM profiles WHERE id = auth.uid()
            UNION
            SELECT barbershop_id FROM barbershop_staff WHERE user_id = auth.uid() AND is_active = true
        )
    );

-- RLS Policies for payout_transaction_metadata
CREATE POLICY "Users can view transaction metadata from their barbershop" ON payout_transaction_metadata
    FOR SELECT TO authenticated
    USING (
        barbershop_id IN (
            SELECT shop_id FROM profiles WHERE id = auth.uid()
            UNION
            SELECT barbershop_id FROM barbershop_staff WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Shop owners can manage transaction metadata" ON payout_transaction_metadata
    FOR ALL TO authenticated
    USING (
        barbershop_id IN (
            SELECT shop_id FROM profiles WHERE id = auth.uid()
        )
    );

-- RLS Policies for payout_reconciliation_reports
CREATE POLICY "Shop owners can view reconciliation reports" ON payout_reconciliation_reports
    FOR SELECT TO authenticated
    USING (
        barbershop_id IN (
            SELECT shop_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Shop owners can manage reconciliation reports" ON payout_reconciliation_reports
    FOR ALL TO authenticated
    USING (
        barbershop_id IN (
            SELECT shop_id FROM profiles WHERE id = auth.uid()
        )
    );

-- RLS Policies for payout_audit_trail
CREATE POLICY "Shop owners can view audit trail" ON payout_audit_trail
    FOR SELECT TO authenticated
    USING (
        barbershop_id IN (
            SELECT shop_id FROM profiles WHERE id = auth.uid()
        )
    );

-- RLS Policies for payout_failed_attempts
CREATE POLICY "Users can view failed attempts from their barbershop" ON payout_failed_attempts
    FOR SELECT TO authenticated
    USING (
        barbershop_id IN (
            SELECT shop_id FROM profiles WHERE id = auth.uid()
            UNION
            SELECT barbershop_id FROM barbershop_staff WHERE user_id = auth.uid() AND is_active = true
        )
    );

-- RLS Policies for payout_performance_metrics
CREATE POLICY "Users can view performance metrics from their barbershop" ON payout_performance_metrics
    FOR SELECT TO authenticated
    USING (
        barbershop_id IN (
            SELECT shop_id FROM profiles WHERE id = auth.uid()
            UNION
            SELECT barbershop_id FROM barbershop_staff WHERE user_id = auth.uid() AND is_active = true
        )
    );

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables with updated_at columns
CREATE TRIGGER update_payout_transaction_metadata_updated_at
    BEFORE UPDATE ON payout_transaction_metadata
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create comprehensive indexes for performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payout_status_updates_composite 
    ON payout_status_updates (barbershop_id, new_status, occurred_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payout_metadata_composite 
    ON payout_transaction_metadata (barbershop_id, reconciliation_status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payout_audit_composite 
    ON payout_audit_trail (barbershop_id, action_type, occurred_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_failed_attempts_active 
    ON payout_failed_attempts (barbershop_id, retry_enabled, next_retry_at) WHERE resolved_at IS NULL;

-- Create functions for payout history management

-- Function to get comprehensive payout history with filters
CREATE OR REPLACE FUNCTION get_payout_history(
    p_barbershop_id UUID,
    p_barber_id UUID DEFAULT NULL,
    p_status TEXT DEFAULT NULL,
    p_method TEXT DEFAULT NULL,
    p_date_from TIMESTAMPTZ DEFAULT NULL,
    p_date_to TIMESTAMPTZ DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    payout_id UUID,
    barber_id UUID,
    barber_name TEXT,
    amount DECIMAL(10,2),
    payout_method TEXT,
    status TEXT,
    stripe_transfer_id TEXT,
    reference_number TEXT,
    created_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    service_commission DECIMAL(10,2),
    product_commission DECIMAL(10,2),
    tier_bonus DECIMAL(10,2),
    latest_status_update TIMESTAMPTZ,
    status_count INTEGER,
    metadata JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cpr.id,
        cpr.barber_id,
        COALESCE(p.full_name, p.display_name) as barber_name,
        cpr.amount,
        cpr.payout_method,
        cpr.status,
        cpr.stripe_transfer_id,
        cpr.reference_number,
        cpr.created_at,
        cpr.completed_at,
        COALESCE(ptm.service_commission_amount, 0) as service_commission,
        COALESCE(ptm.product_commission_amount, 0) as product_commission,
        COALESCE(ptm.tier_bonus_amount, 0) as tier_bonus,
        (
            SELECT MAX(psu.occurred_at) 
            FROM payout_status_updates psu 
            WHERE psu.payout_record_id = cpr.id
        ) as latest_status_update,
        (
            SELECT COUNT(*)::integer 
            FROM payout_status_updates psu 
            WHERE psu.payout_record_id = cpr.id
        ) as status_count,
        cpr.metadata
    FROM commission_payout_records cpr
    LEFT JOIN payout_transaction_metadata ptm ON ptm.payout_record_id = cpr.id
    LEFT JOIN profiles p ON p.id = cpr.barber_id
    WHERE cpr.barbershop_id = p_barbershop_id
        AND (p_barber_id IS NULL OR cpr.barber_id = p_barber_id)
        AND (p_status IS NULL OR cpr.status = p_status)
        AND (p_method IS NULL OR cpr.payout_method = p_method)
        AND (p_date_from IS NULL OR cpr.created_at >= p_date_from)
        AND (p_date_to IS NULL OR cpr.created_at <= p_date_to)
    ORDER BY cpr.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get payout status timeline
CREATE OR REPLACE FUNCTION get_payout_status_timeline(p_payout_record_id UUID)
RETURNS TABLE (
    update_id UUID,
    previous_status TEXT,
    new_status TEXT,
    status_reason TEXT,
    occurred_at TIMESTAMPTZ,
    estimated_arrival_date TIMESTAMPTZ,
    actual_arrival_date TIMESTAMPTZ,
    stripe_event_type TEXT,
    metadata JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        psu.id,
        psu.previous_status,
        psu.new_status,
        psu.status_reason,
        psu.occurred_at,
        psu.estimated_arrival_date,
        psu.actual_arrival_date,
        psu.stripe_event_type,
        psu.metadata
    FROM payout_status_updates psu
    WHERE psu.payout_record_id = p_payout_record_id
    ORDER BY psu.occurred_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create payout status update with audit trail
CREATE OR REPLACE FUNCTION create_payout_status_update(
    p_payout_record_id UUID,
    p_barbershop_id UUID,
    p_previous_status TEXT,
    p_new_status TEXT,
    p_status_reason TEXT DEFAULT NULL,
    p_stripe_transfer_id TEXT DEFAULT NULL,
    p_stripe_event_id TEXT DEFAULT NULL,
    p_stripe_event_type TEXT DEFAULT NULL,
    p_estimated_arrival_date TIMESTAMPTZ DEFAULT NULL,
    p_actual_arrival_date TIMESTAMPTZ DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}',
    p_performed_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_update_id UUID;
BEGIN
    -- Insert status update
    INSERT INTO payout_status_updates (
        payout_record_id,
        barbershop_id,
        previous_status,
        new_status,
        status_reason,
        stripe_transfer_id,
        stripe_event_id,
        stripe_event_type,
        estimated_arrival_date,
        actual_arrival_date,
        metadata
    ) VALUES (
        p_payout_record_id,
        p_barbershop_id,
        p_previous_status,
        p_new_status,
        p_status_reason,
        p_stripe_transfer_id,
        p_stripe_event_id,
        p_stripe_event_type,
        p_estimated_arrival_date,
        p_actual_arrival_date,
        p_metadata
    ) RETURNING id INTO v_update_id;
    
    -- Create audit trail entry
    INSERT INTO payout_audit_trail (
        barbershop_id,
        action_type,
        entity_type,
        entity_id,
        performed_by,
        performer_role,
        previous_values,
        new_values,
        change_summary,
        webhook_event_id
    ) VALUES (
        p_barbershop_id,
        'status_changed',
        'status_update',
        v_update_id,
        p_performed_by,
        CASE WHEN p_performed_by IS NULL THEN 'system' ELSE 'user' END,
        CASE WHEN p_previous_status IS NOT NULL THEN jsonb_build_object('status', p_previous_status) ELSE NULL END,
        jsonb_build_object('status', p_new_status),
        CONCAT('Status changed from ', COALESCE(p_previous_status, 'null'), ' to ', p_new_status),
        p_stripe_event_id
    );
    
    RETURN v_update_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate payout performance metrics
CREATE OR REPLACE FUNCTION calculate_payout_performance_metrics(
    p_barbershop_id UUID,
    p_metric_date DATE,
    p_metric_period TEXT DEFAULT 'daily'
)
RETURNS VOID AS $$
DECLARE
    v_period_start TIMESTAMPTZ;
    v_period_end TIMESTAMPTZ;
    v_total_count INTEGER := 0;
    v_total_amount DECIMAL(10,2) := 0;
    v_successful_count INTEGER := 0;
    v_failed_count INTEGER := 0;
    v_avg_processing_hours DECIMAL(8,2) := 0;
    v_service_commission_total DECIMAL(10,2) := 0;
    v_product_commission_total DECIMAL(10,2) := 0;
    v_tier_bonus_total DECIMAL(10,2) := 0;
BEGIN
    -- Calculate period boundaries
    CASE p_metric_period
        WHEN 'daily' THEN
            v_period_start := p_metric_date::timestamptz;
            v_period_end := v_period_start + INTERVAL '1 day';
        WHEN 'weekly' THEN
            v_period_start := date_trunc('week', p_metric_date)::timestamptz;
            v_period_end := v_period_start + INTERVAL '1 week';
        WHEN 'monthly' THEN
            v_period_start := date_trunc('month', p_metric_date)::timestamptz;
            v_period_end := v_period_start + INTERVAL '1 month';
        ELSE
            RAISE EXCEPTION 'Invalid metric period: %', p_metric_period;
    END CASE;
    
    -- Calculate metrics
    SELECT 
        COUNT(*),
        COALESCE(SUM(cpr.amount), 0),
        COUNT(*) FILTER (WHERE cpr.status IN ('completed', 'paid')),
        COUNT(*) FILTER (WHERE cpr.status IN ('failed', 'cancelled')),
        AVG(EXTRACT(EPOCH FROM (cpr.completed_at - cpr.created_at)) / 3600) FILTER (WHERE cpr.completed_at IS NOT NULL),
        COALESCE(SUM(ptm.service_commission_amount), 0),
        COALESCE(SUM(ptm.product_commission_amount), 0),
        COALESCE(SUM(ptm.tier_bonus_amount), 0)
    INTO 
        v_total_count,
        v_total_amount,
        v_successful_count,
        v_failed_count,
        v_avg_processing_hours,
        v_service_commission_total,
        v_product_commission_total,
        v_tier_bonus_total
    FROM commission_payout_records cpr
    LEFT JOIN payout_transaction_metadata ptm ON ptm.payout_record_id = cpr.id
    WHERE cpr.barbershop_id = p_barbershop_id
        AND cpr.created_at >= v_period_start
        AND cpr.created_at < v_period_end;
    
    -- Upsert metrics record
    INSERT INTO payout_performance_metrics (
        barbershop_id,
        metric_date,
        metric_period,
        total_payouts_count,
        total_payouts_amount,
        successful_payouts_count,
        failed_payouts_count,
        average_processing_time_hours,
        service_commission_total,
        product_commission_total,
        tier_bonus_total
    ) VALUES (
        p_barbershop_id,
        p_metric_date,
        p_metric_period,
        v_total_count,
        v_total_amount,
        v_successful_count,
        v_failed_count,
        COALESCE(v_avg_processing_hours, 0),
        v_service_commission_total,
        v_product_commission_total,
        v_tier_bonus_total
    ) ON CONFLICT (barbershop_id, metric_date, metric_period)
    DO UPDATE SET
        total_payouts_count = EXCLUDED.total_payouts_count,
        total_payouts_amount = EXCLUDED.total_payouts_amount,
        successful_payouts_count = EXCLUDED.successful_payouts_count,
        failed_payouts_count = EXCLUDED.failed_payouts_count,
        average_processing_time_hours = EXCLUDED.average_processing_time_hours,
        service_commission_total = EXCLUDED.service_commission_total,
        product_commission_total = EXCLUDED.product_commission_total,
        tier_bonus_total = EXCLUDED.tier_bonus_total,
        calculated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments for documentation
COMMENT ON TABLE payout_status_updates IS 'Tracks real-time status changes from Stripe webhooks for payout records';
COMMENT ON TABLE payout_transaction_metadata IS 'Extended transaction details and reconciliation data for payouts';
COMMENT ON TABLE payout_reconciliation_reports IS 'Admin reconciliation tracking between internal records and Stripe transfers';
COMMENT ON TABLE payout_audit_trail IS 'Comprehensive audit logging for all payout-related actions';
COMMENT ON TABLE payout_failed_attempts IS 'Track failed payout attempts for retry and analysis';
COMMENT ON TABLE payout_performance_metrics IS 'Track payout processing performance and trends';

COMMENT ON FUNCTION get_payout_history IS 'Get comprehensive payout history with advanced filtering and pagination';
COMMENT ON FUNCTION get_payout_status_timeline IS 'Get complete status update timeline for a specific payout';
COMMENT ON FUNCTION create_payout_status_update IS 'Create status update with automatic audit trail logging';
COMMENT ON FUNCTION calculate_payout_performance_metrics IS 'Calculate and store performance metrics for a given period';