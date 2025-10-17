-- Phase 11-12: AI Agent Orchestration Database Schema
-- Supports multi-agent coordination, task decomposition, and learning

-- Orchestration History
CREATE TABLE IF NOT EXISTS orchestration_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    task TEXT NOT NULL,
    execution_plan JSONB NOT NULL,
    result JSONB,
    status VARCHAR(50) DEFAULT 'pending',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    execution_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_orchestration_org (organization_id),
    INDEX idx_orchestration_status (status),
    INDEX idx_orchestration_created (created_at DESC)
);

-- Orchestration Learnings
CREATE TABLE IF NOT EXISTS orchestration_learnings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_type VARCHAR(100) NOT NULL,
    learning JSONB NOT NULL,
    performance_metrics JSONB,
    success_rate DECIMAL(5,4),
    avg_execution_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_learning_type (task_type),
    INDEX idx_learning_success (success_rate DESC)
);

-- Agent Performance Metrics
CREATE TABLE IF NOT EXISTS agent_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id VARCHAR(50) NOT NULL,
    organization_id UUID,
    task_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    avg_response_time_ms INTEGER,
    last_used TIMESTAMP WITH TIME ZONE,
    performance_score DECIMAL(5,4),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_agent_org (agent_id, organization_id),
    INDEX idx_agent_performance (agent_id),
    INDEX idx_agent_score (performance_score DESC)
);

-- Task Templates
CREATE TABLE IF NOT EXISTS task_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    task_pattern TEXT NOT NULL,
    recommended_agents JSONB,
    recommended_strategy VARCHAR(50),
    avg_completion_time_ms INTEGER,
    success_rate DECIMAL(5,4),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_template_name (name),
    INDEX idx_template_success (success_rate DESC)
);

-- Agent Collaboration Patterns
CREATE TABLE IF NOT EXISTS collaboration_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    primary_agent VARCHAR(50) NOT NULL,
    collaborating_agents JSONB NOT NULL,
    task_type VARCHAR(100),
    synergy_score DECIMAL(5,4),
    success_rate DECIMAL(5,4),
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_collab_primary (primary_agent),
    INDEX idx_collab_type (task_type),
    INDEX idx_collab_synergy (synergy_score DESC)
);

-- Task Queue
CREATE TABLE IF NOT EXISTS orchestration_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    task TEXT NOT NULL,
    context JSONB,
    priority INTEGER DEFAULT 5,
    strategy VARCHAR(50),
    status VARCHAR(50) DEFAULT 'queued',
    scheduled_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_queue_org (organization_id),
    INDEX idx_queue_status (status),
    INDEX idx_queue_priority (priority DESC, created_at),
    INDEX idx_queue_scheduled (scheduled_at)
);

-- Agent Communication Log
CREATE TABLE IF NOT EXISTS agent_communications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orchestration_id UUID REFERENCES orchestration_history(id),
    from_agent VARCHAR(50),
    to_agent VARCHAR(50),
    message_type VARCHAR(50),
    message JSONB,
    response JSONB,
    latency_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_comm_orchestration (orchestration_id),
    INDEX idx_comm_agents (from_agent, to_agent)
);

-- Orchestration Insights
CREATE TABLE IF NOT EXISTS orchestration_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID,
    insight_type VARCHAR(100),
    insight_data JSONB NOT NULL,
    confidence_score DECIMAL(5,4),
    impact_score DECIMAL(5,4),
    actionable BOOLEAN DEFAULT TRUE,
    applied BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_insight_org (organization_id),
    INDEX idx_insight_type (insight_type),
    INDEX idx_insight_impact (impact_score DESC)
);

-- Cost Tracking for AI Operations
CREATE TABLE IF NOT EXISTS ai_operation_costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    agent_id VARCHAR(50),
    operation_type VARCHAR(100),
    tokens_used INTEGER,
    cost_usd DECIMAL(10,6),
    model_used VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_cost_org (organization_id),
    INDEX idx_cost_agent (agent_id),
    INDEX idx_cost_created (created_at DESC)
);

-- Agent Capability Registry
CREATE TABLE IF NOT EXISTS agent_capabilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id VARCHAR(50) NOT NULL,
    capability VARCHAR(200) NOT NULL,
    description TEXT,
    performance_score DECIMAL(5,4),
    usage_count INTEGER DEFAULT 0,
    last_used TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_agent_capability (agent_id, capability),
    INDEX idx_capability_agent (agent_id),
    INDEX idx_capability_score (performance_score DESC)
);

-- Create views for analytics
CREATE OR REPLACE VIEW v_agent_performance_summary AS
SELECT 
    ap.agent_id,
    ap.organization_id,
    ap.task_count,
    ap.success_count,
    ap.failure_count,
    CASE 
        WHEN ap.task_count > 0 
        THEN CAST(ap.success_count AS DECIMAL) / ap.task_count 
        ELSE 0 
    END as success_rate,
    ap.avg_response_time_ms,
    ap.performance_score,
    ap.last_used
