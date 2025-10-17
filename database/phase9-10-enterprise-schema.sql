-- Phase 9-10 Enterprise Multi-Location Management Database Schema
-- Comprehensive franchise operations, staff optimization, and advanced analytics

-- Organization Hierarchy and Structure
-- Enhanced organization management for franchise operations
CREATE TABLE organization_hierarchy (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    parent_org_id UUID REFERENCES organization_hierarchy(id) ON DELETE SET NULL,
    
    -- Hierarchy details
    org_level INTEGER NOT NULL CHECK (org_level >= 1 AND org_level <= 5), -- 1=corporate, 2=regional, 3=district, 4=local, 5=location
    hierarchy_path LTREE, -- PostgreSQL ltree for efficient hierarchy queries
    level_name VARCHAR(50) NOT NULL, -- 'Corporate', 'Regional', 'District', 'Local', 'Location'
    
    -- Management structure
    manager_id UUID REFERENCES profiles(id),
    management_team JSONB, -- Array of manager profiles and roles
    reporting_structure JSONB, -- Organizational chart data
    
    -- Operational details
    territory_coverage JSONB, -- Geographic coverage area
    business_metrics_targets JSONB, -- KPI targets for this level
    budget_allocation DECIMAL(15,2) DEFAULT 0,
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    INDEX idx_org_hierarchy_parent (parent_org_id),
    INDEX idx_org_hierarchy_level (org_level),
    INDEX idx_org_hierarchy_path USING GIST (hierarchy_path),
    INDEX idx_org_hierarchy_manager (manager_id)
);

-- Location Performance Metrics
-- Real-time and historical performance data for all locations
CREATE TABLE location_performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Time period
    metric_date DATE NOT NULL,
    metric_period VARCHAR(20) DEFAULT 'daily' CHECK (metric_period IN ('hourly', 'daily', 'weekly', 'monthly', 'quarterly')),
    
    -- Financial metrics
    total_revenue DECIMAL(12,2) DEFAULT 0,
    gross_profit DECIMAL(12,2) DEFAULT 0,
    net_profit DECIMAL(12,2) DEFAULT 0,
    average_transaction_value DECIMAL(10,2) DEFAULT 0,
    cost_of_goods_sold DECIMAL(12,2) DEFAULT 0,
    operational_expenses DECIMAL(12,2) DEFAULT 0,
    
    -- Customer metrics
    total_customers INTEGER DEFAULT 0,
    new_customers INTEGER DEFAULT 0,
    returning_customers INTEGER DEFAULT 0,
    customer_retention_rate DECIMAL(5,4) DEFAULT 0,
    customer_satisfaction_score DECIMAL(3,2) DEFAULT 0,
    net_promoter_score INTEGER DEFAULT 0,
    
    -- Operational metrics
    total_appointments INTEGER DEFAULT 0,
    completed_appointments INTEGER DEFAULT 0,
    cancelled_appointments INTEGER DEFAULT 0,
    no_show_appointments INTEGER DEFAULT 0,
    average_service_duration DECIMAL(6,2) DEFAULT 0,
    capacity_utilization DECIMAL(5,4) DEFAULT 0,
    
    -- Staff metrics
    total_staff_hours DECIMAL(8,2) DEFAULT 0,
    productive_staff_hours DECIMAL(8,2) DEFAULT 0,
    staff_efficiency DECIMAL(5,4) DEFAULT 0,
    staff_satisfaction_score DECIMAL(3,2) DEFAULT 0,
    staff_turnover_rate DECIMAL(5,4) DEFAULT 0,
    
    -- Product/inventory metrics
    products_sold INTEGER DEFAULT 0,
    inventory_turnover DECIMAL(6,4) DEFAULT 0,
    cross_sell_success_rate DECIMAL(5,4) DEFAULT 0,
    upsell_success_rate DECIMAL(5,4) DEFAULT 0,
    
    -- Quality metrics
    service_quality_score DECIMAL(3,2) DEFAULT 0,
    hygiene_compliance_score DECIMAL(3,2) DEFAULT 0,
    brand_standard_compliance DECIMAL(5,4) DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_location_metric_date_period UNIQUE (location_id, metric_date, metric_period),
    
    INDEX idx_performance_location_date (location_id, metric_date DESC),
    INDEX idx_performance_org_date (organization_id, metric_date DESC),
    INDEX idx_performance_period (metric_period),
    INDEX idx_performance_revenue (total_revenue DESC),
    INDEX idx_performance_efficiency (staff_efficiency DESC)
);

