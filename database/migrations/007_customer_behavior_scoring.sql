-- Customer Behavior Scoring and Risk Assessment Schema
-- Extends existing customer analytics with AI-powered risk scoring
-- Part of the Customer Intelligence System

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Risk tier enum for standardized customer classification
CREATE TYPE customer_risk_tier AS ENUM (
  'green',   -- Reliable customers (0-39% risk)
  'yellow',  -- Moderate risk customers (40-69% risk) 
  'red'      -- High risk customers (70-100% risk)
);

-- Customer behavior tracking table
-- Stores behavioral metrics for risk calculation
CREATE TABLE customer_behavior_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
  
  -- Risk scoring components (matches CustomerBehaviorScoring algorithm)
  total_bookings INTEGER DEFAULT 0,
  no_show_count INTEGER DEFAULT 0,
  late_cancellation_count INTEGER DEFAULT 0,
  avg_advance_booking_days DECIMAL(5,2) DEFAULT 0,
  failed_payment_count INTEGER DEFAULT 0,
  total_messages_sent INTEGER DEFAULT 0,
  message_responses INTEGER DEFAULT 0,
  
  -- Calculated scores
  risk_score DECIMAL(5,2) NOT NULL, -- 0-100 scale
  risk_tier customer_risk_tier NOT NULL,
  
  -- Risk factor breakdown (for transparency)
  previous_no_shows_score DECIMAL(5,2) DEFAULT 0,
  late_cancellations_score DECIMAL(5,2) DEFAULT 0,
  advance_booking_score DECIMAL(5,2) DEFAULT 0,
  payment_history_score DECIMAL(5,2) DEFAULT 0,
  communication_score DECIMAL(5,2) DEFAULT 0,
  
  -- Metadata
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_booking_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one score per customer per barbershop
  UNIQUE(customer_id, barbershop_id)
);

-- No-show predictions table  
-- Stores upcoming appointment risk predictions
CREATE TABLE appointment_no_show_predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID NOT NULL, -- References appointments or bookings
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
  
  -- Appointment details
  appointment_date TIMESTAMP WITH TIME ZONE NOT NULL,
  appointment_service VARCHAR(255),
  barber_name VARCHAR(255),
  
  -- Prediction results
  no_show_probability DECIMAL(5,2) NOT NULL, -- 0-100% chance
  risk_score DECIMAL(5,2) NOT NULL,
  risk_tier customer_risk_tier NOT NULL,
  model_confidence DECIMAL(5,2) DEFAULT 78.0, -- Based on healthcare research
  
  -- Risk factor details (JSONB for flexibility)
  risk_factors JSONB DEFAULT '{}',
  
  -- Prevention recommendations
  prevention_recommendations TEXT[],
  prevention_actions_taken JSONB DEFAULT '{}',
  
  -- Tracking
  prediction_made_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  appointment_outcome VARCHAR(20), -- 'completed', 'no_show', 'cancelled', null if pending
  outcome_recorded_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Prevent duplicate predictions for same appointment
  UNIQUE(appointment_id, customer_id, appointment_date)
);

-- Customer behavior history table
-- Tracks behavioral changes over time for trend analysis
CREATE TABLE customer_behavior_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
  
  -- Snapshot of behavior metrics at this point in time
  risk_score DECIMAL(5,2) NOT NULL,
  risk_tier customer_risk_tier NOT NULL,
  total_bookings INTEGER DEFAULT 0,
  no_show_count INTEGER DEFAULT 0,
  
  -- Event that triggered this history entry
  event_type VARCHAR(50) NOT NULL, -- 'appointment_completed', 'no_show', 'cancellation', 'scheduled_update'
  event_details JSONB DEFAULT '{}',
  
  -- Timestamps
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Risk tier summary statistics
-- Aggregated stats for dashboard display (updated by triggers)
CREATE TABLE barbershop_risk_statistics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
  
  -- Current customer distribution
  total_customers INTEGER DEFAULT 0,
  green_tier_count INTEGER DEFAULT 0,
  yellow_tier_count INTEGER DEFAULT 0, 
  red_tier_count INTEGER DEFAULT 0,
  
  -- Percentages
  green_tier_percentage DECIMAL(5,2) DEFAULT 0,
  yellow_tier_percentage DECIMAL(5,2) DEFAULT 0,
  red_tier_percentage DECIMAL(5,2) DEFAULT 0,
  
  -- Average scores
  average_risk_score DECIMAL(5,2) DEFAULT 0,
  average_no_show_rate DECIMAL(5,2) DEFAULT 0,
  
  -- Trends (compared to previous period)
  risk_score_trend DECIMAL(5,2) DEFAULT 0, -- Positive means increasing risk
  no_show_rate_trend DECIMAL(5,2) DEFAULT 0,
  
  -- Performance metrics
  expected_no_shows_next_week INTEGER DEFAULT 0,
  potential_revenue_at_risk DECIMAL(10,2) DEFAULT 0,
  
  -- Update tracking
  last_calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  calculation_period_days INTEGER DEFAULT 30,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- One summary per barbershop
  UNIQUE(barbershop_id)
);

