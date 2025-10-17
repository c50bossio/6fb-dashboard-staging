/**
 * Payroll Export System Database Schema
 * Comprehensive tables for payroll export functionality, scheduling, and history tracking
 */

-- Payroll Export History Table
-- Tracks all generated payroll exports for audit and download history
CREATE TABLE IF NOT EXISTS payroll_export_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
  generated_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Export configuration
  export_format VARCHAR(20) NOT NULL CHECK (export_format IN ('pdf', 'excel', 'csv', 'tax-summary')),
  file_name VARCHAR(255) NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  
  -- Date range and filters
  date_range_start TIMESTAMP WITH TIME ZONE,
  date_range_end TIMESTAMP WITH TIME ZONE,
  staff_filter TEXT NOT NULL DEFAULT 'all', -- 'all', 'active', or JSON array of staff IDs
  
  -- Export options (stored as JSONB for flexibility)
  export_options JSONB NOT NULL DEFAULT '{}',
  
  -- Results and metadata
  record_count INTEGER NOT NULL DEFAULT 0,
  generation_time_ms INTEGER, -- Time taken to generate in milliseconds
  download_url TEXT, -- Temporary download URL
  download_expires_at TIMESTAMP WITH TIME ZONE,
  download_count INTEGER NOT NULL DEFAULT 0,
  
  -- Status and error handling
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'completed', 'failed', 'expired')),
  error_message TEXT,
  error_details JSONB,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE, -- When the export record should be cleaned up
  
  -- Indexes for performance
  INDEX idx_payroll_export_history_barbershop (barbershop_id),
  INDEX idx_payroll_export_history_generated_by (generated_by),
  INDEX idx_payroll_export_history_created_at (created_at DESC),
  INDEX idx_payroll_export_history_status (status),
  INDEX idx_payroll_export_history_expires_at (expires_at)
);

-- Payroll Export Schedules Table
-- Manages automated payroll report scheduling
CREATE TABLE IF NOT EXISTS payroll_export_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Schedule identification
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Schedule configuration
  frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('weekly', 'monthly', 'quarterly', 'yearly')),
  schedule_day INTEGER NOT NULL DEFAULT 1, -- Day of week (1-7) or day of month (1-31)
  timezone VARCHAR(50) DEFAULT 'UTC',
  
  -- Export configuration (same structure as one-time exports)
  export_options JSONB NOT NULL DEFAULT '{}',
  
  -- Email delivery configuration
  email_options JSONB NOT NULL DEFAULT '{}', -- { recipients: [], customMessage: '', subject: '' }
  
  -- Schedule status
  is_active BOOLEAN NOT NULL DEFAULT true,
  next_run_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_run_at TIMESTAMP WITH TIME ZONE,
  run_count INTEGER NOT NULL DEFAULT 0,
  
  -- Error handling
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  max_failures INTEGER NOT NULL DEFAULT 3,
  failure_notification_sent BOOLEAN NOT NULL DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes
  INDEX idx_payroll_schedules_barbershop (barbershop_id),
  INDEX idx_payroll_schedules_created_by (created_by),
  INDEX idx_payroll_schedules_next_run (next_run_at),
  INDEX idx_payroll_schedules_active (is_active),
  INDEX idx_payroll_schedules_frequency (frequency)
);

-- Payroll Schedule Executions Table
-- Tracks individual executions of scheduled reports
CREATE TABLE IF NOT EXISTS payroll_schedule_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES payroll_export_schedules(id) ON DELETE CASCADE,
  export_history_id UUID REFERENCES payroll_export_history(id) ON DELETE SET NULL,
  
  -- Execution details
  executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  execution_time_ms INTEGER, -- Total execution time including email sending
  
  -- Results
  status VARCHAR(20) NOT NULL CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  file_name VARCHAR(255),
  file_size BIGINT,
  
  -- Email delivery results
  email_sent BOOLEAN NOT NULL DEFAULT false,
  recipient_count INTEGER NOT NULL DEFAULT 0,
  successful_deliveries INTEGER NOT NULL DEFAULT 0,
  failed_deliveries INTEGER NOT NULL DEFAULT 0,
  
  -- Error handling
  error_message TEXT,
  error_details JSONB,
  retry_count INTEGER NOT NULL DEFAULT 0,
  
  -- Export metadata
  export_metadata JSONB, -- Metadata from the generated export
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes
  INDEX idx_schedule_executions_schedule (schedule_id),
  INDEX idx_schedule_executions_executed_at (executed_at DESC),
  INDEX idx_schedule_executions_status (status)
);