-- Staff Skills Matrix and Competencies
-- Track staff skills, certifications, and performance capabilities
CREATE TABLE staff_skills_matrix (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    location_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
    
    -- Skill details
    skill_category VARCHAR(50) NOT NULL CHECK (skill_category IN (
        'haircut', 'styling', 'coloring', 'shaving', 'customer_service', 
        'sales', 'management', 'technical', 'safety', 'product_knowledge'
    )),
    skill_name VARCHAR(100) NOT NULL,
    skill_description TEXT,
    
    -- Proficiency assessment
    proficiency_level INTEGER NOT NULL CHECK (proficiency_level >= 1 AND proficiency_level <= 5), -- 1=beginner, 5=expert
    proficiency_score DECIMAL(3,2) DEFAULT 0, -- 0-100 assessment score
    certification_required BOOLEAN DEFAULT FALSE,
    certification_obtained BOOLEAN DEFAULT FALSE,
    certification_date DATE,
    certification_expiry_date DATE,
    
    -- Assessment details
    last_assessed_date DATE,
    assessed_by_id UUID REFERENCES profiles(id),
    assessment_method VARCHAR(50), -- 'observation', 'test', 'customer_feedback', 'peer_review'
    
    -- Performance correlation
    customer_satisfaction_impact DECIMAL(5,4) DEFAULT 0, -- How this skill affects customer satisfaction
    revenue_impact DECIMAL(5,4) DEFAULT 0, -- How this skill affects revenue generation
    efficiency_impact DECIMAL(5,4) DEFAULT 0, -- How this skill affects service efficiency
    
    -- Training and development
    training_needed BOOLEAN DEFAULT FALSE,
    recommended_training JSONB, -- Training programs and resources
    skill_development_plan JSONB,
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_staff_skill UNIQUE (staff_id, skill_category, skill_name),
    
    INDEX idx_skills_staff (staff_id),
    INDEX idx_skills_location (location_id),
    INDEX idx_skills_category (skill_category),
    INDEX idx_skills_proficiency (proficiency_level DESC, proficiency_score DESC),
    INDEX idx_skills_certification (certification_required, certification_obtained)
);

-- AI-Powered Staff Schedule Optimization
-- Optimized schedules generated by AI considering demand, skills, and constraints
CREATE TABLE optimized_staff_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
    
    -- Schedule period
    schedule_date DATE NOT NULL,
    schedule_period VARCHAR(20) DEFAULT 'daily' CHECK (schedule_period IN ('daily', 'weekly', 'bi_weekly', 'monthly')),
    
    -- Optimization parameters
    optimization_algorithm VARCHAR(50) DEFAULT 'genetic_algorithm',
    optimization_version VARCHAR(20) DEFAULT 'v1.0',
    optimization_run_time DECIMAL(8,4) DEFAULT 0, -- Seconds to generate schedule
    
    -- Schedule data
    staff_assignments JSONB NOT NULL, -- Detailed staff assignments with times and services
    shift_patterns JSONB, -- Shift start/end times and break schedules
    skill_coverage JSONB, -- Ensure all required skills are covered
    
    -- Optimization metrics
    optimization_score DECIMAL(5,4) NOT NULL DEFAULT 0, -- Overall optimization quality (0-1)
    efficiency_score DECIMAL(5,4) DEFAULT 0, -- Staff utilization efficiency
    coverage_score DECIMAL(5,4) DEFAULT 0, -- Skill and time coverage quality
    satisfaction_score DECIMAL(5,4) DEFAULT 0, -- Predicted staff satisfaction
    cost_optimization_score DECIMAL(5,4) DEFAULT 0, -- Labor cost efficiency
    
    -- Constraint satisfaction
    constraints_satisfied JSONB, -- Which constraints were met/violated
    constraint_violations INTEGER DEFAULT 0,
    hard_constraint_violations INTEGER DEFAULT 0,
    
    -- Business impact predictions
    predicted_revenue DECIMAL(10,2) DEFAULT 0,
    predicted_customer_satisfaction DECIMAL(3,2) DEFAULT 0,
    predicted_staff_overtime_cost DECIMAL(8,2) DEFAULT 0,
    
    -- Schedule status
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'optimizing', 'approved', 'published', 'active', 'completed', 'cancelled')),
    approved_by_id UUID REFERENCES profiles(id),
    approved_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    INDEX idx_optimized_schedules_location_date (location_id, schedule_date DESC),
    INDEX idx_optimized_schedules_status (status),
    INDEX idx_optimized_schedules_score (optimization_score DESC),
    INDEX idx_optimized_schedules_period (schedule_period)
);