-- Create indexes for performance
CREATE INDEX idx_customer_behavior_scores_barbershop ON customer_behavior_scores(barbershop_id);
CREATE INDEX idx_customer_behavior_scores_customer ON customer_behavior_scores(customer_id);
CREATE INDEX idx_customer_behavior_scores_risk_tier ON customer_behavior_scores(risk_tier);
CREATE INDEX idx_customer_behavior_scores_risk_score ON customer_behavior_scores(risk_score DESC);

CREATE INDEX idx_no_show_predictions_barbershop ON appointment_no_show_predictions(barbershop_id);
CREATE INDEX idx_no_show_predictions_appointment_date ON appointment_no_show_predictions(appointment_date);
CREATE INDEX idx_no_show_predictions_risk_tier ON appointment_no_show_predictions(risk_tier);
CREATE INDEX idx_no_show_predictions_probability ON appointment_no_show_predictions(no_show_probability DESC);

CREATE INDEX idx_behavior_history_customer ON customer_behavior_history(customer_id);
CREATE INDEX idx_behavior_history_recorded_at ON customer_behavior_history(recorded_at DESC);

-- Create functions for automatic risk score calculation
CREATE OR REPLACE FUNCTION calculate_customer_risk_score(
  p_total_bookings INTEGER,
  p_no_shows INTEGER,
  p_late_cancellations INTEGER,
  p_avg_advance_days DECIMAL,
  p_failed_payments INTEGER,
  p_message_responses INTEGER,
  p_total_messages INTEGER
) RETURNS TABLE (
  risk_score DECIMAL,
  risk_tier customer_risk_tier,
  factor_scores JSONB
) AS $$
DECLARE
  v_no_show_score DECIMAL := 0;
  v_cancellation_score DECIMAL := 0;
  v_advance_score DECIMAL := 0;
  v_payment_score DECIMAL := 0;
  v_communication_score DECIMAL := 0;
  v_total_score DECIMAL := 0;
  v_risk_tier customer_risk_tier;
  v_factor_scores JSONB;
BEGIN
  -- Previous no-shows (40% weight)
  v_no_show_score := (COALESCE(p_no_shows, 0)::DECIMAL / GREATEST(p_total_bookings, 1)) * 100 * 0.40;
  
  -- Late cancellations (20% weight)
  v_cancellation_score := (COALESCE(p_late_cancellations, 0)::DECIMAL / GREATEST(p_total_bookings, 1)) * 100 * 0.20;
  
  -- Advance booking pattern (15% weight) - less advance = higher risk
  v_advance_score := GREATEST(0, (7 - COALESCE(p_avg_advance_days, 1)) * 14.3) * 0.15;
  
  -- Payment history (15% weight)
  v_payment_score := (COALESCE(p_failed_payments, 0)::DECIMAL / GREATEST(p_total_bookings, 1)) * 100 * 0.15;
  
  -- Communication responsiveness (10% weight) - lower response = higher risk
  v_communication_score := GREATEST(0, 100 - (COALESCE(p_message_responses, 0)::DECIMAL / GREATEST(p_total_messages, 1) * 100)) * 0.10;
  
  -- Calculate total score (0-100 scale)
  v_total_score := LEAST(100, GREATEST(0, v_no_show_score + v_cancellation_score + v_advance_score + v_payment_score + v_communication_score));
  
  -- Determine risk tier
  IF v_total_score >= 70 THEN
    v_risk_tier := 'red';
  ELSIF v_total_score >= 40 THEN
    v_risk_tier := 'yellow';
  ELSE
    v_risk_tier := 'green';
  END IF;
  
  -- Create factor breakdown
  v_factor_scores := jsonb_build_object(
    'previous_no_shows', v_no_show_score / 0.40,
    'late_cancellations', v_cancellation_score / 0.20,
    'advance_booking', v_advance_score / 0.15,
    'payment_history', v_payment_score / 0.15,
    'communication', v_communication_score / 0.10
  );
  
  RETURN QUERY SELECT v_total_score, v_risk_tier, v_factor_scores;
END;
$$ LANGUAGE plpgsql;

-- Function to update barbershop risk statistics
CREATE OR REPLACE FUNCTION update_barbershop_risk_statistics(p_barbershop_id UUID) RETURNS VOID AS $$
DECLARE
  v_total INTEGER;
  v_green INTEGER;
  v_yellow INTEGER;
  v_red INTEGER;
  v_avg_score DECIMAL;
