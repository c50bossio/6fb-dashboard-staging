-- Loyalty Gamification Database Schema
-- Comprehensive gamification system for customer engagement and rewards
-- Author: Claude Code Assistant
-- Date: 2025-08-27

-- ============================================
-- GAMIFICATION CHALLENGES AND COMPETITIONS
-- ============================================

-- Gamification Challenges (Time-bound customer challenges)
CREATE TABLE IF NOT EXISTS gamification_challenges (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    
    -- Challenge Details
    challenge_name VARCHAR(255) NOT NULL,
    challenge_description TEXT NOT NULL,
    challenge_type VARCHAR(100) NOT NULL, -- 'visits', 'spending', 'referrals', 'reviews', 'engagement', 'custom'
    
    -- Challenge Requirements
    challenge_requirements JSONB NOT NULL DEFAULT '{}',
    /* Example challenge_requirements format:
    {
        "visits_required": 3,
        "spending_required": 150,
        "time_period": "monthly",
        "specific_services": ["haircut", "beard_trim"],
        "minimum_rating": 4.5
    }
    */
    
    -- Rewards Configuration
    reward_structure JSONB NOT NULL DEFAULT '{}',
    /* Example reward_structure format:
    {
        "completion_reward": {
            "type": "points",
            "amount": 500
        },
        "milestone_rewards": [
            {"at": 50, "type": "badge", "value": "halfway_hero"},
            {"at": 100, "type": "points", "value": 1000}
        ],
        "leaderboard_rewards": {
            "1st": {"type": "service_credit", "amount": 50},
            "2nd": {"type": "service_credit", "amount": 25},
            "3rd": {"type": "service_credit", "amount": 15}
        }
    }
    */
    
    -- Challenge Timing
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    
    -- Challenge Settings
    is_active BOOLEAN DEFAULT true,
    is_public BOOLEAN DEFAULT true,
    auto_enroll BOOLEAN DEFAULT false, -- Auto-enroll eligible customers
    max_participants INTEGER, -- NULL for unlimited
    
    -- Progress Tracking
    total_participants INTEGER DEFAULT 0,
    active_participants INTEGER DEFAULT 0,
    completed_participants INTEGER DEFAULT 0,
    
    -- Challenge Metadata
    difficulty_level VARCHAR(20) DEFAULT 'medium' CHECK (difficulty_level IN ('easy', 'medium', 'hard', 'expert')),
    tags TEXT[] DEFAULT '{}',
    image_url VARCHAR(500),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_challenge_dates CHECK (end_date > start_date),
    CONSTRAINT unique_challenge_name UNIQUE(barbershop_id, challenge_name)
);

-- Customer Challenge Participation
CREATE TABLE IF NOT EXISTS customer_challenge_participations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    challenge_id UUID NOT NULL REFERENCES gamification_challenges(id) ON DELETE CASCADE,
    
    -- Participation Details
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    participation_method VARCHAR(50) DEFAULT 'manual', -- 'manual', 'auto_enrolled', 'invited'
    
    -- Progress Tracking
    current_progress JSONB DEFAULT '{}',
    /* Example current_progress format:
    {
        "visits_completed": 2,
        "spending_completed": 125.50,
        "milestones_reached": ["first_visit", "halfway_point"],
        "last_activity": "2025-01-15T10:30:00Z"
    }
    */
    
    progress_percentage DECIMAL(5, 2) DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    
    -- Status
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'failed', 'withdrawn')),
    completed_at TIMESTAMPTZ,
    
    -- Rankings
    current_rank INTEGER,
    best_rank INTEGER,
    
    -- Rewards Earned
    rewards_earned JSONB DEFAULT '[]',
    /* Example rewards_earned format:
    [
        {"type": "points", "amount": 100, "earned_at": "2025-01-10T15:00:00Z"},
        {"type": "badge", "name": "fast_starter", "earned_at": "2025-01-12T09:00:00Z"}
    ]
    */
    
    total_rewards_value DECIMAL(10, 2) DEFAULT 0,
    
    -- Engagement Metrics
    check_ins_count INTEGER DEFAULT 0, -- How many times they checked progress
    last_check_in TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_customer_challenge UNIQUE(barbershop_id, customer_id, challenge_id)
);

