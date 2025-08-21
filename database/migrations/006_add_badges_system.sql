-- Migration: Add achievement badges system for customer gamification
-- Version: 006
-- Created: 2025-01-21

BEGIN;

-- Create badge_definitions table to store all possible badges
CREATE TABLE IF NOT EXISTS badge_definitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Badge identification
  badge_key VARCHAR(100) UNIQUE NOT NULL, -- Unique identifier for code reference
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  
  -- Visual properties
  icon VARCHAR(100) NOT NULL, -- Icon class or emoji
  color VARCHAR(50) NOT NULL, -- Badge color (hex or CSS class)
  image_url VARCHAR(500), -- Optional badge image
  
  -- Badge classification
  category VARCHAR(50) NOT NULL, -- loyalty, milestone, spending, special, seasonal
  rarity VARCHAR(20) NOT NULL DEFAULT 'common', -- common, rare, epic, legendary
  points INTEGER NOT NULL DEFAULT 0, -- Points awarded for earning this badge
  
  -- Achievement criteria (stored as JSON for flexibility)
  criteria JSONB NOT NULL, -- { "type": "visits", "threshold": 10, "additional_conditions": {} }
  
  -- Status and metadata
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT badge_definitions_category_check CHECK (category IN ('loyalty', 'milestone', 'spending', 'special', 'seasonal')),
  CONSTRAINT badge_definitions_rarity_check CHECK (rarity IN ('common', 'rare', 'epic', 'legendary'))
);

-- Create customer_badges table to track earned badges
CREATE TABLE IF NOT EXISTS customer_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- References
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  badge_definition_id UUID NOT NULL REFERENCES badge_definitions(id) ON DELETE CASCADE,
  
  -- Achievement details
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  progress_data JSONB, -- Store data that led to earning (visits count, spending amount, etc.)
  
  -- Notification tracking
  notification_sent BOOLEAN DEFAULT FALSE,
  notification_sent_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  UNIQUE(customer_id, badge_definition_id) -- Prevent duplicate badges
);

