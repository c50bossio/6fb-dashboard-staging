-- Admin Audit Log Schema for 6FB AI Agent System
-- This creates security audit logging for all admin actions
-- Run this in Supabase SQL Editor

-- ==========================================
-- ADMIN AUDIT LOG TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL, -- e.g., 'SUBSCRIPTION_CANCEL', 'USER_REFUND', 'SUBSCRIPTION_UPDATE'
  target_user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- User being acted upon
  target_subscription_id VARCHAR(255), -- Stripe subscription ID if applicable
  details JSONB DEFAULT '{}', -- Additional action details
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance and querying
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin_user ON admin_audit_log(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_target_user ON admin_audit_log(target_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action ON admin_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON admin_audit_log(created_at DESC);

-- ==========================================
-- ROW LEVEL SECURITY
-- ==========================================

-- Enable RLS
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Only SUPER_ADMIN users can view audit logs
CREATE POLICY "Only super admins can view audit logs" ON admin_audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'SUPER_ADMIN' 
      AND users.is_active = true
    )
  );

-- Only service role can insert audit logs (API endpoints)
CREATE POLICY "Service role can insert audit logs" ON admin_audit_log
  FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- ==========================================
-- AUDIT LOG HELPER FUNCTIONS
-- ==========================================

-- Function to log admin actions (called from API endpoints)
CREATE OR REPLACE FUNCTION log_admin_action(
  p_admin_user_id UUID,
  p_action VARCHAR,
  p_target_user_id UUID DEFAULT NULL,
  p_target_subscription_id VARCHAR DEFAULT NULL,
  p_details JSONB DEFAULT '{}',
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  audit_id UUID;
BEGIN
  INSERT INTO admin_audit_log (
    admin_user_id,
    action,
    target_user_id,
    target_subscription_id,
    details,
    ip_address,
    user_agent
  ) VALUES (
    p_admin_user_id,
    p_action,
    p_target_user_id,
    p_target_subscription_id,
    p_details,
    p_ip_address::INET,
    p_user_agent
  )
  RETURNING id INTO audit_id;
  
  RETURN audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get recent admin activity (for admin dashboard)
CREATE OR REPLACE FUNCTION get_recent_admin_activity(limit_count INTEGER DEFAULT 50)
RETURNS TABLE (
  id UUID,
  admin_email VARCHAR,
  action VARCHAR,
  target_email VARCHAR,
  details JSONB,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    aal.id,
    admin_users.email as admin_email,
    aal.action,
    target_users.email as target_email,
    aal.details,
    aal.created_at
  FROM admin_audit_log aal
  LEFT JOIN users admin_users ON admin_users.id = aal.admin_user_id
  LEFT JOIN users target_users ON target_users.id = aal.target_user_id
  ORDER BY aal.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- COMMENTS FOR DOCUMENTATION
-- ==========================================

COMMENT ON TABLE admin_audit_log IS 'Comprehensive audit trail for all admin actions in the system';
COMMENT ON COLUMN admin_audit_log.action IS 'Action type: SUBSCRIPTION_CANCEL, USER_REFUND, SUBSCRIPTION_UPDATE, etc.';
COMMENT ON COLUMN admin_audit_log.details IS 'JSON object with action-specific details like old/new values';
COMMENT ON FUNCTION log_admin_action IS 'Logs admin actions with full context for security auditing';
COMMENT ON FUNCTION get_recent_admin_activity IS 'Returns recent admin activity with user details for dashboard display';