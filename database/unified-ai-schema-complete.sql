-- Unified AI Tables for Supabase PostgreSQL (Complete Version)
-- Adds AI insights, vector knowledge, and business recommendations to existing schema

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- ENUMS AND TYPES
-- ==========================================

-- AI Agent Types Enum (needed for business recommendations)
CREATE TYPE ai_agent_type AS ENUM (
  'master_coach',
  'technical_operations',
  'customer_success',
  'marketing',
  'financial'
);

-- AI Insight Types Enum
CREATE TYPE ai_insight_type AS ENUM (
  'revenue_opportunity',
  'customer_behavior', 
  'operational_efficiency',
  'marketing_insight',
  'scheduling_optimization',
  'performance_alert'
);

-- AI Insight Urgency Enum
CREATE TYPE ai_insight_urgency AS ENUM (
  'low',
  'medium',
  'high',
  'critical'
);

-- Knowledge document types enum
CREATE TYPE knowledge_type AS ENUM (
  'business_methodology',
  'operational_procedure',
  'marketing_strategy',
  'financial_guideline',
  'customer_service',
  'technical_documentation',
  'training_material',
  'compliance_document'
);

-- Business recommendation status enum
CREATE TYPE recommendation_status AS ENUM (
  'pending',
  'reviewed',
  'implemented',
  'rejected',
  'expired'
);

-- AI session status enum
CREATE TYPE ai_session_status AS ENUM (
  'active',
  'paused',
  'completed',
  'expired'
);

-- ==========================================
-- AI INSIGHTS SYSTEM
-- ==========================================

-- AI Insights table (replaces SQLite ai_insights)
CREATE TABLE ai_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  type ai_insight_type NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  recommendation TEXT NOT NULL,
  confidence DECIMAL(5,4) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  impact_score DECIMAL(3,1) NOT NULL CHECK (impact_score >= 1 AND impact_score <= 10),
  urgency ai_insight_urgency NOT NULL DEFAULT 'medium',
  data_points JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI Insight Metrics table (replaces SQLite insight_metrics)
CREATE TABLE ai_insight_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  insight_id UUID REFERENCES ai_insights(id) ON DELETE CASCADE,
  metric_name VARCHAR(100) NOT NULL,
  metric_value DECIMAL(15,6) NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- VECTOR KNOWLEDGE SYSTEM (RAG) - NO PGVECTOR
-- ==========================================

-- Knowledge Documents table (replaces SQLite knowledge_documents)
-- NOTE: No vector embedding column - will store embeddings as JSONB or external service
CREATE TABLE knowledge_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  knowledge_type knowledge_type NOT NULL,
  source VARCHAR(255) NOT NULL,
  metadata JSONB DEFAULT '{}',
  -- Store embedding as JSONB array instead of vector type
  embedding_data JSONB, -- Will store embedding vectors as JSON arrays
  embedding_model VARCHAR(100) DEFAULT 'text-embedding-3-small',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- BUSINESS RECOMMENDATIONS
-- ==========================================

-- Business Recommendations table (replaces SQLite business_recommendations)
CREATE TABLE business_recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  agent_type ai_agent_type NOT NULL,
  title VARCHAR(255) NOT NULL,
  recommendations_data JSONB NOT NULL,
  confidence_score DECIMAL(5,4) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  implementation_status recommendation_status DEFAULT 'pending',
  priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
  expected_impact JSONB DEFAULT '{}', -- ROI, time savings, etc.
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  implemented_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- AI AGENT SESSIONS & INTERACTIONS
-- ==========================================

-- AI Agent Sessions
CREATE TABLE ai_agent_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  agent_type ai_agent_type NOT NULL,
  session_title VARCHAR(255),
  status ai_session_status DEFAULT 'active',
  context_data JSONB DEFAULT '{}',
  session_metadata JSONB DEFAULT '{}',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI Agent Messages