-- ============================================
-- ACHIEVEMENTS AND BADGE SYSTEM
-- ============================================

-- Achievement Definitions (Available achievements)
CREATE TABLE IF NOT EXISTS achievement_definitions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    
    -- Achievement Details
    achievement_key VARCHAR(100) NOT NULL, -- Unique identifier for code
    achievement_name VARCHAR(255) NOT NULL,
    achievement_description TEXT NOT NULL,
    
    -- Achievement Category
    category VARCHAR(100) NOT NULL, -- 'visits', 'spending', 'loyalty', 'engagement', 'social', 'seasonal'
    subcategory VARCHAR(100),
    
    -- Requirements
    unlock_criteria JSONB NOT NULL DEFAULT '{}',
    /* Example unlock_criteria format:
    {
        "type": "visits",
        "threshold": 10,
        "time_period": null,
        "specific_conditions": {
            "consecutive_months": 3,
            "minimum_rating": 4.0
        }
    }
    */
    
    -- Achievement Properties
    rarity_level VARCHAR(20) DEFAULT 'common' CHECK (rarity_level IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
    difficulty_level VARCHAR(20) DEFAULT 'easy' CHECK (difficulty_level IN ('easy', 'medium', 'hard', 'expert')),
    points_reward INTEGER DEFAULT 0,
    
    -- Visual Properties
    badge_icon VARCHAR(10) DEFAULT '🏆', -- Emoji or icon identifier
    badge_color VARCHAR(7) DEFAULT '#FFD700', -- Hex color
    unlock_animation VARCHAR(50) DEFAULT 'default',
    
    -- Achievement Status
    is_active BOOLEAN DEFAULT true,
    is_hidden BOOLEAN DEFAULT false, -- Hidden until unlocked
    is_repeatable BOOLEAN DEFAULT false,
    
    -- Display Order
    display_order INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_achievement_key UNIQUE(barbershop_id, achievement_key)
);

-- Customer Achievement Progress
CREATE TABLE IF NOT EXISTS customer_achievement_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    achievement_definition_id UUID NOT NULL REFERENCES achievement_definitions(id) ON DELETE CASCADE,
    
    -- Progress Details
    current_progress JSONB DEFAULT '{}',
    /* Example current_progress format:
    {
        "visits_count": 8,
        "target_visits": 10,
        "consecutive_months": 2,
        "last_qualifying_action": "2025-01-15T10:00:00Z"
    }
    */
    
    progress_percentage DECIMAL(5, 2) DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    
    -- Status
    status VARCHAR(50) DEFAULT 'in_progress' CHECK (status IN ('locked', 'in_progress', 'completed', 'expired')),
    unlocked_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Completion Details
    completion_data JSONB DEFAULT '{}', -- Data about how it was completed
    points_earned INTEGER DEFAULT 0,
    
    -- Notifications
    unlock_notification_sent BOOLEAN DEFAULT false,
    completion_notification_sent BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_customer_achievement UNIQUE(barbershop_id, customer_id, achievement_definition_id)
);

-- ============================================
-- LEADERBOARDS AND RANKINGS
-- ============================================

