-- ==========================================
-- 6FB AI AGENT SYSTEM - AUTOMATION STORED PROCEDURES
-- ==========================================
-- High-Performance Database Procedures for Automation System
-- Optimized for concurrent processing and batch operations
-- Date: 2025-08-28
-- ==========================================

-- ==========================================
-- TASK QUEUE MANAGEMENT PROCEDURES
-- ==========================================

-- Atomic task claiming for distributed processing
CREATE OR REPLACE FUNCTION claim_automation_tasks(
  batch_size INTEGER DEFAULT 10,
  worker_id TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  barbershop_id UUID,
  task_type automation_type,
  priority task_priority,
  payload JSONB,
  client_id UUID,
  appointment_id UUID,
  scheduled_for TIMESTAMP WITH TIME ZONE
) 
LANGUAGE plpgsql AS $$
DECLARE
  actual_worker_id TEXT;
BEGIN
  -- Generate worker ID if not provided
  IF worker_id IS NULL THEN
    actual_worker_id := 'worker_' || extract(epoch from now()) || '_' || floor(random() * 1000);
  ELSE
    actual_worker_id := worker_id;
  END IF;

  -- Claim tasks atomically using FOR UPDATE SKIP LOCKED
  RETURN QUERY
  UPDATE automation_queue 
  SET 
    status = 'PROCESSING',
    assigned_worker_id = actual_worker_id,
    processing_started_at = NOW(),
    updated_at = NOW()
  FROM (
    SELECT automation_queue.id
    FROM automation_queue
    WHERE status = 'PENDING' 
    AND scheduled_for <= NOW()
    AND (expires_at IS NULL OR expires_at > NOW())
    ORDER BY 
      priority DESC,
      scheduled_for ASC
    LIMIT batch_size
    FOR UPDATE SKIP LOCKED
  ) AS selected
  WHERE automation_queue.id = selected.id
  RETURNING 
    automation_queue.id,
    automation_queue.barbershop_id,
    automation_queue.task_type,
    automation_queue.priority,
    automation_queue.payload,
    automation_queue.client_id,
    automation_queue.appointment_id,
    automation_queue.scheduled_for;
END $$;

-- Bulk task completion with metrics update
CREATE OR REPLACE FUNCTION complete_automation_tasks(
  task_results JSONB
)
RETURNS INTEGER
LANGUAGE plpgsql AS $$
DECLARE
  task_record JSONB;
  completed_count INTEGER := 0;
  task_id UUID;
  task_status processing_status;
  execution_result JSONB;
  error_msg TEXT;
BEGIN
  -- Process each task result
  FOR task_record IN SELECT * FROM jsonb_array_elements(task_results)
  LOOP
    task_id := (task_record->>'id')::UUID;
    task_status := (task_record->>'status')::processing_status;
    execution_result := task_record->'result';
    error_msg := task_record->>'error';

    -- Update automation_queue
    UPDATE automation_queue
    SET 
      status = task_status,
      processing_completed_at = NOW(),
      updated_at = NOW(),
      last_error = CASE WHEN task_status = 'FAILED' THEN error_msg ELSE NULL END
    WHERE id = task_id;

    -- If task completed, increment counter
    IF task_status IN ('COMPLETED', 'FAILED') THEN
      completed_count := completed_count + 1;
    END IF;
  END LOOP;

  RETURN completed_count;
END $$;

-- Retry failed tasks with exponential backoff
CREATE OR REPLACE FUNCTION retry_failed_tasks(
  max_retries INTEGER DEFAULT 3,
  min_backoff_minutes INTEGER DEFAULT 5
)
RETURNS INTEGER
LANGUAGE plpgsql AS $$
DECLARE
  retried_count INTEGER;
  backoff_interval INTERVAL;
BEGIN
  -- Calculate backoff interval based on attempt count
  FOR i IN 1..max_retries LOOP
    backoff_interval := (min_backoff_minutes * POWER(2, i - 1)) * INTERVAL '1 minute';
    
    UPDATE automation_queue
    SET 
      status = 'PENDING',
      scheduled_for = NOW() + backoff_interval,
      assigned_worker_id = NULL,
      processing_started_at = NULL,
      updated_at = NOW()
    WHERE status = 'FAILED'
    AND attempts < max_attempts
    AND updated_at < NOW() - backoff_interval;
  END LOOP;

  GET DIAGNOSTICS retried_count = ROW_COUNT;
  RETURN retried_count;