-- Staff Performance Tracking
-- Comprehensive performance monitoring and KPI tracking for staff
CREATE TABLE staff_performance_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    location_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
    
    -- Performance period
    tracking_date DATE NOT NULL,
    tracking_period VARCHAR(20) DEFAULT 'daily' CHECK (tracking_period IN ('daily', 'weekly', 'monthly', 'quarterly', 'annually')),
    
    -- Productivity metrics
    total_hours_worked DECIMAL(6,2) DEFAULT 0,
    productive_hours DECIMAL(6,2) DEFAULT 0,
    break_time DECIMAL(6,2) DEFAULT 0,
    productive_time_ratio DECIMAL(5,4) DEFAULT 0,
    
    -- Service metrics
    appointments_completed INTEGER DEFAULT 0,
    average_service_duration DECIMAL(6,2) DEFAULT 0,
    services_per_hour DECIMAL(5,2) DEFAULT 0,
    appointment_cancellation_rate DECIMAL(5,4) DEFAULT 0,
    
    -- Revenue metrics
    revenue_generated DECIMAL(10,2) DEFAULT 0,
    average_ticket_size DECIMAL(8,2) DEFAULT 0,
    upsell_revenue DECIMAL(10,2) DEFAULT 0,
    product_sales_revenue DECIMAL(10,2) DEFAULT 0,
    commission_earned DECIMAL(10,2) DEFAULT 0,
    
    -- Quality metrics
    customer_satisfaction_avg DECIMAL(3,2) DEFAULT 0,
    customer_complaints INTEGER DEFAULT 0,
    customer_compliments INTEGER DEFAULT 0,
    quality_score DECIMAL(3,2) DEFAULT 0,
    
    -- Skills development
    new_skills_acquired INTEGER DEFAULT 0,
    certifications_obtained INTEGER DEFAULT 0,
    training_hours_completed DECIMAL(6,2) DEFAULT 0,
    skill_assessments_passed INTEGER DEFAULT 0,
    
    -- Team collaboration
    collaboration_score DECIMAL(5,4) DEFAULT 0,
    mentoring_activities INTEGER DEFAULT 0,
    team_projects_participated INTEGER DEFAULT 0,
    peer_feedback_score DECIMAL(3,2) DEFAULT 0,
    
    -- Goal achievement
    personal_goals_met INTEGER DEFAULT 0,
    team_goals_contributed INTEGER DEFAULT 0,
    bonus_qualifications_met INTEGER DEFAULT 0,
    
    -- Performance ranking
    location_rank INTEGER,
    organization_rank INTEGER,
    percentile_rank DECIMAL(5,4), -- 0-1 percentile within organization
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_staff_performance_date_period UNIQUE (staff_id, tracking_date, tracking_period),
    
    INDEX idx_staff_performance_staff_date (staff_id, tracking_date DESC),
    INDEX idx_staff_performance_location_date (location_id, tracking_date DESC),
    INDEX idx_staff_performance_revenue (revenue_generated DESC),
    INDEX idx_staff_performance_quality (quality_score DESC),
    INDEX idx_staff_performance_ranking (organization_rank ASC)
);