-- Leaderboard Definitions (Different leaderboard types)
CREATE TABLE IF NOT EXISTS leaderboard_definitions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    
    -- Leaderboard Details
    leaderboard_key VARCHAR(100) NOT NULL,
    leaderboard_name VARCHAR(255) NOT NULL,
    leaderboard_description TEXT,
    
    -- Leaderboard Type
    metric_type VARCHAR(100) NOT NULL, -- 'points', 'visits', 'spending', 'streaks', 'referrals'
    time_period VARCHAR(50) NOT NULL, -- 'all_time', 'yearly', 'monthly', 'weekly', 'daily'
    
    -- Calculation Rules
    calculation_rules JSONB DEFAULT '{}',
    /* Example calculation_rules format:
    {
        "metric": "total_visits",
        "weight_factors": {
            "recency_boost": 1.1,
            "service_variety": 1.05
        },
        "exclude_conditions": ["cancelled_appointments"],
        "bonus_multipliers": {
            "referral_visits": 1.5
        }
    }
    */
    
    -- Display Settings
    display_limit INTEGER DEFAULT 10, -- How many positions to show
    update_frequency INTEGER DEFAULT 3600, -- Seconds between updates
    
    -- Leaderboard Status
    is_active BOOLEAN DEFAULT true,
    is_public BOOLEAN DEFAULT true, -- Visible to customers
    
    -- Reset Schedule
    reset_frequency VARCHAR(50), -- 'never', 'daily', 'weekly', 'monthly', 'yearly'
    last_reset_at TIMESTAMPTZ,
    next_reset_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_leaderboard_key UNIQUE(barbershop_id, leaderboard_key)
);

-- Leaderboard Entries (Current rankings)
CREATE TABLE IF NOT EXISTS leaderboard_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    leaderboard_definition_id UUID NOT NULL REFERENCES leaderboard_definitions(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    
    -- Ranking Details
    current_rank INTEGER NOT NULL,
    previous_rank INTEGER,
    rank_change VARCHAR(20), -- 'up', 'down', 'same', 'new'
    
    -- Score Details
    current_score DECIMAL(15, 2) NOT NULL DEFAULT 0,
    previous_score DECIMAL(15, 2),
    score_change DECIMAL(15, 2) DEFAULT 0,
    
    -- Score Breakdown
    score_components JSONB DEFAULT '{}',
    /* Example score_components format:
    {
        "base_score": 850,
        "recency_bonus": 85,
        "variety_bonus": 42,
        "streak_bonus": 100,
        "total": 1077
    }
    */
    
    -- Tracking
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    calculation_period_start TIMESTAMPTZ,
    calculation_period_end TIMESTAMPTZ,
    
    -- Awards for ranking
    rank_rewards_earned JSONB DEFAULT '[]',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_leaderboard_customer UNIQUE(leaderboard_definition_id, customer_id)
);

-- ============================================
-- POINT SYSTEM ENHANCEMENTS
-- ============================================

-- Point Multipliers (Bonus point events)
CREATE TABLE IF NOT EXISTS point_multiplier_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    
    -- Event Details
    event_name VARCHAR(255) NOT NULL,
    event_description TEXT,
    event_type VARCHAR(100) NOT NULL, -- 'birthday', 'anniversary', 'holiday', 'promotion', 'challenge'
    
    -- Multiplier Settings
    multiplier_value DECIMAL(5, 2) NOT NULL DEFAULT 1.0,
    bonus_points INTEGER DEFAULT 0, -- Fixed bonus points
    
    -- Event Timing
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    
    -- Eligibility Rules
    eligibility_criteria JSONB DEFAULT '{}',
    /* Example eligibility_criteria format:
    {
        "customer_segments": ["vip", "regular"],
        "minimum_visits": 5,
        "services_included": ["haircut", "beard_trim"],
        "exclude_already_discounted": true
    }
    */
    
    -- Event Status
    is_active BOOLEAN DEFAULT true,
    max_uses_per_customer INTEGER, -- NULL for unlimited
    total_uses INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_multiplier_dates CHECK (end_date > start_date)
);