END $$;

-- ==========================================
-- METRICS AND ANALYTICS PROCEDURES
-- ==========================================

-- Aggregate automation metrics (called by trigger or scheduled job)
CREATE OR REPLACE FUNCTION aggregate_automation_metrics(
  target_date DATE DEFAULT CURRENT_DATE,
  target_hour INTEGER DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql AS $$
DECLARE
  start_time TIMESTAMP WITH TIME ZONE;
  end_time TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Set time boundaries
  IF target_hour IS NULL THEN
    -- Daily aggregation
    start_time := target_date::timestamp;
    end_time := start_time + INTERVAL '1 day';
  ELSE
    -- Hourly aggregation
    start_time := target_date::timestamp + (target_hour || ' hours')::interval;
    end_time := start_time + INTERVAL '1 hour';
  END IF;

  -- Insert or update metrics
  INSERT INTO automation_metrics (
    barbershop_id,
    metric_date,
    metric_hour,
    automation_type,
    total_executions,
    successful_executions,
    failed_executions,
    avg_execution_time_ms,
    total_execution_time_ms,
    total_revenue_cents,
    total_cost_cents
  )
  SELECT 
    al.barbershop_id,
    target_date,
    target_hour,
    al.automation_type,
    COUNT(*) as total_executions,
    COUNT(*) FILTER (WHERE al.status = 'COMPLETED') as successful_executions,
    COUNT(*) FILTER (WHERE al.status = 'FAILED') as failed_executions,
    AVG(al.execution_time_ms) as avg_execution_time_ms,
    SUM(al.execution_time_ms) as total_execution_time_ms,
    COALESCE(SUM(pa.amount_cents) FILTER (WHERE pa.status = 'COMPLETED'), 0) as total_revenue_cents,
    COALESCE(SUM(rs.cost_cents), 0) as total_cost_cents
  FROM automation_logs al
  LEFT JOIN payment_attempts pa ON al.id = pa.automation_log_id
  LEFT JOIN reminder_schedule rs ON al.id = rs.automation_log_id
  WHERE al.created_at >= start_time 
  AND al.created_at < end_time
  AND al.status IN ('COMPLETED', 'FAILED')
  GROUP BY al.barbershop_id, al.automation_type
  
  ON CONFLICT (barbershop_id, metric_date, automation_type) 
  WHERE (target_hour IS NULL AND metric_hour IS NULL) 
     OR (target_hour IS NOT NULL AND metric_hour = target_hour)
  DO UPDATE SET
    total_executions = EXCLUDED.total_executions,
    successful_executions = EXCLUDED.successful_executions,
    failed_executions = EXCLUDED.failed_executions,
    avg_execution_time_ms = EXCLUDED.avg_execution_time_ms,
    total_execution_time_ms = EXCLUDED.total_execution_time_ms,
    total_revenue_cents = EXCLUDED.total_revenue_cents,
    total_cost_cents = EXCLUDED.total_cost_cents,
    updated_at = NOW();
    
  -- Log aggregation completion
  INSERT INTO automation_logs (
    barbershop_id,
    automation_type,
    status,
    triggered_by,
    input_parameters,
    execution_result,
    execution_time_ms
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', -- System barbershop ID
    'RISK_ASSESSMENT', -- Use as system task type
    'COMPLETED',
    'SYSTEM',
    jsonb_build_object('task', 'metrics_aggregation', 'date', target_date, 'hour', target_hour),
    jsonb_build_object('aggregated_records', (SELECT COUNT(*) FROM automation_metrics WHERE metric_date = target_date)),
    extract(epoch from (clock_timestamp() - statement_timestamp())) * 1000
  );
END $$;

-- Get automation performance summary
CREATE OR REPLACE FUNCTION get_automation_performance_summary(
  target_barbershop_id UUID,
  time_range_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
  automation_type automation_type,
  total_executions BIGINT,
  successful_executions BIGINT,
  failed_executions BIGINT,
  success_rate_pct NUMERIC,
  avg_execution_time_ms NUMERIC,
  p50_execution_time_ms NUMERIC,
  p95_execution_time_ms NUMERIC,
  p99_execution_time_ms NUMERIC,
  total_revenue_cents BIGINT,
  total_cost_cents BIGINT,
  roi_ratio NUMERIC
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT 
    al.automation_type,
    COUNT(*) as total_executions,
    COUNT(*) FILTER (WHERE al.status = 'COMPLETED') as successful_executions,
    COUNT(*) FILTER (WHERE al.status = 'FAILED') as failed_executions,
    ROUND(
      (COUNT(*) FILTER (WHERE al.status = 'COMPLETED') * 100.0) / COUNT(*)::numeric, 
      2
    ) as success_rate_pct,
    ROUND(AVG(al.execution_time_ms)::numeric, 2) as avg_execution_time_ms,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY al.execution_time_ms) as p50_execution_time_ms,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY al.execution_time_ms) as p95_execution_time_ms,
    PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY al.execution_time_ms) as p99_execution_time_ms,
    COALESCE(SUM(pa.amount_cents) FILTER (WHERE pa.status = 'COMPLETED'), 0) as total_revenue_cents,
    COALESCE(SUM(rs.cost_cents), 0) as total_cost_cents,
    CASE 
      WHEN COALESCE(SUM(rs.cost_cents), 0) > 0 
      THEN ROUND(
        (COALESCE(SUM(pa.amount_cents) FILTER (WHERE pa.status = 'COMPLETED'), 0)::numeric / 
         COALESCE(SUM(rs.cost_cents), 1)::numeric), 
        2
      )
      ELSE NULL 
    END as roi_ratio
  FROM automation_logs al
  LEFT JOIN payment_attempts pa ON al.id = pa.automation_log_id
  LEFT JOIN reminder_schedule rs ON al.id = rs.automation_log_id
  WHERE al.barbershop_id = target_barbershop_id
  AND al.created_at >= NOW() - (time_range_hours || ' hours')::interval
  GROUP BY al.automation_type
  ORDER BY total_executions DESC;