-- Predictive Analytics Models
-- Store and track ML models for business forecasting and optimization
CREATE TABLE predictive_analytics_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Model identification
    model_name VARCHAR(100) NOT NULL,
    model_type VARCHAR(50) NOT NULL CHECK (model_type IN (
        'revenue_forecasting', 'demand_prediction', 'staff_optimization', 
        'customer_churn', 'inventory_forecasting', 'market_analysis'
    )),
    model_version VARCHAR(20) DEFAULT 'v1.0',
    
    -- Model training details
    training_data_start_date DATE NOT NULL,
    training_data_end_date DATE NOT NULL,
    training_data_size INTEGER NOT NULL DEFAULT 0,
    training_features JSONB, -- Features used in model training
    
    -- Model performance
    accuracy_score DECIMAL(5,4) DEFAULT 0,
    precision_score DECIMAL(5,4) DEFAULT 0,
    recall_score DECIMAL(5,4) DEFAULT 0,
    f1_score DECIMAL(5,4) DEFAULT 0,
    mean_absolute_error DECIMAL(10,4) DEFAULT 0,
    root_mean_square_error DECIMAL(10,4) DEFAULT 0,
    
    -- Model configuration
    algorithm_name VARCHAR(100) NOT NULL,
    hyperparameters JSONB,
    model_parameters JSONB,
    feature_importance JSONB,
    
    -- Deployment status
    model_status VARCHAR(20) DEFAULT 'training' CHECK (model_status IN (
        'training', 'testing', 'validating', 'deployed', 'deprecated', 'failed'
    )),
    deployment_date TIMESTAMPTZ,
    last_prediction_date TIMESTAMPTZ,
    
    -- Performance tracking
    predictions_made INTEGER DEFAULT 0,
    successful_predictions INTEGER DEFAULT 0,
    model_drift_score DECIMAL(5,4) DEFAULT 0, -- Measure of model performance degradation
    retrain_required BOOLEAN DEFAULT FALSE,
    next_retrain_date DATE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_model_name_version UNIQUE (organization_id, model_name, model_version),
    
    INDEX idx_models_org_type (organization_id, model_type),
    INDEX idx_models_status (model_status),
    INDEX idx_models_accuracy (accuracy_score DESC),
    INDEX idx_models_deployment (deployment_date DESC)
);

-- Business Intelligence Insights
-- AI-generated insights and recommendations for business optimization
CREATE TABLE business_intelligence_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    location_id UUID REFERENCES barbershops(id) ON DELETE SET NULL, -- NULL for org-wide insights
    
    -- Insight details
    insight_type VARCHAR(50) NOT NULL CHECK (insight_type IN (
        'revenue_optimization', 'cost_reduction', 'staff_optimization', 'customer_retention',
        'market_opportunity', 'operational_efficiency', 'competitive_advantage', 'risk_alert'
    )),
    insight_category VARCHAR(30) DEFAULT 'optimization' CHECK (insight_category IN (
        'optimization', 'alert', 'opportunity', 'risk', 'trend', 'recommendation'
    )),
    
    insight_title VARCHAR(255) NOT NULL,
    insight_description TEXT NOT NULL,
    insight_details JSONB, -- Detailed analysis and data
    
    -- Impact assessment
    confidence_score DECIMAL(5,4) NOT NULL DEFAULT 0.5, -- 0-1 confidence in insight accuracy
    impact_level VARCHAR(20) DEFAULT 'medium' CHECK (impact_level IN ('low', 'medium', 'high', 'critical')),
    potential_revenue_impact DECIMAL(12,2) DEFAULT 0,
    potential_cost_savings DECIMAL(12,2) DEFAULT 0,
    implementation_difficulty VARCHAR(20) DEFAULT 'medium' CHECK (implementation_difficulty IN ('easy', 'medium', 'hard', 'complex')),
    
    -- Recommendations
    recommended_actions JSONB NOT NULL, -- Structured action items
    priority_score INTEGER DEFAULT 50 CHECK (priority_score >= 1 AND priority_score <= 100),
    urgency_level VARCHAR(20) DEFAULT 'normal' CHECK (urgency_level IN ('low', 'normal', 'high', 'immediate')),
    estimated_implementation_time VARCHAR(50), -- e.g., '1-2 weeks', '1 month'
    
    -- Tracking and follow-up
    insight_status VARCHAR(20) DEFAULT 'new' CHECK (insight_status IN (
        'new', 'reviewed', 'approved', 'in_progress', 'implemented', 'dismissed', 'expired'
    )),
    assigned_to_id UUID REFERENCES profiles(id),
    reviewed_by_id UUID REFERENCES profiles(id),
    reviewed_at TIMESTAMPTZ,
    
    -- Source and validation
    data_sources JSONB, -- What data was used to generate this insight
    model_used VARCHAR(100), -- Which model generated this insight
    validation_method VARCHAR(50), -- How the insight was validated
    
    -- Results tracking
    implementation_results JSONB, -- Actual results after implementation
    actual_impact DECIMAL(12,2), -- Measured impact after implementation
    
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    INDEX idx_insights_org_type (organization_id, insight_type),
    INDEX idx_insights_location_type (location_id, insight_type),
    INDEX idx_insights_status_priority (insight_status, priority_score DESC),
    INDEX idx_insights_impact (impact_level, potential_revenue_impact DESC),
    INDEX idx_insights_generated (generated_at DESC)
);