-- Email Activity Log Table
-- Tracks email delivery for payroll reports
CREATE TABLE IF NOT EXISTS payroll_notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
  
  -- Activity type and context
  activity_type VARCHAR(50) NOT NULL, -- 'payroll_email_sent', 'test_email_sent', etc.
  context_id UUID, -- Reference to schedule execution or export history
  
  -- Email details
  sender_email VARCHAR(255),
  sender_name VARCHAR(255),
  recipients TEXT[], -- Array of recipient email addresses
  subject VARCHAR(500),
  
  -- Delivery results
  total_recipients INTEGER NOT NULL DEFAULT 0,
  successful_deliveries INTEGER NOT NULL DEFAULT 0,
  failed_deliveries INTEGER NOT NULL DEFAULT 0,
  
  -- Provider details (SendGrid, etc.)
  provider VARCHAR(50) DEFAULT 'sendgrid',
  message_id VARCHAR(255), -- Provider's message ID
  batch_id VARCHAR(255), -- Provider's batch ID if applicable
  
  -- Content and metadata
  details JSONB, -- Additional details about the email activity
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes
  INDEX idx_email_activity_barbershop (barbershop_id),
  INDEX idx_email_activity_type (activity_type),
  INDEX idx_email_activity_created_at (created_at DESC),
  INDEX idx_email_activity_context (context_id)
);

-- Payroll Export Templates Table
-- Pre-defined export configurations for quick access
CREATE TABLE IF NOT EXISTS payroll_export_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Template identification
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) DEFAULT 'custom', -- 'system', 'custom', 'shared'
  
  -- Template configuration
  export_options JSONB NOT NULL DEFAULT '{}',
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_public BOOLEAN NOT NULL DEFAULT false, -- Can be used by other barbershops
  
  -- Usage statistics
  usage_count INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes
  INDEX idx_export_templates_barbershop (barbershop_id),
  INDEX idx_export_templates_created_by (created_by),
  INDEX idx_export_templates_category (category),
  INDEX idx_export_templates_public (is_public),
  
  -- Unique constraint for default templates per barbershop
  UNIQUE (barbershop_id, is_default) WHERE is_default = true
);

-- Payroll Export Permissions Table
-- Fine-grained permissions for export functionality
CREATE TABLE IF NOT EXISTS payroll_export_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Permission types
  can_export_own BOOLEAN NOT NULL DEFAULT true, -- Can export own payroll data
  can_export_all BOOLEAN NOT NULL DEFAULT false, -- Can export all staff payroll data
  can_schedule_reports BOOLEAN NOT NULL DEFAULT false, -- Can create scheduled reports
  can_manage_schedules BOOLEAN NOT NULL DEFAULT false, -- Can modify/delete schedules
  can_view_history BOOLEAN NOT NULL DEFAULT true, -- Can view export history
  can_download_exports BOOLEAN NOT NULL DEFAULT true, -- Can download exports
  
  -- Format restrictions
  allowed_formats TEXT[] DEFAULT ARRAY['pdf', 'excel', 'csv'], -- Allowed export formats
  
  -- Rate limiting
  daily_export_limit INTEGER DEFAULT 10,
  monthly_export_limit INTEGER DEFAULT 100,
  
  -- Data access restrictions
  max_date_range_days INTEGER DEFAULT 366, -- Maximum date range in days
  staff_access_level VARCHAR(20) DEFAULT 'own' CHECK (staff_access_level IN ('own', 'team', 'all')),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes
  INDEX idx_export_permissions_barbershop (barbershop_id),
  INDEX idx_export_permissions_user (user_id),
  
  -- Unique constraint
  UNIQUE (barbershop_id, user_id)
);