END $$;

-- ==========================================
-- DATA MANAGEMENT PROCEDURES
-- ==========================================

-- Comprehensive data cleanup with retention policies
CREATE OR REPLACE FUNCTION cleanup_automation_data(
  dry_run BOOLEAN DEFAULT TRUE
)
RETURNS TABLE (
  table_name TEXT,
  action TEXT,
  records_affected BIGINT,
  retention_policy TEXT
)
LANGUAGE plpgsql AS $$
DECLARE
  cleanup_count BIGINT;
BEGIN
  -- Cleanup automation_logs (90 days retention)
  IF dry_run THEN
    SELECT COUNT(*) INTO cleanup_count
    FROM automation_logs 
    WHERE created_at < NOW() - INTERVAL '90 days';
  ELSE
    DELETE FROM automation_logs 
    WHERE created_at < NOW() - INTERVAL '90 days';
    GET DIAGNOSTICS cleanup_count = ROW_COUNT;
  END IF;
  
  RETURN QUERY SELECT 
    'automation_logs'::TEXT, 
    CASE WHEN dry_run THEN 'DRY_RUN' ELSE 'DELETE' END::TEXT,
    cleanup_count,
    '90 days'::TEXT;

  -- Cleanup completed queue items (30 days retention)
  IF dry_run THEN
    SELECT COUNT(*) INTO cleanup_count
    FROM automation_queue 
    WHERE status IN ('COMPLETED', 'CANCELLED', 'EXPIRED') 
    AND processing_completed_at < NOW() - INTERVAL '30 days';
  ELSE
    DELETE FROM automation_queue 
    WHERE status IN ('COMPLETED', 'CANCELLED', 'EXPIRED') 
    AND processing_completed_at < NOW() - INTERVAL '30 days';
    GET DIAGNOSTICS cleanup_count = ROW_COUNT;
  END IF;
  
  RETURN QUERY SELECT 
    'automation_queue'::TEXT,
    CASE WHEN dry_run THEN 'DRY_RUN' ELSE 'DELETE' END::TEXT,
    cleanup_count,
    '30 days after completion'::TEXT;

  -- Cleanup old reminder schedules (1 year retention)
  IF dry_run THEN
    SELECT COUNT(*) INTO cleanup_count
    FROM reminder_schedule 
    WHERE created_at < NOW() - INTERVAL '1 year';
  ELSE
    DELETE FROM reminder_schedule 
    WHERE created_at < NOW() - INTERVAL '1 year';
    GET DIAGNOSTICS cleanup_count = ROW_COUNT;
  END IF;
  
  RETURN QUERY SELECT 
    'reminder_schedule'::TEXT,
    CASE WHEN dry_run THEN 'DRY_RUN' ELSE 'DELETE' END::TEXT,
    cleanup_count,
    '1 year'::TEXT;

  -- Cleanup expired risk scores (2 years retention)
  IF dry_run THEN
    SELECT COUNT(*) INTO cleanup_count
    FROM risk_scores 
    WHERE created_at < NOW() - INTERVAL '2 years';
  ELSE
    DELETE FROM risk_scores 
    WHERE created_at < NOW() - INTERVAL '2 years';
    GET DIAGNOSTICS cleanup_count = ROW_COUNT;
  END IF;
  
  RETURN QUERY SELECT 
    'risk_scores'::TEXT,
    CASE WHEN dry_run THEN 'DRY_RUN' ELSE 'DELETE' END::TEXT,
    cleanup_count,
    '2 years'::TEXT;

  -- Cleanup old metrics (3 years retention, but aggregate first)
  IF NOT dry_run THEN
    -- First aggregate any daily metrics that haven't been aggregated
    PERFORM aggregate_automation_metrics(d::date)
    FROM generate_series(
      CURRENT_DATE - INTERVAL '7 days',
      CURRENT_DATE - INTERVAL '1 day',
      '1 day'::interval
    ) d;
  END IF;

  IF dry_run THEN
    SELECT COUNT(*) INTO cleanup_count
    FROM automation_metrics 
    WHERE metric_date < CURRENT_DATE - INTERVAL '3 years';
  ELSE
    DELETE FROM automation_metrics 
    WHERE metric_date < CURRENT_DATE - INTERVAL '3 years';
    GET DIAGNOSTICS cleanup_count = ROW_COUNT;
  END IF;
  
  RETURN QUERY SELECT 
    'automation_metrics'::TEXT,
    CASE WHEN dry_run THEN 'DRY_RUN' ELSE 'DELETE' END::TEXT,
    cleanup_count,
    '3 years'::TEXT;

  -- Note: payment_attempts kept for 7 years (compliance)
  -- Note: automation_overrides kept permanently (audit trail)
  
  RETURN QUERY SELECT 
    'payment_attempts'::TEXT,
    'RETAINED'::TEXT,
    0::BIGINT,
    '7 years (compliance)'::TEXT;
    
  RETURN QUERY SELECT 
    'automation_overrides'::TEXT,
    'RETAINED'::TEXT,
    0::BIGINT,
    'Permanent (audit trail)'::TEXT;