-- Customer Point Multiplier Usage
CREATE TABLE IF NOT EXISTS customer_point_multiplier_usage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    point_multiplier_event_id UUID NOT NULL REFERENCES point_multiplier_events(id) ON DELETE CASCADE,
    
    -- Usage Details
    used_at TIMESTAMPTZ DEFAULT NOW(),
    multiplier_applied DECIMAL(5, 2) NOT NULL,
    bonus_points_earned INTEGER DEFAULT 0,
    base_points INTEGER NOT NULL,
    total_points_earned INTEGER NOT NULL,
    
    -- Context
    source_type VARCHAR(100), -- 'appointment', 'purchase', 'referral'
    source_id UUID, -- Reference to source record
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SOCIAL GAMIFICATION
-- ============================================

-- Customer Groups (Social groups for team challenges)
CREATE TABLE IF NOT EXISTS customer_groups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    
    -- Group Details
    group_name VARCHAR(255) NOT NULL,
    group_description TEXT,
    group_type VARCHAR(50) DEFAULT 'social', -- 'social', 'competitive', 'family', 'workplace'
    
    -- Group Settings
    is_public BOOLEAN DEFAULT true,
    join_approval_required BOOLEAN DEFAULT false,
    max_members INTEGER DEFAULT 50,
    
    -- Group Leader
    created_by_customer_id UUID NOT NULL REFERENCES customers(id),
    current_leader_customer_id UUID REFERENCES customers(id),
    
    -- Group Stats
    total_members INTEGER DEFAULT 1,
    total_group_points BIGINT DEFAULT 0,
    total_group_visits INTEGER DEFAULT 0,
    group_level INTEGER DEFAULT 1,
    
    -- Group Achievements
    group_achievements JSONB DEFAULT '[]',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_group_name UNIQUE(barbershop_id, group_name)
);

-- Customer Group Memberships
CREATE TABLE IF NOT EXISTS customer_group_memberships (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES customer_groups(id) ON DELETE CASCADE,
    
    -- Membership Details
    role VARCHAR(50) DEFAULT 'member', -- 'member', 'moderator', 'leader'
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    invited_by_customer_id UUID REFERENCES customers(id),
    
    -- Member Stats
    points_contributed BIGINT DEFAULT 0,
    visits_contributed INTEGER DEFAULT 0,
    
    -- Member Status
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'banned')),
    left_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_customer_group UNIQUE(barbershop_id, customer_id, group_id)
);

-- ============================================
-- STREAK TRACKING SYSTEM
-- ============================================

-- Customer Streaks (Various streak types)
CREATE TABLE IF NOT EXISTS customer_streaks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    
    -- Streak Type
    streak_type VARCHAR(100) NOT NULL, -- 'monthly_visits', 'weekly_bookings', 'review_streak', 'referral_streak'
    
    -- Current Streak
    current_streak INTEGER DEFAULT 0,
    current_streak_start_date DATE,
    
    -- Best Streak
    best_streak INTEGER DEFAULT 0,
    best_streak_start_date DATE,
    best_streak_end_date DATE,
    
    -- Last Activity
    last_activity_date DATE,
    last_qualifying_activity TIMESTAMPTZ,
    
    -- Streak Rules
    streak_rules JSONB DEFAULT '{}',
    /* Example streak_rules format:
    {
        "requirement": "monthly_visit",
        "grace_period_days": 7,
        "minimum_gap_days": 25,
        "maximum_gap_days": 35
    }
    */
    
    -- Streak Status
    is_active BOOLEAN DEFAULT true,
    broken_at TIMESTAMPTZ,
    
    -- Rewards
    milestone_rewards_earned JSONB DEFAULT '[]',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_customer_streak_type UNIQUE(barbershop_id, customer_id, streak_type)
);

-- ============================================
-- INDEXES FOR GAMIFICATION TABLES
-- ============================================