-- Franchise Benchmarking and Comparison
-- Compare performance across locations and identify best practices
CREATE TABLE franchise_benchmarking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Benchmarking details
    benchmark_date DATE NOT NULL,
    benchmark_type VARCHAR(50) NOT NULL CHECK (benchmark_type IN (
        'revenue', 'efficiency', 'customer_satisfaction', 'staff_performance',
        'cost_management', 'growth', 'quality', 'innovation'
    )),
    
    -- Performance rankings
    location_rankings JSONB NOT NULL, -- Ranked list of locations with scores
    benchmark_metrics JSONB NOT NULL, -- Specific metrics being benchmarked
    
    -- Statistical analysis
    top_performer_id UUID REFERENCES barbershops(id),
    bottom_performer_id UUID REFERENCES barbershops(id),
    median_performance DECIMAL(10,4),
    average_performance DECIMAL(10,4),
    standard_deviation DECIMAL(10,4),
    performance_range DECIMAL(10,4),
    
    -- Best practices identification
    best_practices JSONB, -- Practices from top performers
    improvement_opportunities JSONB, -- Areas for improvement for bottom performers
    correlation_analysis JSONB, -- What factors correlate with high performance
    
    -- Insights and recommendations
    key_differentiators JSONB, -- What makes top performers different
    recommended_interventions JSONB, -- Suggested improvements for underperformers
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_org_benchmark_date_type UNIQUE (organization_id, benchmark_date, benchmark_type),
    
    INDEX idx_benchmarking_org_date (organization_id, benchmark_date DESC),
    INDEX idx_benchmarking_type (benchmark_type),
    INDEX idx_benchmarking_top_performer (top_performer_id)
);