END $$;

-- Recovery procedure for stuck tasks
CREATE OR REPLACE FUNCTION recover_stuck_automation_tasks(
  stuck_threshold_minutes INTEGER DEFAULT 15
)
RETURNS TABLE (
  action TEXT,
  task_count INTEGER,
  details JSONB
)
LANGUAGE plpgsql AS $$
DECLARE
  recovered_count INTEGER;
  expired_count INTEGER;
  stuck_details JSONB;
BEGIN
  -- Get details of stuck tasks before recovery
  SELECT jsonb_agg(jsonb_build_object(
    'id', id,
    'task_type', task_type,
    'barbershop_id', barbershop_id,
    'stuck_duration_minutes', extract(epoch from (NOW() - processing_started_at)) / 60,
    'attempts', attempts
  )) INTO stuck_details
  FROM automation_queue
  WHERE status = 'PROCESSING'
  AND processing_started_at < NOW() - (stuck_threshold_minutes || ' minutes')::interval;

  -- Reset tasks that can be retried
  UPDATE automation_queue
  SET 
    status = 'PENDING',
    assigned_worker_id = NULL,
    processing_started_at = NULL,
    attempts = attempts + 1,
    scheduled_for = NOW() + INTERVAL '5 minutes', -- Backoff
    updated_at = NOW()
  WHERE status = 'PROCESSING'
  AND processing_started_at < NOW() - (stuck_threshold_minutes || ' minutes')::interval
  AND attempts < max_attempts;
  
  GET DIAGNOSTICS recovered_count = ROW_COUNT;

  -- Mark permanently failed tasks as expired
  UPDATE automation_queue
  SET 
    status = 'EXPIRED',
    processing_completed_at = NOW(),
    last_error = 'Task exceeded maximum processing time and retry attempts',
    updated_at = NOW()
  WHERE status = 'PROCESSING'
  AND processing_started_at < NOW() - (stuck_threshold_minutes || ' minutes')::interval
  AND attempts >= max_attempts;
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;

  -- Return recovery summary
  RETURN QUERY SELECT 
    'RECOVERED'::TEXT, 
    recovered_count,
    jsonb_build_object(
      'threshold_minutes', stuck_threshold_minutes,
      'recovered_for_retry', recovered_count,
      'details', stuck_details
    );
    
  RETURN QUERY SELECT 
    'EXPIRED'::TEXT, 
    expired_count,
    jsonb_build_object(
      'reason', 'exceeded_max_attempts',
      'expired_count', expired_count
    );
