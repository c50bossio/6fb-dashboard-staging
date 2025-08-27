-- Webhook Security Tables
-- Support for replay attack prevention, security logging, and audit trails

-- Table to track processed webhook events (prevent replay attacks)
CREATE TABLE IF NOT EXISTS processed_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_event_id TEXT UNIQUE NOT NULL,
    event_timestamp TIMESTAMPTZ NOT NULL,
    processed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    processing_duration_ms INTEGER,
    success BOOLEAN DEFAULT true,
    error_message TEXT
);

-- Table to log webhook security events
CREATE TABLE IF NOT EXISTS webhook_security_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'info',
    details JSONB NOT NULL,
    client_ip INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Table to track webhook processing statistics
CREATE TABLE IF NOT EXISTS webhook_processing_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    processing_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_events INTEGER DEFAULT 0,
    successful_events INTEGER DEFAULT 0,
    failed_events INTEGER DEFAULT 0,
    avg_processing_time_ms DECIMAL(10,2) DEFAULT 0,
    total_commission_amount DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(event_type, processing_date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_processed_webhook_events_stripe_id ON processed_webhook_events(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_processed_webhook_events_timestamp ON processed_webhook_events(event_timestamp);
CREATE INDEX IF NOT EXISTS idx_processed_webhook_events_processed_at ON processed_webhook_events(processed_at);

CREATE INDEX IF NOT EXISTS idx_webhook_security_logs_event_type ON webhook_security_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_security_logs_severity ON webhook_security_logs(severity);
CREATE INDEX IF NOT EXISTS idx_webhook_security_logs_created_at ON webhook_security_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_webhook_processing_stats_event_type ON webhook_processing_stats(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_processing_stats_date ON webhook_processing_stats(processing_date);

-- Enable Row Level Security
ALTER TABLE processed_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_security_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_processing_stats ENABLE ROW LEVEL SECURITY;

-- RLS policies for processed_webhook_events
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'processed_webhook_events' 
        AND policyname = 'System can manage webhook event tracking'
    ) THEN
        CREATE POLICY "System can manage webhook event tracking" ON processed_webhook_events
            FOR ALL TO authenticated
            USING (true);
    END IF;
EXCEPTION
    WHEN others THEN
        NULL;
END $$;

-- RLS policies for webhook_security_logs
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'webhook_security_logs' 
        AND policyname = 'Admin users can view security logs'
    ) THEN
        CREATE POLICY "Admin users can view security logs" ON webhook_security_logs
            FOR SELECT TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM profiles 
                    WHERE profiles.id = auth.uid() 
                    AND profiles.is_admin = true
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'webhook_security_logs' 
        AND policyname = 'System can insert security logs'
    ) THEN
        CREATE POLICY "System can insert security logs" ON webhook_security_logs
            FOR INSERT TO authenticated
            WITH CHECK (true);
    END IF;
EXCEPTION
    WHEN others THEN
        NULL;
END $$;

-- RLS policies for webhook_processing_stats
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'webhook_processing_stats' 
        AND policyname = 'Admin users can view processing stats'
    ) THEN
        CREATE POLICY "Admin users can view processing stats" ON webhook_processing_stats
            FOR SELECT TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM profiles 
                    WHERE profiles.id = auth.uid() 
                    AND profiles.is_admin = true
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'webhook_processing_stats' 
        AND policyname = 'System can manage processing stats'
    ) THEN
        CREATE POLICY "System can manage processing stats" ON webhook_processing_stats
            FOR ALL TO authenticated
            USING (true);
    END IF;
EXCEPTION
    WHEN others THEN
        NULL;
END $$;

-- Add check constraints
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'webhook_security_logs_severity_check'
    ) THEN
        ALTER TABLE webhook_security_logs 
        ADD CONSTRAINT webhook_security_logs_severity_check 
        CHECK (severity IN ('info', 'warning', 'error', 'critical'));
    END IF;
EXCEPTION
    WHEN others THEN
        NULL;
END $$;