-- Enterprise Resource Planning Integration
-- Centralized resource management across all locations
CREATE TABLE enterprise_resource_planning (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Resource category
    resource_type VARCHAR(50) NOT NULL CHECK (resource_type IN (
        'inventory', 'equipment', 'supplies', 'licenses', 'subscriptions',
        'facilities', 'technology', 'marketing', 'training', 'compliance'
    )),
    resource_name VARCHAR(255) NOT NULL,
    resource_description TEXT,
    
    -- Resource allocation
    total_quantity DECIMAL(12,4) DEFAULT 0,
    allocated_quantity DECIMAL(12,4) DEFAULT 0,
    available_quantity DECIMAL(12,4) GENERATED ALWAYS AS (total_quantity - allocated_quantity) STORED,
    unit_of_measure VARCHAR(50) DEFAULT 'units',
    
    -- Cost management
    unit_cost DECIMAL(10,4) DEFAULT 0,
    total_cost DECIMAL(15,2) GENERATED ALWAYS AS (total_quantity * unit_cost) STORED,
    budget_allocated DECIMAL(15,2) DEFAULT 0,
    budget_utilized DECIMAL(15,2) DEFAULT 0,
    budget_variance DECIMAL(15,2) GENERATED ALWAYS AS (budget_allocated - budget_utilized) STORED,
    
    -- Allocation by location
    location_allocations JSONB, -- How resources are distributed across locations
    allocation_rules JSONB, -- Rules for automatic allocation
    
    -- Procurement and sourcing
    preferred_vendor_id UUID REFERENCES supplier_performance(id),
    procurement_schedule JSONB, -- When and how to procure this resource
    lead_time_days INTEGER DEFAULT 0,
    minimum_stock_level DECIMAL(10,4) DEFAULT 0,
    reorder_point DECIMAL(10,4) DEFAULT 0,
    
    -- Performance tracking
    utilization_rate DECIMAL(5,4) DEFAULT 0, -- How efficiently resource is being used
    waste_percentage DECIMAL(5,4) DEFAULT 0,
    satisfaction_score DECIMAL(3,2) DEFAULT 0, -- User satisfaction with resource
    
    -- Compliance and governance
    compliance_requirements JSONB, -- Regulatory requirements for this resource
    audit_trail JSONB, -- History of changes and approvals
    approval_required BOOLEAN DEFAULT FALSE,
    approved_by_id UUID REFERENCES profiles(id),
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    INDEX idx_erp_org_type (organization_id, resource_type),
    INDEX idx_erp_utilization (utilization_rate DESC),
    INDEX idx_erp_cost (total_cost DESC),
    INDEX idx_erp_vendor (preferred_vendor_id)
);

-- Create update triggers for timestamp columns
CREATE TRIGGER update_organization_hierarchy_updated_at
    BEFORE UPDATE ON organization_hierarchy
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_skills_matrix_updated_at
    BEFORE UPDATE ON staff_skills_matrix
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_optimized_staff_schedules_updated_at
    BEFORE UPDATE ON optimized_staff_schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_performance_tracking_updated_at
    BEFORE UPDATE ON staff_performance_tracking
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_predictive_analytics_models_updated_at
    BEFORE UPDATE ON predictive_analytics_models
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_business_intelligence_insights_updated_at
    BEFORE UPDATE ON business_intelligence_insights
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_enterprise_resource_planning_updated_at
    BEFORE UPDATE ON enterprise_resource_planning
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Views for common enterprise queries

-- Multi-Location Performance Dashboard View
CREATE VIEW v_multi_location_dashboard AS
SELECT 
    lpm.organization_id,
    lpm.location_id,
    b.name as location_name,
    b.address,
    lpm.metric_date,
    lpm.total_revenue,
    lpm.gross_profit,
    lpm.total_customers,
    lpm.customer_satisfaction_score,
    lpm.staff_efficiency,
    lpm.capacity_utilization,
    lpm.cross_sell_success_rate,
    -- Rankings
    ROW_NUMBER() OVER (PARTITION BY lpm.organization_id, lpm.metric_date ORDER BY lpm.total_revenue DESC) as revenue_rank,
    ROW_NUMBER() OVER (PARTITION BY lpm.organization_id, lpm.metric_date ORDER BY lpm.customer_satisfaction_score DESC) as satisfaction_rank,
    ROW_NUMBER() OVER (PARTITION BY lpm.organization_id, lpm.metric_date ORDER BY lpm.staff_efficiency DESC) as efficiency_rank
FROM location_performance_metrics lpm
JOIN barbershops b ON lpm.location_id = b.id
WHERE lpm.metric_period = 'daily'
ORDER BY lpm.metric_date DESC, lpm.total_revenue DESC;

