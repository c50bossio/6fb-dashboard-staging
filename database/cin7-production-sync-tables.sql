-- Production Sync Engine Database Tables
-- Additional tables to support the enterprise-grade Cin7 sync engine

-- Table for storing dynamic field mappings discovered by the field discovery system
CREATE TABLE IF NOT EXISTS cin7_field_mappings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    
    -- Field mapping configuration from discovery system
    mapping_config JSONB NOT NULL,
    
    -- Mapping metadata
    api_version TEXT NOT NULL DEFAULT 'v2',
    endpoint_used TEXT NOT NULL,
    discovery_confidence DECIMAL(5,2) DEFAULT 0,
    
    -- Status and validation
    is_active BOOLEAN DEFAULT TRUE,
    is_validated BOOLEAN DEFAULT FALSE,
    validation_results JSONB,
    
    -- Usage tracking
    last_used_at TIMESTAMPTZ,
    usage_count INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2) DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one active mapping per barbershop
    UNIQUE(barbershop_id, is_active) WHERE is_active = TRUE
);

-- Enhanced sync operations tracking table 
CREATE TABLE IF NOT EXISTS cin7_sync_operations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    connection_id UUID REFERENCES cin7_connections(id) ON DELETE CASCADE,
    
    -- Operation details
    operation_type TEXT NOT NULL DEFAULT 'production_sync' CHECK (operation_type IN ('production_sync', 'field_discovery', 'validation', 'rollback')),
    sync_mode TEXT NOT NULL DEFAULT 'manual' CHECK (sync_mode IN ('manual', 'automatic', 'scheduled')),
    
    -- Status tracking with detailed states
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'initializing', 'discovering_fields', 'validating_mapping',
        'processing_batch', 'rolling_back', 'completed', 'failed', 'cancelled'
    )),
    
    -- Progress tracking
    total_items INTEGER DEFAULT 0,
    processed_items INTEGER DEFAULT 0,
    successful_items INTEGER DEFAULT 0,
    failed_items INTEGER DEFAULT 0,
    current_batch INTEGER DEFAULT 0,
    total_batches INTEGER DEFAULT 0,
    
    -- Performance metrics
    success_rate DECIMAL(5,2) DEFAULT 0,
    duration_ms BIGINT,
    avg_batch_time_ms INTEGER,
    
    -- Configuration and results
    sync_options JSONB DEFAULT '{}'::jsonb,
    field_mapping_used JSONB,
    error_summary JSONB,
    phase_history JSONB DEFAULT '[]'::jsonb,
    
    -- Timestamps
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    last_progress_update TIMESTAMPTZ DEFAULT NOW(),
    
    -- User tracking
    initiated_by UUID,
    
    CONSTRAINT valid_progress CHECK (processed_items <= total_items),
    CONSTRAINT valid_success_items CHECK (successful_items <= processed_items),
    CONSTRAINT valid_failed_items CHECK (failed_items <= processed_items)
);

-- Detailed batch processing logs
CREATE TABLE IF NOT EXISTS cin7_batch_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    operation_id UUID NOT NULL REFERENCES cin7_sync_operations(id) ON DELETE CASCADE,
    
    -- Batch details
    batch_number INTEGER NOT NULL,
    page_number INTEGER NOT NULL,
    batch_size INTEGER NOT NULL,
    
    -- Processing results
    items_processed INTEGER NOT NULL DEFAULT 0,
    items_successful INTEGER NOT NULL DEFAULT 0,
    items_failed INTEGER NOT NULL DEFAULT 0,
    
    -- Performance
    processing_time_ms INTEGER,
    api_response_time_ms INTEGER,
    db_write_time_ms INTEGER,
    
    -- Error tracking
    errors JSONB DEFAULT '[]'::jsonb,
    warnings JSONB DEFAULT '[]'::jsonb,
    
    -- Data samples for debugging
    sample_successful_items JSONB,
    sample_failed_items JSONB,
    
    -- Timestamps
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    
    CONSTRAINT unique_operation_batch UNIQUE(operation_id, batch_number)
);

-- Rollback tracking for failed operations
CREATE TABLE IF NOT EXISTS cin7_rollback_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    operation_id UUID NOT NULL REFERENCES cin7_sync_operations(id) ON DELETE CASCADE,
    
    -- Rollback details
    rollback_reason TEXT NOT NULL,
    rollback_type TEXT NOT NULL CHECK (rollback_type IN ('partial', 'full', 'selective')),
    
    -- Items affected
    products_affected INTEGER DEFAULT 0,
    rollback_data JSONB,
    
    -- Results
    rollback_status TEXT NOT NULL DEFAULT 'pending' CHECK (rollback_status IN ('pending', 'in_progress', 'completed', 'failed')),
    rollback_errors JSONB,
    
    -- Timestamps
    initiated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    
    -- User tracking
    initiated_by UUID
);

