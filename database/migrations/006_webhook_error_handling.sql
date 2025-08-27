-- Webhook Error Handling and Dead Letter Queue Tables
-- Production-ready error tracking and recovery for webhook processing

-- Commission processing errors table
CREATE TABLE IF NOT EXISTS commission_processing_errors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_intent_id TEXT NOT NULL,
    error_type TEXT NOT NULL,
    error_message TEXT NOT NULL,
    error_stack TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- General webhook failures table
CREATE TABLE IF NOT EXISTS webhook_failures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operation_type TEXT NOT NULL,
    payment_intent_id TEXT,
    barber_id UUID,
    barbershop_id UUID,
    error_message TEXT NOT NULL,
    error_stack TEXT,
    context JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Dead letter queue for failed webhook events
CREATE TABLE IF NOT EXISTS webhook_dead_letter_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    event_data JSONB NOT NULL,
    failure_reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending_manual_review',
    retry_count INTEGER DEFAULT 0,
    last_error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    processed_at TIMESTAMPTZ
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_commission_processing_errors_payment_intent ON commission_processing_errors(payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_commission_processing_errors_type ON commission_processing_errors(error_type);
CREATE INDEX IF NOT EXISTS idx_commission_processing_errors_created_at ON commission_processing_errors(created_at);

CREATE INDEX IF NOT EXISTS idx_webhook_failures_operation_type ON webhook_failures(operation_type);
CREATE INDEX IF NOT EXISTS idx_webhook_failures_payment_intent ON webhook_failures(payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_webhook_failures_created_at ON webhook_failures(created_at);

CREATE INDEX IF NOT EXISTS idx_webhook_dead_letter_queue_status ON webhook_dead_letter_queue(status);
CREATE INDEX IF NOT EXISTS idx_webhook_dead_letter_queue_event_type ON webhook_dead_letter_queue(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_dead_letter_queue_created_at ON webhook_dead_letter_queue(created_at);

-- Enable Row Level Security
ALTER TABLE commission_processing_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_failures ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_dead_letter_queue ENABLE ROW LEVEL SECURITY;

-- RLS policies for commission_processing_errors
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'commission_processing_errors' 
        AND policyname = 'Admin users can view commission errors'
    ) THEN
        CREATE POLICY "Admin users can view commission errors" ON commission_processing_errors
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
        WHERE tablename = 'commission_processing_errors' 
        AND policyname = 'System can insert commission errors'
    ) THEN
        CREATE POLICY "System can insert commission errors" ON commission_processing_errors
            FOR INSERT TO authenticated
            WITH CHECK (true);
    END IF;
EXCEPTION
    WHEN others THEN
        NULL;
END $$;

-- RLS policies for webhook_failures (similar pattern)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'webhook_failures' 
        AND policyname = 'Admin users can view webhook failures'
    ) THEN
        CREATE POLICY "Admin users can view webhook failures" ON webhook_failures
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
        WHERE tablename = 'webhook_failures' 
        AND policyname = 'System can insert webhook failures'
    ) THEN
        CREATE POLICY "System can insert webhook failures" ON webhook_failures
            FOR INSERT TO authenticated
            WITH CHECK (true);
    END IF;
EXCEPTION
    WHEN others THEN
        NULL;
END $$;

-- RLS policies for webhook_dead_letter_queue
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'webhook_dead_letter_queue' 
        AND policyname = 'Admin users can manage dead letter queue'
    ) THEN
        CREATE POLICY "Admin users can manage dead letter queue" ON webhook_dead_letter_queue
            FOR ALL TO authenticated
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
        WHERE tablename = 'webhook_dead_letter_queue' 
        AND policyname = 'System can insert dead letter records'
    ) THEN
        CREATE POLICY "System can insert dead letter records" ON webhook_dead_letter_queue
            FOR INSERT TO authenticated
            WITH CHECK (true);
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
        WHERE conname = 'webhook_dead_letter_queue_status_check'
    ) THEN
        ALTER TABLE webhook_dead_letter_queue 
        ADD CONSTRAINT webhook_dead_letter_queue_status_check 
        CHECK (status IN ('pending_manual_review', 'processing', 'processed', 'failed_reprocessing', 'abandoned'));
    END IF;
EXCEPTION
    WHEN others THEN
        NULL;
END $$;

-- Function to update barber balance atomically (used by retry manager)
CREATE OR REPLACE FUNCTION update_barber_balance(
    p_barber_id UUID,
    p_barbershop_id UUID,
    p_amount DECIMAL(10,2),
    p_transaction_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_balance_record RECORD;
    v_result JSON;
BEGIN
    -- Try to update existing balance
    UPDATE barber_commission_balances 
    SET 
        pending_amount = COALESCE(pending_amount, 0) + p_amount,
        total_earned = COALESCE(total_earned, 0) + p_amount,
        last_transaction_at = NOW(),
        updated_at = NOW()
    WHERE barber_id = p_barber_id 
    AND barbershop_id = p_barbershop_id
    RETURNING * INTO v_balance_record;
    
    -- If no existing record, insert new one
    IF v_balance_record IS NULL THEN
        INSERT INTO barber_commission_balances (
            barber_id,
            barbershop_id,
            pending_amount,
            paid_amount,
            total_earned,
            last_transaction_at,
            created_at
        ) VALUES (
            p_barber_id,
            p_barbershop_id,
            p_amount,
            0,
            p_amount,
            NOW(),
            NOW()
        )
        RETURNING * INTO v_balance_record;
    END IF;
    
    -- Return success result
    v_result := json_build_object(
        'success', true,
        'balance_id', v_balance_record.id,
        'pending_amount', v_balance_record.pending_amount,
        'total_earned', v_balance_record.total_earned
    );
    
    RETURN v_result;
    
EXCEPTION WHEN OTHERS THEN
    -- Return error result
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM,
        'error_code', SQLSTATE
    );
END;
$$;

-- Function to clean up old error records (run periodically)
CREATE OR REPLACE FUNCTION cleanup_webhook_errors()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_cleaned_count INTEGER;
BEGIN
    -- Clean up commission processing errors older than 30 days
    DELETE FROM commission_processing_errors 
    WHERE created_at < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS v_cleaned_count = ROW_COUNT;
    
    -- Clean up webhook failures older than 30 days
    DELETE FROM webhook_failures 
    WHERE created_at < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS v_cleaned_count = v_cleaned_count + ROW_COUNT;
    
    -- Clean up processed dead letter queue items older than 7 days
    DELETE FROM webhook_dead_letter_queue 
    WHERE status = 'processed' 
    AND processed_at < NOW() - INTERVAL '7 days';
    
    GET DIAGNOSTICS v_cleaned_count = v_cleaned_count + ROW_COUNT;
    
    RETURN v_cleaned_count;
END;
$$;

-- Final success check
DO $$
DECLARE
    tables_created INTEGER;
BEGIN
    SELECT COUNT(*) INTO tables_created
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('commission_processing_errors', 'webhook_failures', 'webhook_dead_letter_queue');
    
    IF tables_created = 3 THEN
        RAISE NOTICE '✅ SUCCESS: All 3 webhook error handling tables created successfully!';
    ELSE
        RAISE NOTICE '⚠️  WARNING: Only % of 3 tables created. Please check for errors.', tables_created;
    END IF;
END $$;