-- Challenge Indexes
CREATE INDEX IF NOT EXISTS idx_gamification_challenges_barbershop ON gamification_challenges(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_gamification_challenges_active ON gamification_challenges(barbershop_id, is_active);
CREATE INDEX IF NOT EXISTS idx_gamification_challenges_dates ON gamification_challenges(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_customer_challenge_participations_customer ON customer_challenge_participations(barbershop_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_challenge_participations_challenge ON customer_challenge_participations(challenge_id);
CREATE INDEX IF NOT EXISTS idx_customer_challenge_participations_status ON customer_challenge_participations(barbershop_id, status);

-- Achievement Indexes
CREATE INDEX IF NOT EXISTS idx_achievement_definitions_barbershop ON achievement_definitions(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_achievement_definitions_category ON achievement_definitions(barbershop_id, category);
CREATE INDEX IF NOT EXISTS idx_customer_achievement_progress_customer ON customer_achievement_progress(barbershop_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_achievement_progress_status ON customer_achievement_progress(barbershop_id, status);

-- Leaderboard Indexes
CREATE INDEX IF NOT EXISTS idx_leaderboard_definitions_barbershop ON leaderboard_definitions(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_entries_leaderboard ON leaderboard_entries(leaderboard_definition_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_entries_rank ON leaderboard_entries(leaderboard_definition_id, current_rank);
CREATE INDEX IF NOT EXISTS idx_leaderboard_entries_customer ON leaderboard_entries(barbershop_id, customer_id);

-- Point System Indexes
CREATE INDEX IF NOT EXISTS idx_point_multiplier_events_barbershop ON point_multiplier_events(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_point_multiplier_events_dates ON point_multiplier_events(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_customer_point_multiplier_usage_customer ON customer_point_multiplier_usage(barbershop_id, customer_id);

-- Social Gamification Indexes
CREATE INDEX IF NOT EXISTS idx_customer_groups_barbershop ON customer_groups(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_customer_group_memberships_customer ON customer_group_memberships(barbershop_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_group_memberships_group ON customer_group_memberships(group_id);

-- Streak Indexes
CREATE INDEX IF NOT EXISTS idx_customer_streaks_customer ON customer_streaks(barbershop_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_streaks_type ON customer_streaks(barbershop_id, streak_type);
CREATE INDEX IF NOT EXISTS idx_customer_streaks_active ON customer_streaks(barbershop_id, is_active);

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE gamification_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_challenge_participations ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievement_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_achievement_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_multiplier_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_point_multiplier_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_group_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_streaks ENABLE ROW LEVEL SECURITY;

-- Shop owner policies
CREATE POLICY "Shop owners can manage gamification challenges" ON gamification_challenges
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM barbershops 
            WHERE barbershops.id = gamification_challenges.barbershop_id 
            AND barbershops.owner_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Shop owners can manage challenge participations" ON customer_challenge_participations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM barbershops 
            WHERE barbershops.id = customer_challenge_participations.barbershop_id 
            AND barbershops.owner_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Shop owners can manage achievements" ON achievement_definitions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM barbershops 
            WHERE barbershops.id = achievement_definitions.barbershop_id 
            AND barbershops.owner_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Shop owners can manage achievement progress" ON customer_achievement_progress
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM barbershops 
            WHERE barbershops.id = customer_achievement_progress.barbershop_id 
            AND barbershops.owner_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Shop owners can manage leaderboards" ON leaderboard_definitions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM barbershops 
            WHERE barbershops.id = leaderboard_definitions.barbershop_id 
            AND barbershops.owner_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Shop owners can manage leaderboard entries" ON leaderboard_entries
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM barbershops 
            WHERE barbershops.id = leaderboard_entries.barbershop_id 
            AND barbershops.owner_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Shop owners can manage point events" ON point_multiplier_events
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM barbershops 
            WHERE barbershops.id = point_multiplier_events.barbershop_id 
            AND barbershops.owner_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Shop owners can manage point usage" ON customer_point_multiplier_usage
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM barbershops 
            WHERE barbershops.id = customer_point_multiplier_usage.barbershop_id 
            AND barbershops.owner_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Shop owners can manage customer groups" ON customer_groups
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM barbershops 
            WHERE barbershops.id = customer_groups.barbershop_id 
            AND barbershops.owner_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Shop owners can manage group memberships" ON customer_group_memberships
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM barbershops 
            WHERE barbershops.id = customer_group_memberships.barbershop_id 
            AND barbershops.owner_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Shop owners can manage customer streaks" ON customer_streaks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM barbershops 
            WHERE barbershops.id = customer_streaks.barbershop_id 
            AND barbershops.owner_id = (SELECT auth.uid())
        )
    );

-- Customer access policies (limited read access to their own data)
CREATE POLICY "Customers can view their challenge participations" ON customer_challenge_participations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM customers 
            WHERE customers.id = customer_challenge_participations.customer_id 
            AND customers.user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Customers can view their achievement progress" ON customer_achievement_progress
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM customers 
            WHERE customers.id = customer_achievement_progress.customer_id 
            AND customers.user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Customers can view public leaderboards" ON leaderboard_entries
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM leaderboard_definitions 
            WHERE leaderboard_definitions.id = leaderboard_entries.leaderboard_definition_id 
            AND leaderboard_definitions.is_public = true
        )
    );

CREATE POLICY "Customers can view their streaks" ON customer_streaks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM customers 
            WHERE customers.id = customer_streaks.customer_id 
            AND customers.user_id = (SELECT auth.uid())
        )
    );

-- ============================================
-- SEED DEFAULT ACHIEVEMENTS
-- ============================================

-- Function to seed default achievements for a barbershop
CREATE OR REPLACE FUNCTION seed_default_achievements(p_barbershop_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Visit-based achievements
    INSERT INTO achievement_definitions (barbershop_id, achievement_key, achievement_name, achievement_description, category, unlock_criteria, rarity_level, points_reward, badge_icon)
    VALUES 
    (p_barbershop_id, 'first_visit', 'First Timer', 'Complete your first appointment', 'visits', '{"type": "visits", "threshold": 1}', 'common', 50, '🎯'),
    (p_barbershop_id, 'regular_customer', 'Regular Customer', 'Complete 5 appointments', 'visits', '{"type": "visits", "threshold": 5}', 'common', 100, '⭐'),
    (p_barbershop_id, 'frequent_visitor', 'Frequent Visitor', 'Complete 10 appointments', 'visits', '{"type": "visits", "threshold": 10}', 'uncommon', 200, '🔥'),
    (p_barbershop_id, 'vip_member', 'VIP Member', 'Complete 25 appointments', 'visits', '{"type": "visits", "threshold": 25}', 'rare', 500, '👑'),
    (p_barbershop_id, 'legend_status', 'Legend Status', 'Complete 50 appointments', 'visits', '{"type": "visits", "threshold": 50}', 'epic', 1000, '🏆'),
    (p_barbershop_id, 'century_club', 'Century Club', 'Complete 100 appointments', 'visits', '{"type": "visits", "threshold": 100}', 'legendary', 2500, '💎'),
    
    -- Spending-based achievements
    (p_barbershop_id, 'big_spender', 'Big Spender', 'Spend $500 total', 'spending', '{"type": "spending", "threshold": 500}', 'uncommon', 150, '💰'),
    (p_barbershop_id, 'high_roller', 'High Roller', 'Spend $1000 total', 'spending', '{"type": "spending", "threshold": 1000}', 'rare', 300, '💳'),
    (p_barbershop_id, 'platinum_patron', 'Platinum Patron', 'Spend $2500 total', 'spending', '{"type": "spending", "threshold": 2500}', 'epic', 750, '🌟'),
    (p_barbershop_id, 'diamond_member', 'Diamond Member', 'Spend $5000 total', 'spending', '{"type": "spending", "threshold": 5000}', 'legendary', 1500, '💎'),
    
    -- Loyalty points achievements
    (p_barbershop_id, 'point_collector', 'Point Collector', 'Earn 1000 loyalty points', 'loyalty', '{"type": "points", "threshold": 1000}', 'common', 100, '🎯'),
    (p_barbershop_id, 'point_master', 'Point Master', 'Earn 5000 loyalty points', 'loyalty', '{"type": "points", "threshold": 5000}', 'rare', 500, '🔥'),
    (p_barbershop_id, 'point_legend', 'Point Legend', 'Earn 10000 loyalty points', 'loyalty', '{"type": "points", "threshold": 10000}', 'epic', 1000, '⚡'),
    
    -- Engagement achievements
    (p_barbershop_id, 'reviewer', 'Reviewer', 'Leave your first review', 'engagement', '{"type": "reviews", "threshold": 1}', 'common', 75, '⭐'),
    (p_barbershop_id, 'critic', 'Critic', 'Leave 5 reviews', 'engagement', '{"type": "reviews", "threshold": 5}', 'uncommon', 200, '📝'),
    (p_barbershop_id, 'referral_champion', 'Referral Champion', 'Refer your first friend', 'engagement', '{"type": "referrals", "threshold": 1}', 'uncommon', 250, '🤝'),
    (p_barbershop_id, 'ambassador', 'Ambassador', 'Refer 5 friends', 'engagement', '{"type": "referrals", "threshold": 5}', 'rare', 750, '🎖️'),
    
    -- Streak achievements
    (p_barbershop_id, 'consistent', 'Consistent Client', '3 month booking streak', 'streaks', '{"type": "monthly_streak", "threshold": 3}', 'uncommon', 300, '🔄'),
    (p_barbershop_id, 'dedicated', 'Dedicated Customer', '6 month booking streak', 'streaks', '{"type": "monthly_streak", "threshold": 6}', 'rare', 600, '📅'),
    (p_barbershop_id, 'unstoppable', 'Unstoppable', '12 month booking streak', 'streaks', '{"type": "monthly_streak", "threshold": 12}', 'epic', 1200, '🚀'),
    
    -- Special achievements
    (p_barbershop_id, 'early_adopter', 'Early Adopter', 'Joined in the first month', 'special', '{"type": "early_member", "threshold": 1}', 'rare', 500, '🌟'),
    (p_barbershop_id, 'birthday_star', 'Birthday Star', 'Visited on your birthday', 'special', '{"type": "birthday_visit", "threshold": 1}', 'uncommon', 200, '🎂'),
    (p_barbershop_id, 'holiday_hero', 'Holiday Hero', 'Booked during holidays', 'special', '{"type": "holiday_visit", "threshold": 1}', 'uncommon', 150, '🎄'),
    (p_barbershop_id, 'night_owl', 'Night Owl', 'Booked late evening appointments', 'special', '{"type": "late_booking", "threshold": 5}', 'common', 100, '🦉'),
    (p_barbershop_id, 'early_bird', 'Early Bird', 'Booked early morning appointments', 'special', '{"type": "early_booking", "threshold": 5}', 'common', 100, '🐦')
    
    ON CONFLICT (barbershop_id, achievement_key) DO NOTHING;
    
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS FOR AUTOMATION
-- ============================================

-- Updated_at triggers
CREATE TRIGGER update_gamification_challenges_updated_at BEFORE UPDATE ON gamification_challenges
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_challenge_participations_updated_at BEFORE UPDATE ON customer_challenge_participations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_achievement_definitions_updated_at BEFORE UPDATE ON achievement_definitions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_achievement_progress_updated_at BEFORE UPDATE ON customer_achievement_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leaderboard_definitions_updated_at BEFORE UPDATE ON leaderboard_definitions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leaderboard_entries_updated_at BEFORE UPDATE ON leaderboard_entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_point_multiplier_events_updated_at BEFORE UPDATE ON point_multiplier_events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_groups_updated_at BEFORE UPDATE ON customer_groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_group_memberships_updated_at BEFORE UPDATE ON customer_group_memberships
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_streaks_updated_at BEFORE UPDATE ON customer_streaks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();