-- Payroll Export Rate Limits Table
-- Track rate limiting for export requests
CREATE TABLE IF NOT EXISTS payroll_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Rate limiting periods
  daily_count INTEGER NOT NULL DEFAULT 0,
  weekly_count INTEGER NOT NULL DEFAULT 0,
  monthly_count INTEGER NOT NULL DEFAULT 0,
  
  -- Reset timestamps
  daily_reset_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '1 day'),
  weekly_reset_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '1 week'),
  monthly_reset_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '1 month'),
  
  -- Last request tracking
  last_request_at TIMESTAMP WITH TIME ZONE,
  last_request_ip INET,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes
  INDEX idx_rate_limits_barbershop_user (barbershop_id, user_id),
  INDEX idx_rate_limits_daily_reset (daily_reset_at),
  INDEX idx_rate_limits_weekly_reset (weekly_reset_at),
  INDEX idx_rate_limits_monthly_reset (monthly_reset_at),
  
  -- Unique constraint
  UNIQUE (barbershop_id, user_id)
);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables with updated_at columns
CREATE TRIGGER update_payroll_export_history_updated_at 
  BEFORE UPDATE ON payroll_export_history 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payroll_export_schedules_updated_at 
  BEFORE UPDATE ON payroll_export_schedules 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payroll_schedule_executions_updated_at 
  BEFORE UPDATE ON payroll_schedule_executions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payroll_export_templates_updated_at 
  BEFORE UPDATE ON payroll_export_templates 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payroll_export_permissions_updated_at 
  BEFORE UPDATE ON payroll_export_permissions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payroll_rate_limits_updated_at 
  BEFORE UPDATE ON payroll_rate_limits 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create Row Level Security (RLS) policies