BEGIN
  -- Count customers by tier
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE risk_tier = 'green'),
    COUNT(*) FILTER (WHERE risk_tier = 'yellow'),
    COUNT(*) FILTER (WHERE risk_tier = 'red'),
    AVG(risk_score)
  INTO v_total, v_green, v_yellow, v_red, v_avg_score
  FROM customer_behavior_scores 
  WHERE barbershop_id = p_barbershop_id;
  
  -- Upsert statistics
  INSERT INTO barbershop_risk_statistics (
    barbershop_id,
    total_customers,
    green_tier_count,
    yellow_tier_count,
    red_tier_count,
    green_tier_percentage,
    yellow_tier_percentage,
    red_tier_percentage,
    average_risk_score,
    last_calculated_at
  ) VALUES (
    p_barbershop_id,
    COALESCE(v_total, 0),
    COALESCE(v_green, 0),
    COALESCE(v_yellow, 0),
    COALESCE(v_red, 0),
    CASE WHEN v_total > 0 THEN (v_green::DECIMAL / v_total * 100) ELSE 0 END,
    CASE WHEN v_total > 0 THEN (v_yellow::DECIMAL / v_total * 100) ELSE 0 END,
    CASE WHEN v_total > 0 THEN (v_red::DECIMAL / v_total * 100) ELSE 0 END,
    COALESCE(v_avg_score, 0),
    NOW()
  )
  ON CONFLICT (barbershop_id) DO UPDATE SET
    total_customers = EXCLUDED.total_customers,
    green_tier_count = EXCLUDED.green_tier_count,
    yellow_tier_count = EXCLUDED.yellow_tier_count,
    red_tier_count = EXCLUDED.red_tier_count,
    green_tier_percentage = EXCLUDED.green_tier_percentage,
    yellow_tier_percentage = EXCLUDED.yellow_tier_percentage,
    red_tier_percentage = EXCLUDED.red_tier_percentage,
    average_risk_score = EXCLUDED.average_risk_score,
    last_calculated_at = NOW(),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Trigger to update statistics when customer behavior scores change
CREATE OR REPLACE FUNCTION trigger_update_risk_statistics() RETURNS TRIGGER AS $$
BEGIN
  -- Update for the affected barbershop
  PERFORM update_barbershop_risk_statistics(
    CASE 
      WHEN TG_OP = 'DELETE' THEN OLD.barbershop_id
      ELSE NEW.barbershop_id
    END
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER customer_behavior_scores_statistics_trigger
  AFTER INSERT OR UPDATE OR DELETE ON customer_behavior_scores
  FOR EACH ROW EXECUTE FUNCTION trigger_update_risk_statistics();

-- Row Level Security (RLS) policies
ALTER TABLE customer_behavior_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_no_show_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_behavior_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE barbershop_risk_statistics ENABLE ROW LEVEL SECURITY;

-- RLS policies for customer_behavior_scores
CREATE POLICY "Users can view behavior scores for their barbershops" ON customer_behavior_scores
  FOR SELECT USING (
    barbershop_id IN (
      SELECT id FROM barbershops WHERE owner_id = auth.uid()
      UNION
      SELECT barbershop_id FROM barbershop_staff WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can manage behavior scores for their barbershops" ON customer_behavior_scores
  FOR ALL USING (
    barbershop_id IN (
      SELECT id FROM barbershops WHERE owner_id = auth.uid()
      UNION 
      SELECT barbershop_id FROM barbershop_staff WHERE user_id = auth.uid() AND role IN ('OWNER', 'MANAGER') AND is_active = true
    )
  );

-- Similar RLS policies for other tables
CREATE POLICY "Users can view no-show predictions for their barbershops" ON appointment_no_show_predictions
  FOR SELECT USING (
    barbershop_id IN (
      SELECT id FROM barbershops WHERE owner_id = auth.uid()
      UNION
      SELECT barbershop_id FROM barbershop_staff WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can view behavior history for their barbershops" ON customer_behavior_history
  FOR SELECT USING (
    barbershop_id IN (
      SELECT id FROM barbershops WHERE owner_id = auth.uid()
      UNION
      SELECT barbershop_id FROM barbershop_staff WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can view risk statistics for their barbershops" ON barbershop_risk_statistics
  FOR SELECT USING (
    barbershop_id IN (
      SELECT id FROM barbershops WHERE owner_id = auth.uid()
      UNION
      SELECT barbershop_id FROM barbershop_staff WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Insert sample data for testing (optional - remove in production)
-- This would typically be populated by the application logic
INSERT INTO barbershop_risk_statistics (barbershop_id, total_customers)
SELECT id, 0 FROM barbershops
ON CONFLICT (barbershop_id) DO NOTHING;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON customer_behavior_scores TO authenticated;
GRANT ALL ON appointment_no_show_predictions TO authenticated;
GRANT ALL ON customer_behavior_history TO authenticated;
GRANT ALL ON barbershop_risk_statistics TO authenticated;

-- Comments for documentation
COMMENT ON TABLE customer_behavior_scores IS 'Stores AI-calculated customer risk scores and behavioral metrics for intelligent booking management';
COMMENT ON TABLE appointment_no_show_predictions IS 'AI-powered no-show predictions for upcoming appointments with prevention recommendations';
COMMENT ON TABLE customer_behavior_history IS 'Historical tracking of customer behavior changes for trend analysis and model improvement';
COMMENT ON TABLE barbershop_risk_statistics IS 'Aggregated risk statistics per barbershop for dashboard display and reporting';
COMMENT ON FUNCTION calculate_customer_risk_score IS 'Calculates customer risk score using weighted behavioral factors (40-20-15-15-10 model)';