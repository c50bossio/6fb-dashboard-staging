-- Enhanced Onboarding Sessions Migration for Real-time State Management
-- This extends the existing onboarding system with session-based state tracking

-- Create onboarding_sessions table for real-time state management
CREATE TABLE IF NOT EXISTS onboarding_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  barber_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  session_type VARCHAR(50) NOT NULL, -- 'staff_setup', 'booking_rules', 'financial_setup', 'business_setup'
  current_step VARCHAR(100),
  step_data JSONB DEFAULT '{}',
  completed_steps TEXT[] DEFAULT '{}',
  is_completed BOOLEAN DEFAULT false,
  progress_percentage INTEGER DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique indexes to ensure one active session per type per user/barber combination
-- Handle NULL barber_id separately with partial indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_session_with_barber 
  ON onboarding_sessions(user_id, session_type, barber_id) 
  WHERE barber_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_session_without_barber 
  ON onboarding_sessions(user_id, session_type) 
  WHERE barber_id IS NULL;

-- Enable Row Level Security
ALTER TABLE onboarding_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for security
CREATE POLICY "Users can manage their own onboarding sessions" 
ON onboarding_sessions 
FOR ALL 
USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_user_id ON onboarding_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_barber_id ON onboarding_sessions(barber_id) WHERE barber_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_type ON onboarding_sessions(session_type);
CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_updated ON onboarding_sessions(updated_at);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_onboarding_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-updating updated_at
CREATE TRIGGER trigger_update_onboarding_sessions_updated_at
  BEFORE UPDATE ON onboarding_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_onboarding_sessions_updated_at();

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_onboarding_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM onboarding_sessions 
  WHERE expires_at < NOW() AND is_completed = false;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Sample data structure for onboarding_sessions.step_data:
-- For staff_setup session_type:
-- {
--   "staff": [
--     {
--       "id": "staff_1",
--       "firstName": "John",
--       "lastName": "Smith", 
--       "email": "john@example.com",
--       "role": "barber",
--       "specialty": "Fades & Tapers",
--       "experience": 5,
--       "chairNumber": "3",
--       "availability": "full_time"
--     }
--   ],
--   "lastModified": "2024-01-15T10:30:00Z",
--   "autoSaved": true
-- }

-- For booking_rules session_type:
-- {
--   "rules": {
--     "cancellationWindow": 24,
--     "noShowFee": 25,
--     "requireDeposit": false,
--     "allowSameDayBooking": true,
--     "maxAdvanceBooking": 30
--   },
--   "selectedPolicy": "balanced",
--   "customizations": {},
--   "lastModified": "2024-01-15T10:30:00Z"
-- }

-- Create view for active sessions
CREATE OR REPLACE VIEW active_onboarding_sessions AS
SELECT 
  id,
  user_id,
  barber_id,
  session_type,
  current_step,
  step_data,
  completed_steps,
  is_completed,
  progress_percentage,
  created_at,
  updated_at,
  (expires_at > NOW()) AS is_active,
  EXTRACT(EPOCH FROM (expires_at - NOW())) AS seconds_until_expiry
FROM onboarding_sessions
WHERE expires_at > NOW() OR is_completed = true;

-- Grant appropriate permissions
GRANT ALL ON onboarding_sessions TO authenticated;
GRANT SELECT ON active_onboarding_sessions TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_onboarding_sessions() TO authenticated;
GRANT EXECUTE ON FUNCTION update_onboarding_sessions_updated_at() TO authenticated;

-- Create notification trigger for real-time subscriptions
CREATE OR REPLACE FUNCTION notify_onboarding_session_change()
RETURNS TRIGGER AS $$
DECLARE
  payload JSON;
BEGIN
  payload = json_build_object(
    'table', TG_TABLE_NAME,
    'action', TG_OP,
    'id', COALESCE(NEW.id, OLD.id),
    'user_id', COALESCE(NEW.user_id, OLD.user_id),
    'session_type', COALESCE(NEW.session_type, OLD.session_type),
    'barber_id', COALESCE(NEW.barber_id, OLD.barber_id)
  );
  
  PERFORM pg_notify('onboarding_session_change', payload::text);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger for real-time notifications
CREATE TRIGGER trigger_notify_onboarding_session_change
  AFTER INSERT OR UPDATE OR DELETE ON onboarding_sessions
  FOR EACH ROW
  EXECUTE FUNCTION notify_onboarding_session_change();

-- Add comment for documentation
COMMENT ON TABLE onboarding_sessions IS 'Real-time onboarding state management with cross-tab synchronization support';
COMMENT ON COLUMN onboarding_sessions.session_type IS 'Type of onboarding flow: staff_setup, booking_rules, financial_setup, business_setup';
COMMENT ON COLUMN onboarding_sessions.step_data IS 'JSON data containing current form state and progress';
COMMENT ON COLUMN onboarding_sessions.completed_steps IS 'Array of step IDs that have been completed';
COMMENT ON COLUMN onboarding_sessions.expires_at IS 'Session expiration time (auto-cleanup after 7 days)';