-- Staff Performance Summary View
CREATE VIEW v_staff_performance_summary AS
SELECT 
    spt.staff_id,
    p.full_name as staff_name,
    spt.location_id,
    b.name as location_name,
    spt.tracking_date,
    spt.revenue_generated,
    spt.customer_satisfaction_avg,
    spt.productive_time_ratio,
    spt.services_per_hour,
    spt.location_rank,
    spt.organization_rank,
    ssm.avg_proficiency,
    COUNT(ssm.skill_name) as total_skills
FROM staff_performance_tracking spt
JOIN profiles p ON spt.staff_id = p.id
JOIN barbershops b ON spt.location_id = b.id
LEFT JOIN (
    SELECT 
        staff_id,
        AVG(proficiency_level) as avg_proficiency,
        COUNT(*) as skill_count
    FROM staff_skills_matrix 
    WHERE is_active = true
    GROUP BY staff_id
) ssm ON spt.staff_id = ssm.staff_id
WHERE spt.tracking_period = 'monthly'
ORDER BY spt.tracking_date DESC, spt.organization_rank ASC;

-- Business Intelligence Insights Dashboard View
CREATE VIEW v_business_insights_dashboard AS
SELECT 
    bii.organization_id,
    bii.location_id,
    bii.insight_type,
    bii.insight_category,
    bii.insight_title,
    bii.insight_description,
    bii.confidence_score,
    bii.impact_level,
    bii.potential_revenue_impact,
    bii.potential_cost_savings,
    bii.priority_score,
    bii.insight_status,
    bii.generated_at,
    bii.expires_at,
    CASE 
        WHEN bii.expires_at < NOW() THEN true
        ELSE false
    END as is_expired,
    EXTRACT(days FROM (bii.expires_at - NOW())) as days_until_expiry
FROM business_intelligence_insights bii
WHERE bii.insight_status IN ('new', 'reviewed', 'approved', 'in_progress')
ORDER BY bii.priority_score DESC, bii.generated_at DESC;

-- Functions for enterprise management

-- Function to calculate organization-wide performance metrics
CREATE OR REPLACE FUNCTION calculate_organization_performance(
    org_uuid UUID,
    metric_date DATE DEFAULT CURRENT_DATE
) RETURNS TABLE (
    total_revenue DECIMAL(15,2),
    total_locations INTEGER,
    avg_customer_satisfaction DECIMAL(3,2),
    total_staff INTEGER,
    avg_efficiency DECIMAL(5,4)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(lpm.total_revenue), 0) as total_revenue,
        COUNT(DISTINCT lpm.location_id)::INTEGER as total_locations,
        COALESCE(AVG(lpm.customer_satisfaction_score), 0)::DECIMAL(3,2) as avg_customer_satisfaction,
        COUNT(DISTINCT spt.staff_id)::INTEGER as total_staff,
        COALESCE(AVG(lpm.staff_efficiency), 0)::DECIMAL(5,4) as avg_efficiency
    FROM location_performance_metrics lpm
    LEFT JOIN staff_performance_tracking spt ON lpm.location_id = spt.location_id 
        AND spt.tracking_date = metric_date
    WHERE lpm.organization_id = org_uuid
        AND lpm.metric_date = metric_date
        AND lpm.metric_period = 'daily';
END;
$$ LANGUAGE plpgsql;

