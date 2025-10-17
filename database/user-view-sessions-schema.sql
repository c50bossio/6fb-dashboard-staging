-- User View Sessions Table for ViewSwitcher Audit Logging
-- This table tracks when users switch contexts for security and audit purposes

CREATE TABLE IF NOT EXISTS user_view_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  context_type TEXT NOT NULL CHECK (context_type IN ('barber', 'shop', 'primary')),
  context_id TEXT, -- barber user_id or shop id, null for primary
  action TEXT NOT NULL DEFAULT 'context_switch',
  session_start TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  session_end TIMESTAMP WITH TIME ZONE,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_view_sessions_user_id ON user_view_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_view_sessions_context ON user_view_sessions(context_type, context_id);
CREATE INDEX IF NOT EXISTS idx_user_view_sessions_created_at ON user_view_sessions(created_at DESC);

-- RLS Policies
ALTER TABLE user_view_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own session logs
CREATE POLICY "Users can view own view sessions" 
  ON user_view_sessions 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Only the user can insert their own session logs (via API)
CREATE POLICY "Users can insert own view sessions" 
  ON user_view_sessions 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Admins can see all session logs for auditing
CREATE POLICY "Admins can view all view sessions" 
  ON user_view_sessions 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('SUPER_ADMIN', 'ENTERPRISE_OWNER')
    )
  );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_view_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER trigger_user_view_sessions_updated_at
  BEFORE UPDATE ON user_view_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_view_sessions_updated_at();

-- Function to close active sessions when switching contexts
CREATE OR REPLACE FUNCTION close_previous_view_sessions()
RETURNS TRIGGER AS $$
BEGIN
  -- Close any active sessions for this user
  UPDATE user_view_sessions 
  SET session_end = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
  WHERE user_id = NEW.user_id 
    AND session_end IS NULL 
    AND id != NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to close previous sessions
CREATE TRIGGER trigger_close_previous_view_sessions
  AFTER INSERT ON user_view_sessions
  FOR EACH ROW
  EXECUTE FUNCTION close_previous_view_sessions();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON user_view_sessions TO authenticated;
GRANT USAGE ON SEQUENCE user_view_sessions_id_seq TO authenticated;