END $$;

-- ==========================================
-- MONITORING AND HEALTH CHECK PROCEDURES
-- ==========================================

-- Comprehensive system health check
CREATE OR REPLACE FUNCTION check_automation_system_health()
RETURNS TABLE (
  component TEXT,
  status TEXT,
  metric_name TEXT,
  metric_value NUMERIC,
  threshold NUMERIC,
  is_healthy BOOLEAN,
  details JSONB
)
LANGUAGE plpgsql AS $$
BEGIN
  -- Queue Health
  RETURN QUERY
  WITH queue_metrics AS (
    SELECT 
      COUNT(*) FILTER (WHERE status = 'PENDING') as pending_tasks,
      COUNT(*) FILTER (WHERE status = 'PROCESSING') as processing_tasks,
      COUNT(*) FILTER (WHERE status = 'FAILED') as failed_tasks,
      COALESCE(AVG(EXTRACT(EPOCH FROM (NOW() - created_at))), 0) as avg_age_seconds
    FROM automation_queue
    WHERE created_at >= NOW() - INTERVAL '1 hour'
  )
  SELECT 
    'QUEUE'::TEXT,
    CASE WHEN avg_age_seconds < 300 THEN 'HEALTHY' ELSE 'DEGRADED' END::TEXT,
    'avg_task_age_seconds'::TEXT,
    avg_age_seconds::NUMERIC,
    300::NUMERIC, -- 5 minutes threshold
    (avg_age_seconds < 300)::BOOLEAN,
    jsonb_build_object(
      'pending_tasks', pending_tasks,
      'processing_tasks', processing_tasks,
      'failed_tasks', failed_tasks,
      'avg_age_seconds', avg_age_seconds
    )
  FROM queue_metrics;

  -- Execution Performance
  RETURN QUERY
  WITH perf_metrics AS (
    SELECT 
      COUNT(*) as executions_last_hour,
      COALESCE(AVG(execution_time_ms), 0) as avg_execution_time_ms,
      COUNT(*) FILTER (WHERE status = 'COMPLETED') as successful_executions
    FROM automation_logs
    WHERE created_at >= NOW() - INTERVAL '1 hour'
  )
  SELECT 
    'PERFORMANCE'::TEXT,
    CASE WHEN avg_execution_time_ms < 5000 THEN 'HEALTHY' ELSE 'SLOW' END::TEXT,
    'avg_execution_time_ms'::TEXT,
    avg_execution_time_ms::NUMERIC,
    5000::NUMERIC, -- 5 seconds threshold
    (avg_execution_time_ms < 5000)::BOOLEAN,
    jsonb_build_object(
      'executions_last_hour', executions_last_hour,
      'avg_execution_time_ms', avg_execution_time_ms,
      'success_rate', CASE WHEN executions_last_hour > 0 THEN successful_executions::float / executions_last_hour ELSE 0 END
    )
  FROM perf_metrics;

  -- Payment Processing
  RETURN QUERY
  WITH payment_metrics AS (
    SELECT 
      COUNT(*) as attempts_last_hour,
      COUNT(*) FILTER (WHERE status = 'COMPLETED') as successful_payments,
      COALESCE(SUM(amount_cents) FILTER (WHERE status = 'COMPLETED'), 0) as total_revenue_cents
    FROM payment_attempts
    WHERE created_at >= NOW() - INTERVAL '1 hour'
  )
  SELECT 
    'PAYMENTS'::TEXT,
    CASE 
      WHEN attempts_last_hour = 0 THEN 'IDLE'
      WHEN successful_payments::float / attempts_last_hour >= 0.95 THEN 'HEALTHY'
      WHEN successful_payments::float / attempts_last_hour >= 0.80 THEN 'DEGRADED'
      ELSE 'CRITICAL'
    END::TEXT,
    'success_rate'::TEXT,
    CASE WHEN attempts_last_hour > 0 THEN successful_payments::float / attempts_last_hour ELSE 0 END::NUMERIC,
    0.95::NUMERIC, -- 95% success rate threshold
    CASE WHEN attempts_last_hour = 0 THEN true ELSE (successful_payments::float / attempts_last_hour >= 0.95) END::BOOLEAN,
    jsonb_build_object(
      'attempts_last_hour', attempts_last_hour,
      'successful_payments', successful_payments,
      'total_revenue_cents', total_revenue_cents,
      'success_rate', CASE WHEN attempts_last_hour > 0 THEN successful_payments::float / attempts_last_hour ELSE 0 END
    )
  FROM payment_metrics;

  -- Database Performance
  RETURN QUERY
  WITH db_metrics AS (
    SELECT 
      COALESCE(SUM(n_tup_ins + n_tup_upd + n_tup_del), 0) as total_operations,
      COALESCE(SUM(n_dead_tup), 0) as dead_tuples,
      COALESCE(SUM(n_live_tup), 0) as live_tuples
    FROM pg_stat_user_tables
    WHERE schemaname = 'public' 
    AND tablename LIKE 'automation_%'
  )
  SELECT 
    'DATABASE'::TEXT,
    CASE 
      WHEN live_tuples = 0 THEN 'HEALTHY'
      WHEN dead_tuples::float / live_tuples < 0.10 THEN 'HEALTHY'
      WHEN dead_tuples::float / live_tuples < 0.20 THEN 'DEGRADED'
      ELSE 'NEEDS_MAINTENANCE'
    END::TEXT,
    'dead_tuple_ratio'::TEXT,
    CASE WHEN live_tuples > 0 THEN dead_tuples::float / live_tuples ELSE 0 END::NUMERIC,
    0.10::NUMERIC, -- 10% dead tuple threshold
    CASE WHEN live_tuples = 0 THEN true ELSE (dead_tuples::float / live_tuples < 0.10) END::BOOLEAN,
    jsonb_build_object(
      'total_operations', total_operations,
      'dead_tuples', dead_tuples,
      'live_tuples', live_tuples,
      'dead_tuple_ratio', CASE WHEN live_tuples > 0 THEN dead_tuples::float / live_tuples ELSE 0 END
    )
  FROM db_metrics;