CREATE TABLE ai_agent_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES ai_agent_sessions(id) ON DELETE CASCADE,
  message_type VARCHAR(20) NOT NULL CHECK (message_type IN ('user', 'agent')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  tokens_used INTEGER DEFAULT 0,
  processing_time_ms INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- LEARNING & ANALYTICS INSIGHTS
-- ==========================================

-- Learning insights table for AI improvement
CREATE TABLE ai_learning_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  insight_category VARCHAR(100) NOT NULL,
  insight_data JSONB NOT NULL,
  confidence_level DECIMAL(5,4) CHECK (confidence_level >= 0 AND confidence_level <= 1),
  validation_status VARCHAR(20) DEFAULT 'pending',
  impact_metrics JSONB DEFAULT '{}',
  learned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  validated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- INDEXES FOR PERFORMANCE
-- ==========================================

-- AI Insights indexes
CREATE INDEX idx_ai_insights_barbershop ON ai_insights(barbershop_id);
CREATE INDEX idx_ai_insights_type ON ai_insights(type);
CREATE INDEX idx_ai_insights_urgency ON ai_insights(urgency);
CREATE INDEX idx_ai_insights_active ON ai_insights(is_active);
CREATE INDEX idx_ai_insights_created_at ON ai_insights(created_at DESC);
CREATE INDEX idx_ai_insights_expires_at ON ai_insights(expires_at);

-- AI Insight Metrics indexes  
CREATE INDEX idx_ai_insight_metrics_insight_id ON ai_insight_metrics(insight_id);
CREATE INDEX idx_ai_insight_metrics_recorded_at ON ai_insight_metrics(recorded_at DESC);

-- Knowledge Documents indexes
CREATE INDEX idx_knowledge_docs_type ON knowledge_documents(knowledge_type);
CREATE INDEX idx_knowledge_docs_source ON knowledge_documents(source);
CREATE INDEX idx_knowledge_docs_active ON knowledge_documents(is_active);
CREATE INDEX idx_knowledge_docs_updated_at ON knowledge_documents(updated_at DESC);
-- JSONB index for embedding data (when we store embeddings as JSONB)
CREATE INDEX idx_knowledge_docs_embedding_data ON knowledge_documents USING GIN (embedding_data);
-- Full text search indexes
CREATE INDEX idx_knowledge_docs_content_fts ON knowledge_documents USING GIN (to_tsvector('english', content));
CREATE INDEX idx_knowledge_docs_title_fts ON knowledge_documents USING GIN (to_tsvector('english', title));

-- Business Recommendations indexes
CREATE INDEX idx_business_recs_barbershop ON business_recommendations(barbershop_id);
CREATE INDEX idx_business_recs_agent_type ON business_recommendations(agent_type);
CREATE INDEX idx_business_recs_status ON business_recommendations(implementation_status);
CREATE INDEX idx_business_recs_priority ON business_recommendations(priority DESC);
CREATE INDEX idx_business_recs_generated_at ON business_recommendations(generated_at DESC);

-- AI Agent Sessions indexes
CREATE INDEX idx_ai_sessions_user_id ON ai_agent_sessions(user_id);
CREATE INDEX idx_ai_sessions_barbershop_id ON ai_agent_sessions(barbershop_id);
CREATE INDEX idx_ai_sessions_agent_type ON ai_agent_sessions(agent_type);
CREATE INDEX idx_ai_sessions_status ON ai_agent_sessions(status);
CREATE INDEX idx_ai_sessions_last_activity ON ai_agent_sessions(last_activity_at DESC);

-- AI Agent Messages indexes
CREATE INDEX idx_ai_messages_session_id ON ai_agent_messages(session_id);
CREATE INDEX idx_ai_messages_created_at ON ai_agent_messages(created_at DESC);
CREATE INDEX idx_ai_messages_type ON ai_agent_messages(message_type);

-- AI Learning Insights indexes
CREATE INDEX idx_ai_learning_barbershop ON ai_learning_insights(barbershop_id);
CREATE INDEX idx_ai_learning_category ON ai_learning_insights(insight_category);
CREATE INDEX idx_ai_learning_validation ON ai_learning_insights(validation_status);
CREATE INDEX idx_ai_learning_learned_at ON ai_learning_insights(learned_at DESC);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Enable RLS on all AI tables
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insight_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agent_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agent_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_learning_insights ENABLE ROW LEVEL SECURITY;

-- AI Insights RLS Policies
CREATE POLICY ai_insights_select_policy ON ai_insights
  FOR SELECT USING (
    barbershop_id IN (
      SELECT id FROM barbershops WHERE owner_id = auth.uid()
      UNION ALL
      SELECT barbershop_id FROM barbershop_staff WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY ai_insights_insert_policy ON ai_insights
  FOR INSERT WITH CHECK (
    barbershop_id IN (
      SELECT id FROM barbershops WHERE owner_id = auth.uid()
    )
  );

-- Knowledge Documents RLS Policies (accessible to all authenticated users)
CREATE POLICY knowledge_docs_select_policy ON knowledge_documents
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY knowledge_docs_insert_policy ON knowledge_documents
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Business Recommendations RLS Policies  
CREATE POLICY business_recs_select_policy ON business_recommendations
  FOR SELECT USING (
    barbershop_id IN (
      SELECT id FROM barbershops WHERE owner_id = auth.uid()
      UNION ALL 
      SELECT barbershop_id FROM barbershop_staff WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY business_recs_insert_policy ON business_recommendations
  FOR INSERT WITH CHECK (
    barbershop_id IN (
      SELECT id FROM barbershops WHERE owner_id = auth.uid()
    )
  );

-- AI Agent Sessions RLS Policies
CREATE POLICY ai_sessions_select_policy ON ai_agent_sessions
  FOR SELECT USING (user_id = auth.uid() OR barbershop_id IN (
    SELECT id FROM barbershops WHERE owner_id = auth.uid()
  ));

CREATE POLICY ai_sessions_insert_policy ON ai_agent_sessions  
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- AI Agent Messages RLS Policies
CREATE POLICY ai_messages_select_policy ON ai_agent_messages
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM ai_agent_sessions WHERE user_id = auth.uid()
    )
  );

CREATE POLICY ai_messages_insert_policy ON ai_agent_messages
  FOR INSERT WITH CHECK (
    session_id IN (
      SELECT id FROM ai_agent_sessions WHERE user_id = auth.uid()
    )
  );

-- ==========================================
-- TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- ==========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER ai_insights_updated_at BEFORE UPDATE ON ai_insights
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER knowledge_docs_updated_at BEFORE UPDATE ON knowledge_documents  
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER business_recs_updated_at BEFORE UPDATE ON business_recommendations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- FUNCTIONS FOR AI OPERATIONS (NO PGVECTOR)
-- ==========================================

-- Function to search knowledge documents using full-text search
CREATE OR REPLACE FUNCTION search_knowledge_documents_basic(
  search_text text,
  doc_type knowledge_type DEFAULT NULL,
  max_results int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  title varchar(255),
  content text,
  knowledge_type knowledge_type,
  source varchar(255),
  metadata jsonb,
  relevance_score float
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    kd.id,
    kd.title,
    kd.content,
    kd.knowledge_type,
    kd.source,
    kd.metadata,
    -- Improved text similarity using full-text search ranking
    GREATEST(
      ts_rank(to_tsvector('english', kd.content), to_tsquery('english', search_text)),
      ts_rank(to_tsvector('english', kd.title), to_tsquery('english', search_text)) * 2.0,
      CASE 
        WHEN kd.content ILIKE '%' || search_text || '%' THEN 0.5
        WHEN kd.title ILIKE '%' || search_text || '%' THEN 1.0
        ELSE 0.0
      END
    ) as relevance_score
  FROM knowledge_documents kd
  WHERE kd.is_active = true
    AND (doc_type IS NULL OR kd.knowledge_type = doc_type)
    AND (
      to_tsvector('english', kd.content) @@ to_tsquery('english', search_text) OR
      to_tsvector('english', kd.title) @@ to_tsquery('english', search_text) OR
      kd.content ILIKE '%' || search_text || '%' OR
      kd.title ILIKE '%' || search_text || '%'
    )
  ORDER BY relevance_score DESC
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- Function to get active insights for a barbershop
CREATE OR REPLACE FUNCTION get_active_ai_insights(barbershop_uuid uuid)
RETURNS TABLE (
  id uuid,
  type ai_insight_type,
  title varchar(255),
  description text,
  recommendation text,
  confidence decimal(5,4),
  impact_score decimal(3,1),
  urgency ai_insight_urgency,
  created_at timestamp with time zone
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ai.id,
    ai.type,
    ai.title,
    ai.description,
    ai.recommendation,
    ai.confidence,
    ai.impact_score,
    ai.urgency,
    ai.created_at
  FROM ai_insights ai
  WHERE ai.barbershop_id = barbershop_uuid
    AND ai.is_active = true
    AND ai.expires_at > NOW()
  ORDER BY ai.urgency DESC, ai.impact_score DESC, ai.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get business recommendations for a barbershop
CREATE OR REPLACE FUNCTION get_business_recommendations(barbershop_uuid uuid)
RETURNS TABLE (
  id uuid,
  agent_type ai_agent_type,
  title varchar(255),
  recommendations_data jsonb,
  confidence_score decimal(5,4),
  implementation_status recommendation_status,
  priority integer,
  created_at timestamp with time zone
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    br.id,
    br.agent_type,
    br.title,
    br.recommendations_data,
    br.confidence_score,
    br.implementation_status,
    br.priority,
    br.created_at
  FROM business_recommendations br
  WHERE br.barbershop_id = barbershop_uuid
    AND (br.expires_at IS NULL OR br.expires_at > NOW())
  ORDER BY br.priority DESC, br.generated_at DESC;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- SAMPLE DATA FOR TESTING
-- ==========================================

-- Insert sample knowledge documents
INSERT INTO knowledge_documents (title, content, knowledge_type, source, metadata) VALUES
(
  'Six Figure Barber Methodology Overview',
  'The Six Figure Barber methodology focuses on premium service delivery, customer relationship building, and strategic business growth. Key principles include: 1) Excellence in craft execution, 2) Premium pricing strategies, 3) Customer lifetime value optimization, 4) Operational efficiency, 5) Brand building and marketing.',
  'business_methodology',
  'Six Figure Barber Core Manual',
  '{"version": "2.0", "category": "foundational", "priority": "high"}'
),
(
  'Customer Retention Best Practices',
  'Effective customer retention strategies: 1) Personalized service experiences, 2) Consistent quality delivery, 3) Follow-up communications, 4) Loyalty programs, 5) Feedback collection and implementation, 6) Value-added services, 7) Relationship building beyond transactions.',
  'customer_service',
  'Customer Success Playbook',
  '{"version": "1.5", "category": "operations", "priority": "high"}'
),
(
  'Revenue Optimization Strategies',
  'Maximize barbershop revenue through: 1) Premium service upselling, 2) Product sales integration, 3) Peak hour pricing, 4) Package deals and memberships, 5) Referral incentive programs, 6) Seasonal promotions, 7) Corporate partnerships.',
  'financial_guideline',
  'Financial Excellence Manual',
  '{"version": "2.1", "category": "revenue", "priority": "high"}'
);

-- Comment for completion
-- This schema successfully unifies all SQLite database functionality into PostgreSQL
-- WITHOUT pgvector dependency - includes all required enums and types