-- 6FB AI Agent System - Database Schema
-- Copy this entire file and paste it into Supabase SQL Editor
-- Then click "Run" button

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  shop_name TEXT,
  full_name TEXT,
  organization TEXT,
  role TEXT DEFAULT 'user',
  stripe_customer_id TEXT,
  subscription_status TEXT DEFAULT 'free',
  subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- AI Agents table
CREATE TABLE public.agents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL, -- 'booking', 'marketing', 'analytics', etc.
  capabilities JSONB DEFAULT '[]'::jsonb,
  configuration JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on agents
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

-- Agents policies (public read, admin write)
CREATE POLICY "Anyone can view agents" ON public.agents
  FOR SELECT USING (true);

-- Chat History table
CREATE TABLE public.chat_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  agent_id UUID REFERENCES public.agents(id),
  message TEXT NOT NULL,
  response TEXT NOT NULL,
  tokens_used INTEGER DEFAULT 0,
  model TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on chat_history
ALTER TABLE public.chat_history ENABLE ROW LEVEL SECURITY;

-- Chat history policies
CREATE POLICY "Users can view own chats" ON public.chat_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own chats" ON public.chat_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Notifications table
CREATE TABLE public.notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  type TEXT NOT NULL, -- 'email', 'sms', 'push', 'in_app'
  channel TEXT NOT NULL,
  template_id TEXT,
  subject TEXT,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'delivered'
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Business Settings table
CREATE TABLE public.business_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) UNIQUE NOT NULL,
  business_hours JSONB DEFAULT '{}'::jsonb,
  notification_preferences JSONB DEFAULT '{}'::jsonb,
  booking_rules JSONB DEFAULT '{}'::jsonb,
  integrations JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on business_settings
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;

-- Business settings policies
CREATE POLICY "Users can view own settings" ON public.business_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON public.business_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings" ON public.business_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Analytics Events table (for tracking)
CREATE TABLE public.analytics_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  event_name TEXT NOT NULL,
  event_properties JSONB DEFAULT '{}'::jsonb,
  user_properties JSONB DEFAULT '{}'::jsonb,
  session_id TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on analytics_events
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Analytics policies (users can only insert, admin can read)
CREATE POLICY "Users can track own events" ON public.analytics_events
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Feature Flags table
CREATE TABLE public.feature_flags (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  flag_key TEXT UNIQUE NOT NULL,
  enabled BOOLEAN DEFAULT false,
  rollout_percentage INTEGER DEFAULT 0 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  user_whitelist UUID[] DEFAULT '{}',
  user_blacklist UUID[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Feature flags are public read
CREATE POLICY "Anyone can view feature flags" ON public.feature_flags
  FOR SELECT USING (true);

-- Create indexes for performance
CREATE INDEX idx_chat_history_user_id ON public.chat_history(user_id);
CREATE INDEX idx_chat_history_agent_id ON public.chat_history(agent_id);
CREATE INDEX idx_chat_history_created_at ON public.chat_history(created_at DESC);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_status ON public.notifications(status);
CREATE INDEX idx_analytics_events_user_id ON public.analytics_events(user_id);
CREATE INDEX idx_analytics_events_event_name ON public.analytics_events(event_name);
CREATE INDEX idx_analytics_events_created_at ON public.analytics_events(created_at DESC);

-- Functions

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add update triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON public.agents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_business_settings_updated_at BEFORE UPDATE ON public.business_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_feature_flags_updated_at BEFORE UPDATE ON public.feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default agents
INSERT INTO public.agents (name, type, description, capabilities) VALUES
('Booking Assistant', 'booking', 'AI agent for managing appointments and bookings', '["schedule_appointment", "check_availability", "send_reminders"]'::jsonb),
('Marketing Genius', 'marketing', 'AI agent for marketing campaigns and customer engagement', '["create_campaigns", "analyze_performance", "segment_customers"]'::jsonb),
('Analytics Expert', 'analytics', 'AI agent for business insights and reporting', '["generate_reports", "track_metrics", "predict_trends"]'::jsonb),
('Customer Support', 'support', 'AI agent for customer service and support', '["answer_questions", "resolve_issues", "collect_feedback"]'::jsonb);

-- Success message
SELECT 'All tables created successfully! 🎉' as message;