END $$;

-- ==========================================
-- HELPER FUNCTIONS
-- ==========================================

-- Execute SQL with error handling (for deployment script)
CREATE OR REPLACE FUNCTION execute_sql(sql_query TEXT)
RETURNS TABLE (
  success BOOLEAN,
  result TEXT,
  execution_time_ms INTEGER
)
LANGUAGE plpgsql AS $$
DECLARE
  start_time TIMESTAMP;
  end_time TIMESTAMP;
  execution_duration INTEGER;
BEGIN
  start_time := clock_timestamp();
  
  BEGIN
    EXECUTE sql_query;
    end_time := clock_timestamp();
    execution_duration := extract(epoch from (end_time - start_time)) * 1000;
    
    RETURN QUERY SELECT true, 'Query executed successfully'::TEXT, execution_duration;
  EXCEPTION WHEN OTHERS THEN
    end_time := clock_timestamp();
    execution_duration := extract(epoch from (end_time - start_time)) * 1000;
    
    RETURN QUERY SELECT false, SQLERRM::TEXT, execution_duration;
  END;
END $$;

-- ==========================================
-- COMPLETION MESSAGE
-- ==========================================

DO $$
BEGIN
  RAISE NOTICE 'Automation system stored procedures created successfully!';
  RAISE NOTICE 'Created procedures:';
  RAISE NOTICE '  - claim_automation_tasks(): Atomic task claiming for workers';
  RAISE NOTICE '  - complete_automation_tasks(): Bulk task completion';
  RAISE NOTICE '  - retry_failed_tasks(): Retry with exponential backoff';
  RAISE NOTICE '  - aggregate_automation_metrics(): Performance metrics aggregation';
  RAISE NOTICE '  - get_automation_performance_summary(): Comprehensive performance stats';
  RAISE NOTICE '  - cleanup_automation_data(): Data retention and cleanup';
  RAISE NOTICE '  - recover_stuck_automation_tasks(): Automatic recovery';
  RAISE NOTICE '  - check_automation_system_health(): System health monitoring';
  RAISE NOTICE '  - execute_sql(): SQL execution helper';
  RAISE NOTICE 'All procedures are optimized for high-concurrency automation workloads';
END $$;