FROM agent_performance ap
ORDER BY ap.performance_score DESC;

CREATE OR REPLACE VIEW v_orchestration_analytics AS
SELECT 
    oh.organization_id,
    DATE(oh.created_at) as date,
    COUNT(*) as total_orchestrations,
    COUNT(CASE WHEN oh.status = 'completed' THEN 1 END) as completed,
    COUNT(CASE WHEN oh.status = 'failed' THEN 1 END) as failed,
    AVG(oh.execution_time_ms) as avg_execution_time,
    MIN(oh.execution_time_ms) as min_execution_time,
    MAX(oh.execution_time_ms) as max_execution_time
FROM orchestration_history oh
GROUP BY oh.organization_id, DATE(oh.created_at)
ORDER BY date DESC;

CREATE OR REPLACE VIEW v_collaboration_effectiveness AS
SELECT 
    cp.primary_agent,
    cp.collaborating_agents,
    cp.task_type,
    cp.synergy_score,
    cp.success_rate,
    cp.usage_count,
    cp.synergy_score * cp.success_rate as effectiveness_score
FROM collaboration_patterns cp
WHERE cp.usage_count > 5
ORDER BY effectiveness_score DESC;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_orchestration_history_composite 
ON orchestration_history(organization_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_performance_composite 
ON agent_performance(organization_id, agent_id, performance_score DESC);

CREATE INDEX IF NOT EXISTS idx_queue_processing 
ON orchestration_queue(status, priority DESC, scheduled_at)
WHERE status IN ('queued', 'scheduled');

-- Triggers for automatic updates
CREATE OR REPLACE FUNCTION update_agent_performance()
RETURNS TRIGGER AS $$
BEGIN
    -- Update agent performance metrics after each orchestration
    IF NEW.status = 'completed' OR NEW.status = 'failed' THEN
        -- Parse execution plan to get agents used
        -- Update their performance metrics
        UPDATE agent_performance
        SET 
            task_count = task_count + 1,
            success_count = CASE WHEN NEW.status = 'completed' THEN success_count + 1 ELSE success_count END,
            failure_count = CASE WHEN NEW.status = 'failed' THEN failure_count + 1 ELSE failure_count END,
            last_used = NEW.completed_at,
            updated_at = CURRENT_TIMESTAMP
        WHERE agent_id IN (
            SELECT jsonb_array_elements_text(NEW.execution_plan->'agents')
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_agent_performance
AFTER UPDATE ON orchestration_history
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION update_agent_performance();

-- Function to calculate agent synergy
CREATE OR REPLACE FUNCTION calculate_agent_synergy(
    p_agent1 VARCHAR,
    p_agent2 VARCHAR
) RETURNS DECIMAL AS $$
DECLARE
    v_synergy DECIMAL;
BEGIN
    SELECT 
        COALESCE(AVG(success_rate), 0.5)
    INTO v_synergy
    FROM orchestration_history
    WHERE execution_plan @> jsonb_build_object('agents', jsonb_build_array(p_agent1, p_agent2))
    AND status = 'completed';
    
    RETURN v_synergy;
END;
$$ LANGUAGE plpgsql;

-- Function to get recommended agents for a task
CREATE OR REPLACE FUNCTION get_recommended_agents(
    p_task_type VARCHAR
) RETURNS TABLE(
    agent_id VARCHAR,
    success_rate DECIMAL,
    avg_response_time INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ap.agent_id,
        CAST(ap.success_count AS DECIMAL) / NULLIF(ap.task_count, 0) as success_rate,
        ap.avg_response_time_ms
    FROM agent_performance ap
    JOIN task_templates tt ON tt.recommended_agents ? ap.agent_id
    WHERE tt.task_pattern ILIKE '%' || p_task_type || '%'
    ORDER BY success_rate DESC, ap.avg_response_time_ms ASC
    LIMIT 3;
END;
$$ LANGUAGE plpgsql;

-- Sample data for task templates
INSERT INTO task_templates (name, description, task_pattern, recommended_agents, recommended_strategy) VALUES
('Customer Onboarding', 'Complete new customer onboarding process', 'onboard|register|new customer', '["customer_service", "marketing"]', 'sequential'),
('Revenue Analysis', 'Analyze revenue and provide insights', 'revenue|income|earnings|financial analysis', '["financial", "operations"]', 'parallel'),
('Marketing Campaign', 'Create and launch marketing campaign', 'campaign|promotion|marketing|advertise', '["marketing", "customer_service", "financial"]', 'hierarchical'),
('Process Optimization', 'Optimize business processes', 'optimize|improve|efficiency|workflow', '["operations", "financial"]', 'adaptive'),
('Customer Issue Resolution', 'Resolve customer complaints or issues', 'complaint|issue|problem|support', '["customer_service", "operations"]', 'consensus')
ON CONFLICT DO NOTHING;