-- Function to generate staff optimization recommendations
CREATE OR REPLACE FUNCTION generate_staff_optimization_insights(org_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    insight_count INTEGER := 0;
    location_record RECORD;
BEGIN
    -- Generate insights for each location in the organization
    FOR location_record IN 
        SELECT id, name FROM barbershops 
        WHERE organization_id = org_uuid AND is_active = true
    LOOP
        -- Check for underperforming staff
        INSERT INTO business_intelligence_insights (
            organization_id, location_id, insight_type, insight_category,
            insight_title, insight_description, confidence_score,
            impact_level, recommended_actions, priority_score
        )
        SELECT 
            org_uuid,
            location_record.id,
            'staff_optimization',
            'opportunity',
            'Staff Performance Improvement Opportunity',
            'Staff member ' || p.full_name || ' has below-average performance metrics',
            0.8,
            'medium',
            jsonb_build_object(
                'action', 'performance_review',
                'staff_id', spt.staff_id,
                'focus_areas', jsonb_build_array('customer_satisfaction', 'efficiency')
            ),
            70
        FROM staff_performance_tracking spt
        JOIN profiles p ON spt.staff_id = p.id
        WHERE spt.location_id = location_record.id
            AND spt.tracking_period = 'monthly'
            AND spt.tracking_date = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
            AND (spt.customer_satisfaction_avg < 4.0 OR spt.productive_time_ratio < 0.7)
        ON CONFLICT DO NOTHING;
        
        GET DIAGNOSTICS insight_count = ROW_COUNT;
    END LOOP;
    
    RETURN insight_count;
END;
$$ LANGUAGE plpgsql;

-- Sample data seeding function for enterprise features
CREATE OR REPLACE FUNCTION seed_enterprise_data(org_uuid UUID)
RETURNS VOID AS $$
DECLARE
    location_record RECORD;
BEGIN
    -- Create sample organization hierarchy
    INSERT INTO organization_hierarchy (
        organization_id, org_level, level_name, 
        territory_coverage, budget_allocation
    ) VALUES (
        org_uuid, 1, 'Corporate',
        jsonb_build_object('region', 'nationwide', 'states', jsonb_build_array('CA', 'NY', 'TX')),
        1000000.00
    ) ON CONFLICT DO NOTHING;
    
    -- Generate performance metrics for locations
    FOR location_record IN 
        SELECT id FROM barbershops WHERE organization_id = org_uuid LIMIT 5
    LOOP
        INSERT INTO location_performance_metrics (
            location_id, organization_id, metric_date,
            total_revenue, total_customers, staff_efficiency,
            customer_satisfaction_score, capacity_utilization
        ) VALUES (
            location_record.id, org_uuid, CURRENT_DATE,
            (RANDOM() * 10000 + 5000)::DECIMAL(12,2), -- $5K-$15K daily revenue
            (RANDOM() * 50 + 20)::INTEGER, -- 20-70 customers
            (RANDOM() * 0.3 + 0.6)::DECIMAL(5,4), -- 60-90% efficiency
            (RANDOM() * 1.5 + 3.5)::DECIMAL(3,2), -- 3.5-5.0 satisfaction
            (RANDOM() * 0.4 + 0.5)::DECIMAL(5,4) -- 50-90% capacity utilization
        ) ON CONFLICT (location_id, metric_date, metric_period) DO NOTHING;
    END LOOP;
    
    RAISE NOTICE 'Sample enterprise data seeded for organization %', org_uuid;
END;
$$ LANGUAGE plpgsql;

-- Performance optimization
ANALYZE organization_hierarchy;
ANALYZE location_performance_metrics;
ANALYZE staff_skills_matrix;
ANALYZE optimized_staff_schedules;
ANALYZE staff_performance_tracking;
ANALYZE predictive_analytics_models;
ANALYZE business_intelligence_insights;
ANALYZE franchise_benchmarking;
ANALYZE enterprise_resource_planning;

-- Table comments
COMMENT ON TABLE organization_hierarchy IS 'Multi-level organization structure for franchise management';
COMMENT ON TABLE location_performance_metrics IS 'Comprehensive performance tracking for all locations';
COMMENT ON TABLE staff_skills_matrix IS 'Skills assessment and competency tracking for staff';
COMMENT ON TABLE optimized_staff_schedules IS 'AI-generated optimal staff scheduling';
COMMENT ON TABLE staff_performance_tracking IS 'Individual staff performance monitoring and KPIs';
COMMENT ON TABLE predictive_analytics_models IS 'ML models for business forecasting and optimization';
COMMENT ON TABLE business_intelligence_insights IS 'AI-generated business insights and recommendations';
COMMENT ON TABLE franchise_benchmarking IS 'Performance comparison and best practice identification';
COMMENT ON TABLE enterprise_resource_planning IS 'Centralized resource management across locations';