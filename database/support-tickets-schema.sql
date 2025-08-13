-- Support Tickets Schema for 6FB AI Agent System
-- This creates support ticket management for admin dashboard
-- Run this in Supabase SQL Editor

-- Support ticket priority enum
CREATE TYPE support_priority AS ENUM ('low', 'medium', 'high', 'critical');

-- Support ticket status enum  
CREATE TYPE support_status AS ENUM ('open', 'in_progress', 'escalated', 'resolved', 'closed');

-- Support ticket category enum
CREATE TYPE support_category AS ENUM (
  'billing', 'subscription', 'payment', 'technical', 'feature_request', 
  'bug_report', 'account', 'general'
);

-- ==========================================
-- SUPPORT TICKETS TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  admin_user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Admin who handled ticket
  
  -- Ticket details
  subject VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category support_category DEFAULT 'general',
  priority support_priority DEFAULT 'medium',
  status support_status DEFAULT 'open',
  
  -- Admin response
  admin_response TEXT,
  admin_responded_at TIMESTAMPTZ,
  
  -- Escalation tracking
  escalated_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  
  -- Metadata
  created_by_admin BOOLEAN DEFAULT FALSE, -- True if admin created ticket on user's behalf
  user_agent TEXT,
  ip_address INET,
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_admin_user_id ON support_tickets(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_support_tickets_category ON support_tickets(category);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at DESC);

-- ==========================================
-- SUPPORT TICKET MESSAGES TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS support_ticket_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- NULL if system message
  
  -- Message details
  message TEXT NOT NULL,
  is_admin_message BOOLEAN DEFAULT FALSE,
  is_internal_note BOOLEAN DEFAULT FALSE, -- Internal admin notes not visible to user
  
  -- Attachments
  attachments JSONB DEFAULT '[]', -- Array of file URLs/metadata
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_ticket_id ON support_ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_created_at ON support_ticket_messages(created_at);

-- ==========================================
-- ROW LEVEL SECURITY
-- ==========================================

-- Enable RLS
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_messages ENABLE ROW LEVEL SECURITY;

-- Users can view their own tickets
CREATE POLICY "Users can view own tickets" ON support_tickets
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create tickets
CREATE POLICY "Users can create tickets" ON support_tickets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own tickets (limited fields)
CREATE POLICY "Users can update own tickets" ON support_tickets
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all tickets
CREATE POLICY "Admins can view all tickets" ON support_tickets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'SUPER_ADMIN' 
      AND users.is_active = true
    )
  );

-- Admins can manage all tickets
CREATE POLICY "Admins can manage all tickets" ON support_tickets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'SUPER_ADMIN' 
      AND users.is_active = true
    )
  );

-- Service role can manage tickets (for API operations)
CREATE POLICY "Service role can manage tickets" ON support_tickets
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Similar policies for ticket messages
CREATE POLICY "Users can view own ticket messages" ON support_ticket_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM support_tickets 
      WHERE support_tickets.id = ticket_id 
      AND support_tickets.user_id = auth.uid()
    )
    AND is_internal_note = false
  );

CREATE POLICY "Users can create ticket messages" ON support_ticket_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM support_tickets 
      WHERE support_tickets.id = ticket_id 
      AND support_tickets.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all ticket messages" ON support_ticket_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'SUPER_ADMIN' 
      AND users.is_active = true
    )
  );

CREATE POLICY "Admins can manage all ticket messages" ON support_ticket_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'SUPER_ADMIN' 
      AND users.is_active = true
    )
  );

CREATE POLICY "Service role can manage ticket messages" ON support_ticket_messages
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ==========================================
-- TRIGGERS FOR UPDATED_AT
-- ==========================================

CREATE TRIGGER update_support_tickets_updated_at 
  BEFORE UPDATE ON support_tickets 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- HELPER FUNCTIONS
-- ==========================================

-- Function to get ticket statistics for admin dashboard
CREATE OR REPLACE FUNCTION get_support_ticket_stats()
RETURNS TABLE (
  total_tickets INTEGER,
  open_tickets INTEGER,
  resolved_tickets INTEGER,
  avg_response_time_hours NUMERIC,
  high_priority_tickets INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_tickets,
    COUNT(*) FILTER (WHERE status IN ('open', 'in_progress', 'escalated'))::INTEGER as open_tickets,
    COUNT(*) FILTER (WHERE status = 'resolved')::INTEGER as resolved_tickets,
    COALESCE(
      AVG(EXTRACT(EPOCH FROM (admin_responded_at - created_at))/3600) 
      FILTER (WHERE admin_responded_at IS NOT NULL), 0
    )::NUMERIC as avg_response_time_hours,
    COUNT(*) FILTER (WHERE priority IN ('high', 'critical') AND status != 'resolved')::INTEGER as high_priority_tickets
  FROM support_tickets
  WHERE created_at >= NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-escalate old tickets
CREATE OR REPLACE FUNCTION auto_escalate_old_tickets()
RETURNS INTEGER AS $$
DECLARE
  escalated_count INTEGER;
BEGIN
  UPDATE support_tickets 
  SET 
    status = 'escalated',
    priority = 'high',
    escalated_at = NOW(),
    updated_at = NOW()
  WHERE 
    status = 'open'
    AND priority = 'medium'
    AND created_at < NOW() - INTERVAL '72 hours'
    AND escalated_at IS NULL;
  
  GET DIAGNOSTICS escalated_count = ROW_COUNT;
  
  RETURN escalated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- COMMENTS FOR DOCUMENTATION
-- ==========================================

COMMENT ON TABLE support_tickets IS 'Customer support tickets with admin management capabilities';
COMMENT ON TABLE support_ticket_messages IS 'Messages/responses within support tickets';
COMMENT ON COLUMN support_tickets.created_by_admin IS 'True if admin created ticket on behalf of user';
COMMENT ON COLUMN support_ticket_messages.is_internal_note IS 'Internal admin notes not visible to users';
COMMENT ON FUNCTION get_support_ticket_stats IS 'Returns support metrics for admin dashboard';
COMMENT ON FUNCTION auto_escalate_old_tickets IS 'Auto-escalates tickets older than 72 hours';