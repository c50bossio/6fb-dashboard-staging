-- Create missing AI-related tables for 6FB AI Agent System
-- These tables are required for the AI agent functionality

-- Enable extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgvector";

-- AI Agent Types Enum (create if not exists)
DO $$ BEGIN
    CREATE TYPE ai_agent_type AS ENUM (
        'master_coach',
        'financial',
        'client_acquisition',
        'operations',
        'brand',
        'growth',
        'strategic_mindset'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ==========================================
-- AI AGENT CHAT SYSTEM TABLES
-- ==========================================

-- AI Agent chat sessions
CREATE TABLE IF NOT EXISTS ai_chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    barbershop_id UUID REFERENCES barbershops(id) ON DELETE SET NULL,
    agent_type ai_agent_type NOT NULL,
    
    -- Session metadata
    session_title VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Business context for RAG
    business_context JSONB DEFAULT '{}', -- Current revenue, goals, challenges
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI Agent chat messages
CREATE TABLE IF NOT EXISTS ai_chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL, -- 'user' or 'assistant'
    content TEXT NOT NULL,
    
    -- AI response metadata
    agent_name VARCHAR(100),
    recommendations JSONB DEFAULT '[]',
    confidence_score DECIMAL(3,2),
    
    -- RAG system data
    vector_embedding vector(1536), -- OpenAI embeddings
    retrieval_sources JSONB DEFAULT '[]',
    
    -- Usage tracking
    tokens_used INTEGER DEFAULT 0,
    processing_time_ms INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI Agent knowledge base for RAG
CREATE TABLE IF NOT EXISTS ai_knowledge_base (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_type ai_agent_type NOT NULL,
    category VARCHAR(100) NOT NULL, -- strategy, pricing, marketing, etc.
    
    -- Content
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    summary TEXT,
    
    -- Vector search
    vector_embedding vector(1536),
    
    -- Metadata
    tags VARCHAR(255)[],
    success_rate DECIMAL(3,2) DEFAULT 0.95, -- How successful this knowledge is
    usage_count INTEGER DEFAULT 0,
    
    -- Barbershop context
    business_type VARCHAR(50), -- solo, small_shop, enterprise
    revenue_range VARCHAR(50), -- starter, growth, established
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- ANALYTICS TABLES
-- ==========================================

-- Business analytics
CREATE TABLE IF NOT EXISTS business_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
    
    -- Time period
    date DATE NOT NULL,
    period_type VARCHAR(20) NOT NULL, -- daily, weekly, monthly
    
    -- Revenue metrics
    total_revenue DECIMAL(10,2) DEFAULT 0,
    service_revenue DECIMAL(10,2) DEFAULT 0,
    tip_revenue DECIMAL(10,2) DEFAULT 0,
    
    -- Appointment metrics
    total_appointments INTEGER DEFAULT 0,
    completed_appointments INTEGER DEFAULT 0,
    cancelled_appointments INTEGER DEFAULT 0,
    no_show_appointments INTEGER DEFAULT 0,
    
    -- Client metrics
    new_clients INTEGER DEFAULT 0,
    returning_clients INTEGER DEFAULT 0,
    total_clients INTEGER DEFAULT 0,
    
    -- AI usage metrics
    ai_conversations INTEGER DEFAULT 0,
    ai_recommendations_implemented INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(barbershop_id, date, period_type)
);

-- AI Agent usage analytics
CREATE TABLE IF NOT EXISTS ai_usage_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    barbershop_id UUID REFERENCES barbershops(id) ON DELETE SET NULL,
    agent_type ai_agent_type NOT NULL,
    
    -- Usage metrics
    date DATE NOT NULL,
    conversations_started INTEGER DEFAULT 0,
    messages_sent INTEGER DEFAULT 0,
    recommendations_received INTEGER DEFAULT 0,
    tokens_consumed INTEGER DEFAULT 0,
    
    -- Engagement metrics
    avg_session_duration_minutes DECIMAL(8,2) DEFAULT 0,
    satisfaction_rating DECIMAL(3,2), -- User feedback on AI responses
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, agent_type, date)
);

-- ==========================================
-- INDEXES FOR NEW TABLES
-- ==========================================

-- AI Chat indexes
CREATE INDEX IF NOT EXISTS idx_ai_sessions_user ON ai_chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_sessions_barbershop ON ai_chat_sessions(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_ai_sessions_agent ON ai_chat_sessions(agent_type);
CREATE INDEX IF NOT EXISTS idx_ai_messages_session ON ai_chat_messages(session_id);

-- Vector similarity search indexes (requires pgvector extension)
CREATE INDEX IF NOT EXISTS idx_ai_messages_embedding ON ai_chat_messages USING ivfflat (vector_embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_knowledge_embedding ON ai_knowledge_base USING ivfflat (vector_embedding vector_cosine_ops);

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_business_analytics_shop_date ON business_analytics(barbershop_id, date);
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_date ON ai_usage_analytics(user_id, date);

-- ==========================================
-- TRIGGERS FOR UPDATED_AT
-- ==========================================

-- Create the trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to new tables with updated_at
CREATE TRIGGER update_ai_sessions_updated_at 
    BEFORE UPDATE ON ai_chat_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_knowledge_base_updated_at 
    BEFORE UPDATE ON ai_knowledge_base 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================

-- Enable RLS on new tables
ALTER TABLE ai_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_analytics ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (users can only see their own data)
CREATE POLICY ai_sessions_user_policy ON ai_chat_sessions
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY ai_messages_session_policy ON ai_chat_messages
    FOR ALL USING (
        session_id IN (
            SELECT id FROM ai_chat_sessions WHERE user_id = auth.uid()
        )
    );

CREATE POLICY knowledge_base_public_policy ON ai_knowledge_base
    FOR SELECT USING (is_active = true);

CREATE POLICY business_analytics_owner_policy ON business_analytics
    FOR ALL USING (
        barbershop_id IN (
            SELECT id FROM barbershops WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY ai_usage_user_policy ON ai_usage_analytics
    FOR ALL USING (user_id = auth.uid());

-- Success message
\echo 'Successfully created missing AI-related tables!'
\echo 'Tables created:'
\echo '- ai_chat_sessions'
\echo '- ai_chat_messages'
\echo '- ai_knowledge_base'
\echo '- business_analytics'
\echo '- ai_usage_analytics'