-- Function to update webhook processing statistics
CREATE OR REPLACE FUNCTION update_webhook_stats(
    p_event_type TEXT,
    p_success BOOLEAN,
    p_processing_time_ms INTEGER,
    p_commission_amount DECIMAL DEFAULT 0
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO webhook_processing_stats (
        event_type,
        processing_date,
        total_events,
        successful_events,
        failed_events,
        avg_processing_time_ms,
        total_commission_amount,
        updated_at
    ) VALUES (
        p_event_type,
        CURRENT_DATE,
        1,
        CASE WHEN p_success THEN 1 ELSE 0 END,
        CASE WHEN p_success THEN 0 ELSE 1 END,
        p_processing_time_ms,
        COALESCE(p_commission_amount, 0),
        NOW()
    )
    ON CONFLICT (event_type, processing_date) DO UPDATE SET
        total_events = webhook_processing_stats.total_events + 1,
        successful_events = webhook_processing_stats.successful_events + CASE WHEN p_success THEN 1 ELSE 0 END,
        failed_events = webhook_processing_stats.failed_events + CASE WHEN p_success THEN 0 ELSE 1 END,
        avg_processing_time_ms = (
            webhook_processing_stats.avg_processing_time_ms * webhook_processing_stats.total_events + p_processing_time_ms
        ) / (webhook_processing_stats.total_events + 1),
        total_commission_amount = webhook_processing_stats.total_commission_amount + COALESCE(p_commission_amount, 0),
        updated_at = NOW();
END;
$$;

-- Function to get webhook processing health metrics
CREATE OR REPLACE FUNCTION get_webhook_health_metrics(days_back INTEGER DEFAULT 7)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSON;
BEGIN
    WITH stats AS (
        SELECT 
            event_type,
            SUM(total_events) as total_events,
            SUM(successful_events) as successful_events,
            SUM(failed_events) as failed_events,
            AVG(avg_processing_time_ms) as avg_processing_time,
            SUM(total_commission_amount) as total_commissions
        FROM webhook_processing_stats
        WHERE processing_date >= CURRENT_DATE - INTERVAL '%d days' USING days_back
        GROUP BY event_type
    ),
    overall_stats AS (
        SELECT 
            SUM(total_events) as overall_total,
            SUM(successful_events) as overall_successful,
            SUM(failed_events) as overall_failed,
            CASE 
                WHEN SUM(total_events) > 0 THEN 
                    ROUND((SUM(successful_events)::DECIMAL / SUM(total_events) * 100), 2)
                ELSE 0 
            END as success_rate,
            SUM(total_commissions) as total_commissions_processed
        FROM stats
    )
    SELECT json_build_object(
        'period_days', days_back,
        'overall_metrics', row_to_json(overall_stats.*),
        'by_event_type', json_agg(row_to_json(stats.*)),
        'generated_at', NOW()
    )
    INTO v_result
    FROM overall_stats, stats;
    
    RETURN COALESCE(v_result, '{"error": "No data available"}'::json);
END;
$$;

-- Function to clean up old webhook security data
CREATE OR REPLACE FUNCTION cleanup_webhook_security_data(days_to_keep INTEGER DEFAULT 30)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_events_cleaned INTEGER;
    v_logs_cleaned INTEGER;
    v_result JSON;
BEGIN
    -- Clean up old processed events
    DELETE FROM processed_webhook_events 
    WHERE processed_at < NOW() - INTERVAL '%d days' USING days_to_keep;
    GET DIAGNOSTICS v_events_cleaned = ROW_COUNT;
    
    -- Clean up old security logs
    DELETE FROM webhook_security_logs 
    WHERE created_at < NOW() - INTERVAL '%d days' USING days_to_keep;
    GET DIAGNOSTICS v_logs_cleaned = ROW_COUNT;
    
    -- Keep processing stats longer (90 days minimum)
    DELETE FROM webhook_processing_stats 
    WHERE processing_date < CURRENT_DATE - INTERVAL '%d days' USING GREATEST(days_to_keep, 90);
    
    v_result := json_build_object(
        'events_cleaned', v_events_cleaned,
        'logs_cleaned', v_logs_cleaned,
        'days_kept', days_to_keep,
        'cleaned_at', NOW()
    );
    
    RETURN v_result;
END;
$$;

-- Add trigger to automatically update updated_at for webhook_processing_stats
CREATE OR REPLACE FUNCTION update_webhook_stats_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_webhook_processing_stats_updated_at'
    ) THEN
        CREATE TRIGGER update_webhook_processing_stats_updated_at 
            BEFORE UPDATE ON webhook_processing_stats 
            FOR EACH ROW EXECUTE FUNCTION update_webhook_stats_updated_at();
    END IF;
EXCEPTION
    WHEN others THEN
        NULL;
END $$;

-- Final success check
DO $$
DECLARE
    tables_created INTEGER;
BEGIN
    SELECT COUNT(*) INTO tables_created
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('processed_webhook_events', 'webhook_security_logs', 'webhook_processing_stats');
    
    IF tables_created = 3 THEN
        RAISE NOTICE '✅ SUCCESS: All 3 webhook security tables created successfully!';
    ELSE
        RAISE NOTICE '⚠️  WARNING: Only % of 3 tables created. Please check for errors.', tables_created;
    END IF;
END $$;