ALTER TABLE payroll_export_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_export_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_schedule_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_notification_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_export_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_export_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_rate_limits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payroll_export_history
CREATE POLICY "Users can view export history from their barbershop" ON payroll_export_history
  FOR SELECT USING (
    barbershop_id IN (
      SELECT shop_id FROM profiles WHERE id = auth.uid()
      UNION
      SELECT barbershop_id FROM barbershop_staff WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can insert export history for their barbershop" ON payroll_export_history
  FOR INSERT WITH CHECK (
    barbershop_id IN (
      SELECT shop_id FROM profiles WHERE id = auth.uid()
      UNION
      SELECT barbershop_id FROM barbershop_staff WHERE user_id = auth.uid() AND is_active = true
    )
    AND generated_by = auth.uid()
  );

-- RLS Policies for payroll_export_schedules
CREATE POLICY "Users can manage schedules for their barbershop" ON payroll_export_schedules
  FOR ALL USING (
    barbershop_id IN (
      SELECT shop_id FROM profiles WHERE id = auth.uid()
      UNION
      SELECT barbershop_id FROM barbershop_staff WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- RLS Policies for schedule executions (read-only for users)
CREATE POLICY "Users can view schedule executions for their barbershop" ON payroll_schedule_executions
  FOR SELECT USING (
    schedule_id IN (
      SELECT id FROM payroll_export_schedules WHERE barbershop_id IN (
        SELECT shop_id FROM profiles WHERE id = auth.uid()
        UNION
        SELECT barbershop_id FROM barbershop_staff WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

-- RLS Policies for email activity log
CREATE POLICY "Users can view email activity for their barbershop" ON payroll_notification_log
  FOR SELECT USING (
    barbershop_id IN (
      SELECT shop_id FROM profiles WHERE id = auth.uid()
      UNION
      SELECT barbershop_id FROM barbershop_staff WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- RLS Policies for export templates
CREATE POLICY "Users can manage templates for their barbershop" ON payroll_export_templates
  FOR ALL USING (
    barbershop_id IN (
      SELECT shop_id FROM profiles WHERE id = auth.uid()
      UNION
      SELECT barbershop_id FROM barbershop_staff WHERE user_id = auth.uid() AND is_active = true
    )
    OR is_public = true
  );

-- RLS Policies for export permissions
CREATE POLICY "Users can view permissions for their barbershop" ON payroll_export_permissions
  FOR SELECT USING (
    barbershop_id IN (
      SELECT shop_id FROM profiles WHERE id = auth.uid()
      UNION
      SELECT barbershop_id FROM barbershop_staff WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- RLS Policies for rate limits
CREATE POLICY "Users can view their own rate limits" ON payroll_rate_limits
  FOR SELECT USING (user_id = auth.uid());

-- Insert default export templates
INSERT INTO payroll_export_templates (id, barbershop_id, created_by, name, description, category, export_options, is_public) 
VALUES 
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000'::uuid, -- System template
    '00000000-0000-0000-0000-000000000000'::uuid,
    'Comprehensive Payroll Report',
    'Complete payroll report with all components including summary, individual details, transactions, and tier information',
    'system',
    '{
      "format": "pdf",
      "includeComponents": {
        "summary": true,
        "individual": true,
        "transactions": true,
        "tierDetails": true,
        "formulas": false
      },
      "customizations": {
        "branding": true,
        "includeCharts": true
      }
    }'::jsonb,
    true
  ),
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'Executive Summary',
    'High-level payroll summary for management review',
    'system',
    '{
      "format": "pdf",
      "includeComponents": {
        "summary": true,
        "individual": true,
        "transactions": false,
        "tierDetails": false,
        "formulas": false
      },
      "customizations": {
        "branding": true,
        "includeCharts": true
      }
    }'::jsonb,
    true
  ),
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'Accounting Export',
    'Detailed Excel export for accounting systems with formulas',
    'system',
    '{
      "format": "excel",
      "includeComponents": {
        "summary": true,
        "individual": true,
        "transactions": true,
        "tierDetails": true,
        "formulas": true
      },
      "customizations": {
        "branding": false,
        "includeCharts": false
      }
    }'::jsonb,
    true
  ),
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'Tax Preparation',
    '1099 and tax preparation documents',
    'system',
    '{
      "format": "tax-summary",
      "includeComponents": {
        "summary": true,
        "individual": true,
        "transactions": false,
        "tierDetails": false,
        "formulas": false
      },
      "customizations": {
        "branding": true,
        "includeCharts": false
      }
    }'::jsonb,
    true
  );

-- Create indexes for better query performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payroll_export_history_composite 
  ON payroll_export_history (barbershop_id, status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payroll_schedules_next_run_active 
  ON payroll_export_schedules (next_run_at, is_active) WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payroll_notification_log_composite 
  ON payroll_notification_log (barbershop_id, activity_type, created_at DESC);

-- Create a function to clean up old export records
CREATE OR REPLACE FUNCTION cleanup_old_payroll_exports(days_old INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM payroll_export_history 
  WHERE created_at < (CURRENT_TIMESTAMP - INTERVAL '1 day' * days_old)
    AND status IN ('completed', 'expired', 'failed');
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Also clean up email activity logs older than 1 year
  DELETE FROM payroll_notification_log 
  WHERE created_at < (CURRENT_TIMESTAMP - INTERVAL '1 year');
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create a function to reset rate limits (called by cron job)
CREATE OR REPLACE FUNCTION reset_payroll_rate_limits()
RETURNS VOID AS $$
BEGIN
  -- Reset daily limits
  UPDATE payroll_rate_limits 
  SET daily_count = 0, daily_reset_at = (CURRENT_TIMESTAMP + INTERVAL '1 day')
  WHERE daily_reset_at <= CURRENT_TIMESTAMP;
  
  -- Reset weekly limits  
  UPDATE payroll_rate_limits 
  SET weekly_count = 0, weekly_reset_at = (CURRENT_TIMESTAMP + INTERVAL '1 week')
  WHERE weekly_reset_at <= CURRENT_TIMESTAMP;
  
  -- Reset monthly limits
  UPDATE payroll_rate_limits 
  SET monthly_count = 0, monthly_reset_at = (CURRENT_TIMESTAMP + INTERVAL '1 month')
  WHERE monthly_reset_at <= CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get next scheduled exports (used by cron job)
CREATE OR REPLACE FUNCTION get_due_payroll_schedules()
RETURNS TABLE (
  schedule_id UUID,
  barbershop_id UUID,
  name VARCHAR(255),
  export_options JSONB,
  email_options JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.barbershop_id,
    s.name,
    s.export_options,
    s.email_options
  FROM payroll_export_schedules s
  WHERE s.is_active = true
    AND s.next_run_at <= CURRENT_TIMESTAMP
    AND s.consecutive_failures < s.max_failures
  ORDER BY s.next_run_at ASC;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE payroll_export_history IS 'Tracks all generated payroll exports with metadata and download information';
COMMENT ON TABLE payroll_export_schedules IS 'Manages automated payroll report scheduling with email delivery';
COMMENT ON TABLE payroll_schedule_executions IS 'Records individual executions of scheduled payroll reports';
COMMENT ON TABLE payroll_notification_log IS 'Logs email delivery activity for payroll reports';
COMMENT ON TABLE payroll_export_templates IS 'Pre-defined export configurations for quick report generation';
COMMENT ON TABLE payroll_export_permissions IS 'Fine-grained permissions for payroll export functionality';
COMMENT ON TABLE payroll_rate_limits IS 'Rate limiting tracking for export requests per user';

COMMENT ON FUNCTION cleanup_old_payroll_exports IS 'Cleans up old export records and logs to maintain database performance';
COMMENT ON FUNCTION reset_payroll_rate_limits IS 'Resets rate limiting counters based on configured periods';
COMMENT ON FUNCTION get_due_payroll_schedules IS 'Returns scheduled exports that are due for execution';