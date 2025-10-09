-- Agent Performance Logging Schema
-- Tracks AgentKit query performance, costs, and handoffs

CREATE TABLE IF NOT EXISTS agent_performance_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Context
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  session_id TEXT,

  -- Query Information
  query TEXT NOT NULL,
  query_type TEXT, -- 'database', 'general', 'multi_agent', etc.

  -- Agent Information
  agent_used TEXT NOT NULL, -- Primary agent that handled the query
  handoffs JSONB DEFAULT '[]', -- Array of agent handoffs/collaborations
  collaboration_type TEXT, -- 'single', 'multi_agent', 'handoff'

  -- Performance Metrics
  tokens_used INTEGER,
  cost_usd DECIMAL(10,6),
  response_time_ms INTEGER,

  -- Result Information
  status TEXT DEFAULT 'success', -- 'success', 'error', 'timeout'
  error_message TEXT,
  confidence_score DECIMAL(3,2), -- 0.00 to 1.00

  -- Provider Information
  ai_provider TEXT, -- 'openai', 'anthropic', 'google', 'agentkit_backend'
  model_used TEXT, -- 'gpt-5', 'claude-opus-4-1', etc.

  -- Response Quality
  response_length INTEGER,
  recommendations_count INTEGER DEFAULT 0,
  action_items_count INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_performance_logs_barbershop ON agent_performance_logs(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_agent_performance_logs_user ON agent_performance_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_performance_logs_agent ON agent_performance_logs(agent_used);
CREATE INDEX IF NOT EXISTS idx_agent_performance_logs_created_at ON agent_performance_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_performance_logs_status ON agent_performance_logs(status);
CREATE INDEX IF NOT EXISTS idx_agent_performance_logs_cost ON agent_performance_logs(cost_usd);

-- Composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_agent_performance_logs_barbershop_date
  ON agent_performance_logs(barbershop_id, created_at DESC);

-- GIN index for JSONB queries
CREATE INDEX IF NOT EXISTS idx_agent_performance_logs_handoffs
  ON agent_performance_logs USING GIN (handoffs);
CREATE INDEX IF NOT EXISTS idx_agent_performance_logs_metadata
  ON agent_performance_logs USING GIN (metadata);

-- Materialized view for aggregated metrics (refresh periodically)
CREATE MATERIALIZED VIEW IF NOT EXISTS agent_performance_summary AS
SELECT
  barbershop_id,
  agent_used,
  DATE(created_at) as date,
  COUNT(*) as query_count,
  SUM(tokens_used) as total_tokens,
  SUM(cost_usd) as total_cost,
  AVG(response_time_ms) as avg_response_time,
  AVG(confidence_score) as avg_confidence,
  COUNT(CASE WHEN status = 'success' THEN 1 END) as success_count,
  COUNT(CASE WHEN status = 'error' THEN 1 END) as error_count
FROM agent_performance_logs
GROUP BY barbershop_id, agent_used, DATE(created_at);

-- Index on materialized view
CREATE INDEX IF NOT EXISTS idx_agent_performance_summary_date
  ON agent_performance_summary(date DESC);
CREATE INDEX IF NOT EXISTS idx_agent_performance_summary_barbershop
  ON agent_performance_summary(barbershop_id);

-- Function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_agent_performance_summary()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY agent_performance_summary;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to refresh summary periodically (can be adjusted)
-- Note: For production, consider using a cron job instead of trigger
CREATE TRIGGER refresh_agent_performance_summary_trigger
  AFTER INSERT ON agent_performance_logs
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_agent_performance_summary();
