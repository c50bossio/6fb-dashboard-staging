-- Supabase Migration Script for 6FB AI Agent System
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (replacing SQLite users)
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  barbershop_name TEXT,
  barbershop_id TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Sessions table
CREATE TABLE IF NOT EXISTS ai_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_type TEXT NOT NULL,
  agent_type TEXT DEFAULT 'business_coach',
  context JSONB DEFAULT '{}',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages table with vector support for RAG
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES ai_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  tokens_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Business Insights table
CREATE TABLE IF NOT EXISTS business_insights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES ai_sessions(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  metrics JSONB DEFAULT '{}',
  action_items JSONB DEFAULT '[]',
  priority TEXT CHECK (priority IN ('high', 'medium', 'low')) DEFAULT 'medium',
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Barbershop Settings table
CREATE TABLE IF NOT EXISTS barbershop_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  business_hours JSONB DEFAULT '{}',
  services JSONB DEFAULT '[]',
  pricing JSONB DEFAULT '{}',
  notification_preferences JSONB DEFAULT '{}',
  integrations JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_sessions_user_id ON ai_sessions(user_id);
CREATE INDEX idx_messages_session_id ON messages(session_id);
CREATE INDEX idx_insights_user_id ON business_insights(user_id);
CREATE INDEX idx_insights_status ON business_insights(status);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE barbershop_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only see their own data
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid()::text = id::text);

-- Sessions belong to users
CREATE POLICY "Users can view own sessions" ON ai_sessions
  FOR ALL USING (auth.uid()::text = user_id::text);

-- Messages belong to sessions which belong to users
CREATE POLICY "Users can view own messages" ON messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM ai_sessions 
      WHERE ai_sessions.id = messages.session_id 
      AND ai_sessions.user_id::text = auth.uid()::text
    )
  );

-- Insights belong to users
CREATE POLICY "Users can manage own insights" ON business_insights
  FOR ALL USING (auth.uid()::text = user_id::text);

-- Settings belong to users
CREATE POLICY "Users can manage own settings" ON barbershop_settings
  FOR ALL USING (auth.uid()::text = user_id::text);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON ai_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON barbershop_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create view for session summaries
CREATE VIEW session_summaries AS
SELECT 
  s.id,
  s.user_id,
  s.session_type,
  s.agent_type,
  s.created_at,
  COUNT(m.id) as message_count,
  SUM(m.tokens_used) as total_tokens,
  MAX(m.created_at) as last_message_at
FROM ai_sessions s
LEFT JOIN messages m ON s.id = m.session_id
GROUP BY s.id;

-- Sample data for testing (remove in production)
-- INSERT INTO users (email, full_name, barbershop_name) 
-- VALUES ('demo@example.com', 'Demo User', 'Demo Barbershop');