-- Create badge_progress table to track progress toward unearned badges
CREATE TABLE IF NOT EXISTS badge_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- References
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  badge_definition_id UUID NOT NULL REFERENCES badge_definitions(id) ON DELETE CASCADE,
  
  -- Progress tracking
  current_progress JSONB NOT NULL, -- Current values (visits: 7, spending: 250.00, etc.)
  progress_percentage DECIMAL(5,2) DEFAULT 0, -- Calculated percentage toward goal
  
  -- Timestamps
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(customer_id, badge_definition_id) -- One progress record per customer per badge
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_badge_definitions_category ON badge_definitions(category);
CREATE INDEX IF NOT EXISTS idx_badge_definitions_active ON badge_definitions(is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_customer_badges_customer_id ON customer_badges(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_badges_earned_at ON customer_badges(earned_at);
CREATE INDEX IF NOT EXISTS idx_customer_badges_notification ON customer_badges(notification_sent, notification_sent_at);
CREATE INDEX IF NOT EXISTS idx_badge_progress_customer_id ON badge_progress(customer_id);
CREATE INDEX IF NOT EXISTS idx_badge_progress_percentage ON badge_progress(progress_percentage);

-- Add updated_at trigger for badge_definitions
DROP TRIGGER IF EXISTS trigger_badge_definitions_updated_at ON badge_definitions;
CREATE TRIGGER trigger_badge_definitions_updated_at
    BEFORE UPDATE ON badge_definitions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add updated_at trigger for badge_progress
DROP TRIGGER IF EXISTS trigger_badge_progress_updated_at ON badge_progress;
CREATE TRIGGER trigger_badge_progress_updated_at
    BEFORE UPDATE ON badge_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert initial badge definitions
INSERT INTO badge_definitions (badge_key, name, description, icon, color, category, rarity, points, criteria) VALUES
-- Loyalty badges
('first_visit', 'First Timer', 'Welcome to our barbershop! Your journey begins here.', '🎯', '#3B82F6', 'loyalty', 'common', 10, '{"type": "visits", "threshold": 1}'),
('regular_customer', 'Regular', 'You''ve become a regular! 5 visits and counting.', '⭐', '#10B981', 'loyalty', 'common', 25, '{"type": "visits", "threshold": 5}'),
('vip_customer', 'VIP', 'VIP status achieved! 15 visits of excellence.', '👑', '#F59E0B', 'loyalty', 'rare', 100, '{"type": "visits", "threshold": 15}'),
('elite_member', 'Elite Member', 'Elite status! You''re part of our exclusive circle.', '💎', '#8B5CF6', 'loyalty', 'epic', 250, '{"type": "visits", "threshold": 30}'),

-- Milestone badges
('milestone_10', '10 Club', 'Double digits! 10 visits completed.', '🔟', '#6366F1', 'milestone', 'common', 50, '{"type": "visits", "threshold": 10}'),
('milestone_25', '25 Club', 'Quarter century of style! 25 visits strong.', '🎯', '#EC4899', 'milestone', 'rare', 125, '{"type": "visits", "threshold": 25}'),
('milestone_50', '50 Club', 'Half century achiever! 50 visits of dedication.', '🏆', '#EF4444', 'milestone', 'epic', 300, '{"type": "visits", "threshold": 50}'),
('milestone_100', '100 Club', 'Century club member! 100 visits of loyalty.', '🌟', '#F97316', 'milestone', 'legendary', 1000, '{"type": "visits", "threshold": 100}'),

-- Spending badges
('bronze_spender', 'Bronze Spender', 'You''ve invested $100 in looking great!', '🥉', '#CD7F32', 'spending', 'common', 30, '{"type": "spending", "threshold": 100}'),
('silver_spender', 'Silver Spender', 'Silver status! $250 invested in style.', '🥈', '#C0C0C0', 'spending', 'rare', 75, '{"type": "spending", "threshold": 250}'),
('gold_spender', 'Gold Spender', 'Golden customer! $500 invested in excellence.', '🥇', '#FFD700', 'spending', 'epic', 200, '{"type": "spending", "threshold": 500}'),
('platinum_spender', 'Platinum Spender', 'Platinum tier! $1000+ investment in style.', '💳', '#E5E4E2', 'spending', 'legendary', 500, '{"type": "spending", "threshold": 1000}'),

-- Special badges
('birthday_guest', 'Birthday Guest', 'Celebrated your special day with us!', '🎂', '#F472B6', 'special', 'rare', 50, '{"type": "birthday_visit", "threshold": 1}'),
('referral_champion', 'Referral Champion', 'Brought friends to experience greatness!', '🤝', '#06B6D4', 'special', 'rare', 100, '{"type": "referrals", "threshold": 3}'),
('review_star', 'Review Star', 'Shared your experience with a stellar review!', '⭐', '#FBBF24', 'special', 'rare', 75, '{"type": "reviews", "threshold": 1}'),
('early_bird', 'Early Bird', 'Always on time! 5 early arrivals.', '🐦', '#84CC16', 'special', 'common', 40, '{"type": "early_arrivals", "threshold": 5}'),

-- Seasonal badges
('summer_regular', 'Summer Regular', 'Beat the heat with 3 summer visits!', '☀️', '#F97316', 'seasonal', 'rare', 60, '{"type": "seasonal_visits", "threshold": 3, "season": "summer"}'),
('holiday_hero', 'Holiday Hero', 'Looking sharp for the holidays!', '🎄', '#DC2626', 'seasonal', 'rare', 80, '{"type": "seasonal_visits", "threshold": 2, "season": "winter"}'),
('spring_refresh', 'Spring Refresh', 'Fresh start with spring styling!', '🌸', '#EC4899', 'seasonal', 'rare', 60, '{"type": "seasonal_visits", "threshold": 2, "season": "spring"}'),
('fall_fashionista', 'Fall Fashionista', 'Autumn style master!', '🍂', '#F59E0B', 'seasonal', 'rare', 60, '{"type": "seasonal_visits", "threshold": 2, "season": "fall"}');

-- Function to calculate badge progress for a customer
CREATE OR REPLACE FUNCTION calculate_badge_progress(p_customer_id UUID)
RETURNS TABLE(
  badge_definition_id UUID,
  badge_key VARCHAR,
  current_value NUMERIC,
  target_value NUMERIC,
  progress_percentage DECIMAL
) AS $$
DECLARE
  customer_data RECORD;
  badge_record RECORD;
  current_val NUMERIC;
  target_val NUMERIC;
  progress_pct DECIMAL;
BEGIN
  -- Get customer statistics
  SELECT 
    c.total_visits,
    c.total_spent,
    c.created_at,
    COUNT(r.id) as referral_count,
    COUNT(CASE WHEN a.scheduled_at::time < '09:00:00' THEN 1 END) as early_arrivals
  INTO customer_data
  FROM customers c
  LEFT JOIN customers r ON r.referred_by_customer_id = c.id
  LEFT JOIN appointments a ON a.customer_id = c.id
  WHERE c.id = p_customer_id
  GROUP BY c.id, c.total_visits, c.total_spent, c.created_at;

  -- Loop through all active badge definitions
  FOR badge_record IN 
    SELECT bd.id, bd.badge_key, bd.criteria
    FROM badge_definitions bd
    WHERE bd.is_active = TRUE
    AND NOT EXISTS (
      SELECT 1 FROM customer_badges cb 
      WHERE cb.customer_id = p_customer_id 
      AND cb.badge_definition_id = bd.id
    )
  LOOP
    -- Calculate progress based on badge type
    CASE badge_record.criteria->>'type'
      WHEN 'visits' THEN
        current_val := customer_data.total_visits;
        target_val := (badge_record.criteria->>'threshold')::NUMERIC;
        
      WHEN 'spending' THEN
        current_val := customer_data.total_spent;
        target_val := (badge_record.criteria->>'threshold')::NUMERIC;
        
      WHEN 'referrals' THEN
        current_val := customer_data.referral_count;
        target_val := (badge_record.criteria->>'threshold')::NUMERIC;
        
      WHEN 'early_arrivals' THEN
        current_val := customer_data.early_arrivals;
        target_val := (badge_record.criteria->>'threshold')::NUMERIC;
        
      ELSE
        current_val := 0;
        target_val := 1;
    END CASE;

    -- Calculate percentage (cap at 100%)
    progress_pct := LEAST(100, (current_val / target_val * 100));

    -- Return the progress data
    badge_definition_id := badge_record.id;
    badge_key := badge_record.badge_key;
    current_value := current_val;
    target_value := target_val;
    progress_percentage := progress_pct;
    
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to check and award new badges for a customer
CREATE OR REPLACE FUNCTION check_and_award_badges(p_customer_id UUID)
RETURNS TABLE(newly_earned_badges JSONB) AS $$
DECLARE
  progress_record RECORD;
  badge_def RECORD;
  new_badges JSONB := '[]'::JSONB;
BEGIN
  -- Get progress for all unearned badges
  FOR progress_record IN
    SELECT * FROM calculate_badge_progress(p_customer_id)
    WHERE progress_percentage >= 100
  LOOP
    -- Get badge definition details
    SELECT * INTO badge_def 
    FROM badge_definitions 
    WHERE id = progress_record.badge_definition_id;
    
    -- Award the badge
    INSERT INTO customer_badges (customer_id, badge_definition_id, progress_data)
    VALUES (
      p_customer_id, 
      progress_record.badge_definition_id,
      jsonb_build_object(
        'current_value', progress_record.current_value,
        'target_value', progress_record.target_value,
        'earned_percentage', progress_record.progress_percentage
      )
    );
    
    -- Add to newly earned badges list
    new_badges := new_badges || jsonb_build_object(
      'badge_key', badge_def.badge_key,
      'name', badge_def.name,
      'description', badge_def.description,
      'icon', badge_def.icon,
      'color', badge_def.color,
      'rarity', badge_def.rarity,
      'points', badge_def.points
    );
  END LOOP;
  
  newly_earned_badges := new_badges;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- Function to update badge progress for a customer
CREATE OR REPLACE FUNCTION update_badge_progress(p_customer_id UUID)
RETURNS VOID AS $$
DECLARE
  progress_record RECORD;
BEGIN
  -- Delete existing progress records for this customer
  DELETE FROM badge_progress WHERE customer_id = p_customer_id;
  
  -- Insert updated progress for all unearned badges
  FOR progress_record IN
    SELECT * FROM calculate_badge_progress(p_customer_id)
  LOOP
    INSERT INTO badge_progress (
      customer_id, 
      badge_definition_id, 
      current_progress, 
      progress_percentage
    ) VALUES (
      p_customer_id,
      progress_record.badge_definition_id,
      jsonb_build_object(
        'current_value', progress_record.current_value,
        'target_value', progress_record.target_value,
        'badge_key', progress_record.badge_key
      ),
      progress_record.progress_percentage
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically check for new badges when customer stats change
CREATE OR REPLACE FUNCTION trigger_badge_check()
RETURNS TRIGGER AS $$
BEGIN
  -- Update badge progress for the customer
  PERFORM update_badge_progress(NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on customers table
DROP TRIGGER IF EXISTS trigger_customer_badge_check ON customers;
CREATE TRIGGER trigger_customer_badge_check
  AFTER UPDATE OF total_visits, total_spent ON customers
  FOR EACH ROW 
  WHEN (OLD.total_visits IS DISTINCT FROM NEW.total_visits OR OLD.total_spent IS DISTINCT FROM NEW.total_spent)
  EXECUTE FUNCTION trigger_badge_check();

COMMIT;