-- Sync performance metrics for monitoring and optimization
CREATE TABLE IF NOT EXISTS cin7_sync_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    
    -- Time period for metrics
    metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
    metric_hour INTEGER CHECK (metric_hour >= 0 AND metric_hour <= 23),
    
    -- Sync counts
    total_syncs INTEGER DEFAULT 0,
    successful_syncs INTEGER DEFAULT 0,
    failed_syncs INTEGER DEFAULT 0,
    cancelled_syncs INTEGER DEFAULT 0,
    
    -- Performance metrics
    avg_sync_duration_ms BIGINT,
    avg_items_per_sync INTEGER,
    avg_success_rate DECIMAL(5,2),
    
    -- Error tracking
    most_common_errors JSONB,
    error_count INTEGER DEFAULT 0,
    
    -- Resource usage
    total_api_calls INTEGER DEFAULT 0,
    total_items_processed INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_barbershop_metric_period UNIQUE(barbershop_id, metric_date, metric_hour)
);

-- Sync alerts and notifications
CREATE TABLE IF NOT EXISTS cin7_sync_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    operation_id UUID REFERENCES cin7_sync_operations(id) ON DELETE CASCADE,
    
    -- Alert details
    alert_type TEXT NOT NULL CHECK (alert_type IN ('sync_failure', 'low_success_rate', 'field_mapping_issue', 'connection_error', 'performance_degradation')),
    severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),
    
    -- Alert content
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    details JSONB,
    
    -- Resolution tracking
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID,
    resolution_notes TEXT,
    
    -- Notification tracking
    notification_sent BOOLEAN DEFAULT FALSE,
    notification_channels TEXT[], -- email, webhook, dashboard
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enhanced indexes for performance
CREATE INDEX IF NOT EXISTS idx_cin7_field_mappings_barbershop_active 
ON cin7_field_mappings(barbershop_id, is_active) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_cin7_sync_operations_barbershop_status 
ON cin7_sync_operations(barbershop_id, status, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_cin7_sync_operations_status_progress 
ON cin7_sync_operations(status, last_progress_update) WHERE status IN ('pending', 'initializing', 'processing_batch');

CREATE INDEX IF NOT EXISTS idx_cin7_batch_logs_operation_batch 
ON cin7_batch_logs(operation_id, batch_number);

CREATE INDEX IF NOT EXISTS idx_cin7_rollback_logs_operation 
ON cin7_rollback_logs(operation_id, initiated_at);

CREATE INDEX IF NOT EXISTS idx_cin7_sync_metrics_barbershop_date 
ON cin7_sync_metrics(barbershop_id, metric_date DESC);

CREATE INDEX IF NOT EXISTS idx_cin7_sync_alerts_barbershop_unresolved 
ON cin7_sync_alerts(barbershop_id, is_resolved, created_at DESC) WHERE is_resolved = FALSE;

-- Add operation_id reference to existing cin7_sync_logs table
ALTER TABLE cin7_sync_logs ADD COLUMN IF NOT EXISTS operation_id UUID REFERENCES cin7_sync_operations(id) ON DELETE CASCADE;

-- Update existing bulk_operations table to work with sync operations
ALTER TABLE bulk_operations ADD COLUMN IF NOT EXISTS sync_operation_id UUID REFERENCES cin7_sync_operations(id) ON DELETE CASCADE;

-- Row Level Security policies
ALTER TABLE cin7_field_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE cin7_sync_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE cin7_batch_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cin7_rollback_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cin7_sync_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE cin7_sync_alerts ENABLE ROW LEVEL SECURITY;

-- RLS policies for barbershop access
CREATE POLICY "Barbershop staff can view their field mappings" ON cin7_field_mappings
FOR SELECT USING (
    barbershop_id IN (
        SELECT barbershop_id FROM barbershop_staff WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Barbershop staff can manage their field mappings" ON cin7_field_mappings
FOR ALL USING (
    barbershop_id IN (
        SELECT barbershop_id FROM barbershop_staff WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Barbershop staff can view their sync operations" ON cin7_sync_operations
FOR SELECT USING (
    barbershop_id IN (
        SELECT barbershop_id FROM barbershop_staff WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Barbershop staff can manage their sync operations" ON cin7_sync_operations
FOR ALL USING (
    barbershop_id IN (
        SELECT barbershop_id FROM barbershop_staff WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Barbershop staff can view their batch logs" ON cin7_batch_logs
FOR SELECT USING (
    operation_id IN (
        SELECT id FROM cin7_sync_operations 
        WHERE barbershop_id IN (
            SELECT barbershop_id FROM barbershop_staff WHERE user_id = auth.uid()
        )
    )
);

CREATE POLICY "Barbershop staff can view their rollback logs" ON cin7_rollback_logs
FOR SELECT USING (
    operation_id IN (
        SELECT id FROM cin7_sync_operations 
        WHERE barbershop_id IN (
            SELECT barbershop_id FROM barbershop_staff WHERE user_id = auth.uid()
        )
    )
);

CREATE POLICY "Barbershop staff can view their sync metrics" ON cin7_sync_metrics
FOR SELECT USING (
    barbershop_id IN (
        SELECT barbershop_id FROM barbershop_staff WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Barbershop staff can view their sync alerts" ON cin7_sync_alerts
FOR SELECT USING (
    barbershop_id IN (
        SELECT barbershop_id FROM barbershop_staff WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Barbershop staff can manage their sync alerts" ON cin7_sync_alerts
FOR ALL USING (
    barbershop_id IN (
        SELECT barbershop_id FROM barbershop_staff WHERE user_id = auth.uid()
    )
);

-- Functions for automated sync monitoring and metrics

-- Function to update sync metrics after operations complete
CREATE OR REPLACE FUNCTION update_sync_metrics()
RETURNS TRIGGER AS $$
BEGIN
    -- Only process completed operations
    IF NEW.status NOT IN ('completed', 'failed', 'cancelled') THEN
        RETURN NEW;
    END IF;

    -- Update daily metrics
    INSERT INTO cin7_sync_metrics (
        barbershop_id,
        metric_date,
        total_syncs,
        successful_syncs,
        failed_syncs,
        cancelled_syncs,
        avg_sync_duration_ms,
        avg_items_per_sync,
        avg_success_rate,
        total_items_processed
    )
    VALUES (
        NEW.barbershop_id,
        CURRENT_DATE,
        1,
        CASE WHEN NEW.status = 'completed' THEN 1 ELSE 0 END,
        CASE WHEN NEW.status = 'failed' THEN 1 ELSE 0 END,
        CASE WHEN NEW.status = 'cancelled' THEN 1 ELSE 0 END,
        NEW.duration_ms,
        NEW.processed_items,
        NEW.success_rate,
        NEW.processed_items
    )
    ON CONFLICT (barbershop_id, metric_date, metric_hour)
    DO UPDATE SET
        total_syncs = cin7_sync_metrics.total_syncs + 1,
        successful_syncs = cin7_sync_metrics.successful_syncs + 
            CASE WHEN NEW.status = 'completed' THEN 1 ELSE 0 END,
        failed_syncs = cin7_sync_metrics.failed_syncs + 
            CASE WHEN NEW.status = 'failed' THEN 1 ELSE 0 END,
        cancelled_syncs = cin7_sync_metrics.cancelled_syncs + 
            CASE WHEN NEW.status = 'cancelled' THEN 1 ELSE 0 END,
        avg_sync_duration_ms = (cin7_sync_metrics.avg_sync_duration_ms * cin7_sync_metrics.total_syncs + COALESCE(NEW.duration_ms, 0)) / (cin7_sync_metrics.total_syncs + 1),
        avg_items_per_sync = (cin7_sync_metrics.avg_items_per_sync * cin7_sync_metrics.total_syncs + NEW.processed_items) / (cin7_sync_metrics.total_syncs + 1),
        avg_success_rate = (cin7_sync_metrics.avg_success_rate * cin7_sync_metrics.total_syncs + NEW.success_rate) / (cin7_sync_metrics.total_syncs + 1),
        total_items_processed = cin7_sync_metrics.total_items_processed + NEW.processed_items,
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update metrics when sync operations complete
CREATE TRIGGER trigger_update_sync_metrics
    AFTER UPDATE ON cin7_sync_operations
    FOR EACH ROW
    WHEN (OLD.status != NEW.status AND NEW.status IN ('completed', 'failed', 'cancelled'))
    EXECUTE FUNCTION update_sync_metrics();

-- Function to automatically create alerts for sync failures
CREATE OR REPLACE FUNCTION create_sync_alerts()
RETURNS TRIGGER AS $$
BEGIN
    -- Create alert for failed syncs
    IF NEW.status = 'failed' AND (OLD.status IS NULL OR OLD.status != 'failed') THEN
        INSERT INTO cin7_sync_alerts (
            barbershop_id,
            operation_id,
            alert_type,
            severity,
            title,
            message,
            details
        ) VALUES (
            NEW.barbershop_id,
            NEW.id,
            'sync_failure',
            'error',
            'Sync Operation Failed',
            'A Cin7 sync operation has failed. Please review the error details and retry if necessary.',
            jsonb_build_object(
                'operation_id', NEW.id,
                'sync_mode', NEW.sync_mode,
                'items_processed', NEW.processed_items,
                'error_summary', NEW.error_summary
            )
        );
    END IF;

    -- Create alert for low success rate
    IF NEW.status = 'completed' AND NEW.success_rate < 80 THEN
        INSERT INTO cin7_sync_alerts (
            barbershop_id,
            operation_id,
            alert_type,
            severity,
            title,
            message,
            details
        ) VALUES (
            NEW.barbershop_id,
            NEW.id,
            'low_success_rate',
            'warning',
            'Low Sync Success Rate',
            'Sync completed but with a low success rate. Some items may not have synchronized correctly.',
            jsonb_build_object(
                'operation_id', NEW.id,
                'success_rate', NEW.success_rate,
                'failed_items', NEW.failed_items,
                'total_items', NEW.total_items
            )
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create alerts for sync issues
CREATE TRIGGER trigger_create_sync_alerts
    AFTER UPDATE ON cin7_sync_operations
    FOR EACH ROW
    EXECUTE FUNCTION create_sync_alerts();

-- Helper views for common queries

-- View for active sync operations with progress
CREATE OR REPLACE VIEW active_sync_operations AS
SELECT 
    o.*,
    CASE 
        WHEN o.total_items > 0 THEN ROUND((o.processed_items::decimal / o.total_items * 100), 2)
        ELSE 0 
    END as progress_percentage,
    EXTRACT(EPOCH FROM (NOW() - o.started_at)) as elapsed_seconds,
    c.account_name as cin7_account
FROM cin7_sync_operations o
LEFT JOIN cin7_connections c ON o.connection_id = c.id
WHERE o.status NOT IN ('completed', 'failed', 'cancelled')
ORDER BY o.started_at DESC;

-- View for sync performance summary
CREATE OR REPLACE VIEW sync_performance_summary AS
SELECT 
    barbershop_id,
    COUNT(*) as total_operations,
    COUNT(*) FILTER (WHERE status = 'completed') as successful_operations,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_operations,
    ROUND(AVG(success_rate), 2) as avg_success_rate,
    ROUND(AVG(duration_ms) / 1000, 2) as avg_duration_seconds,
    MAX(started_at) as last_sync_at,
    SUM(processed_items) as total_items_synced
FROM cin7_sync_operations
WHERE started_at >= NOW() - INTERVAL '30 days'
GROUP BY barbershop_id;

-- View for recent sync alerts
CREATE OR REPLACE VIEW recent_sync_alerts AS
SELECT 
    a.*,
    o.sync_mode,
    o.started_at as sync_started_at,
    o.status as sync_status
FROM cin7_sync_alerts a
LEFT JOIN cin7_sync_operations o ON a.operation_id = o.id
WHERE a.created_at >= NOW() - INTERVAL '7 days'
ORDER BY a.created_at DESC;

-- Function to cleanup old sync data (for maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_sync_data(days_to_keep INTEGER DEFAULT 90)
RETURNS TABLE (
    deleted_operations INTEGER,
    deleted_batch_logs INTEGER,
    deleted_metrics INTEGER
) AS $$
DECLARE
    cutoff_date TIMESTAMPTZ := NOW() - (days_to_keep || ' days')::INTERVAL;
    operations_deleted INTEGER;
    batch_logs_deleted INTEGER;
    metrics_deleted INTEGER;
BEGIN
    -- Delete old batch logs first (due to foreign key constraints)
    DELETE FROM cin7_batch_logs 
    WHERE started_at < cutoff_date;
    GET DIAGNOSTICS batch_logs_deleted = ROW_COUNT;

    -- Delete old sync operations
    DELETE FROM cin7_sync_operations 
    WHERE started_at < cutoff_date 
    AND status IN ('completed', 'failed', 'cancelled');
    GET DIAGNOSTICS operations_deleted = ROW_COUNT;

    -- Delete old metrics (keep at least 6 months)
    DELETE FROM cin7_sync_metrics 
    WHERE created_at < cutoff_date 
    AND metric_date < CURRENT_DATE - INTERVAL '180 days';
    GET DIAGNOSTICS metrics_deleted = ROW_COUNT;

    RETURN QUERY SELECT operations_deleted, batch_logs_deleted, metrics_deleted;
END;
$$ LANGUAGE plpgsql;