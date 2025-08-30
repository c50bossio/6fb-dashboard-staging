/**
 * Loyalty Gamification API Route
 * Handles leaderboards, achievements, badges, and gamification features
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase configuration');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * GET /api/customers/loyalty/gamification
 * Get leaderboards, achievements, and gamification data
 */
export async function GET(request) {
  try {
    // Get user from authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 });
    }

    // Get barbershop for user
    let { data: barbershops, error: shopError } = await supabase
      .from('barbershops')
      .select('id')
      .eq('owner_id', user.id)
      .single();

    if (shopError || !barbershops) {
      // Try to find if user is a barber
      const { data: barbers, error: barberError } = await supabase
        .from('barbers')
        .select('barberbarbershop_id')
        .eq('user_id', user.id)
        .single();

      if (barberError || !barbers) {
        return NextResponse.json({ error: 'User not associated with barbershop' }, { status: 403 });
      }
      
      barbershops = { id: barbers.barberbarbershop_id };
    }

    const barberbarbershopId = barbershops.id;
    const url = new URL(request.url);
    const action = url.searchParams.get('action') || 'leaderboard';
    const customerId = url.searchParams.get('customer_id');
    const programId = url.searchParams.get('program_id');
    const period = url.searchParams.get('period') || 'all_time';
    const limit = parseInt(url.searchParams.get('limit')) || 10;

    if (action === 'leaderboard') {
      // Get customer leaderboard
      const leaderboardType = url.searchParams.get('type') || 'points';
      const leaderboard = await getEnhancedLeaderboard(barberbarbershopId, leaderboardType, period, limit);
      
      return NextResponse.json({ 
        success: true, 
        leaderboard,
        leaderboard_type: leaderboardType,
        period,
        limit
      });

    } else if (action === 'achievements') {
      // Get customer achievements
      if (!customerId) {
        return NextResponse.json({ error: 'customer_id parameter required for achievements' }, { status: 400 });
      }

      const achievements = await getCustomerAchievements(customerId, barberbarbershopId, programId);
      
      return NextResponse.json({ 
        success: true, 
        customer_id: customerId,
        ...achievements
      });

    } else if (action === 'badges') {
      // Get available badges and customer progress
      const badges = await getBadgesAndProgress(barberbarbershopId, customerId);
      
      return NextResponse.json({ 
        success: true, 
        badges
      });

    } else if (action === 'challenges') {
      // Get active challenges
      const challenges = await getActiveChallenges(barberbarbershopId, customerId);
      
      return NextResponse.json({ 
        success: true, 
        challenges
      });

    } else if (action === 'stats') {
      // Get gamification statistics
      const stats = await getGamificationStats(barberbarbershopId, programId);
      
      return NextResponse.json({ 
        success: true, 
        stats
      });
    }

    return NextResponse.json({ error: 'Invalid action parameter' }, { status: 400 });

  } catch (error) {
    console.error('Error in loyalty gamification API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/customers/loyalty/gamification
 * Create challenges, award badges, or process achievements
 */
export async function POST(request) {
  try {
    // Get user from authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 });
    }

    // Get barbershop for user
    const { data: barbershops, error: shopError } = await supabase
      .from('barbershops')
      .select('id')
      .eq('owner_id', user.id)
      .single();

    if (shopError || !barbershops) {
      return NextResponse.json({ error: 'User not associated with barbershop' }, { status: 403 });
    }

    const barberbarbershopId = barbershops.id;
    const body = await request.json();
    const action = body.action || 'award-badge';

    if (action === 'award-badge') {
      // Award badge to customer
      const { customer_id, badge_type, badge_name, reason } = body;

      if (!customer_id || !badge_type || !badge_name) {
        return NextResponse.json({ 
          error: 'Missing required fields: customer_id, badge_type, badge_name' 
        }, { status: 400 });
      }

      const result = await awardBadge(customer_id, barberbarbershopId, badge_type, badge_name, reason);
      
      return NextResponse.json({ 
        success: true, 
        ...result
      });

    } else if (action === 'create-challenge') {
      // Create a new challenge
      const { 
        challenge_name, 
        challenge_description, 
        challenge_type, 
        requirements, 
        rewards, 
        start_date, 
        end_date,
        target_participants 
      } = body;

      if (!challenge_name || !challenge_type || !requirements || !rewards) {
        return NextResponse.json({ 
          error: 'Missing required fields: challenge_name, challenge_type, requirements, rewards' 
        }, { status: 400 });
      }

      const challenge = await createChallenge(barberbarbershopId, {
        challenge_name,
        challenge_description,
        challenge_type,
        requirements,
        rewards,
        start_date,
        end_date,
        target_participants
      });
      
      return NextResponse.json({ 
        success: true, 
        challenge,
        message: 'Challenge created successfully'
      });

    } else if (action === 'check-achievements') {
      // Check and award achievements for customer
      const { customer_id } = body;

      if (!customer_id) {
        return NextResponse.json({ 
          error: 'customer_id is required' 
        }, { status: 400 });
      }

      const achievements = await checkAndAwardAchievements(customer_id, barberbarbershopId);
      
      return NextResponse.json({ 
        success: true, 
        ...achievements
      });

    } else if (action === 'join-challenge') {
      // Join a challenge
      const { customer_id, challenge_id } = body;

      if (!customer_id || !challenge_id) {
        return NextResponse.json({ 
          error: 'Missing required fields: customer_id, challenge_id' 
        }, { status: 400 });
      }

      const result = await joinChallenge(customer_id, challenge_id, barberbarbershopId);
      
      return NextResponse.json({ 
        success: true, 
        ...result
      });
    }

    return NextResponse.json({ error: 'Invalid action parameter' }, { status: 400 });

  } catch (error) {
    console.error('Error processing gamification action:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Helper function to get customer leaderboard
 */
async function getCustomerLeaderboard(barberbarbershopId, programId, period, limit) {
  try {
    // Build base query
    let query = supabase
      .from('loyalty_program_enrollments')
      .select(`
        customer_id,
        current_points,
        lifetime_points_earned,
        current_tier,
        member_since,
        customers!inner(first_name, last_name, email)
      `)
      .eq('barberbarbershop_id', barberbarbershopId)
      .eq('is_active', true);

    if (programId) {
      query = query.eq('loyalty_program_id', programId);
    }

    const { data: enrollments, error } = await query;

    if (error || !enrollments) {
      return [];
    }

    // Filter by period if needed
    let filteredEnrollments = enrollments;
    if (period !== 'all_time') {
      const cutoffDate = getPeriodCutoffDate(period);
      filteredEnrollments = enrollments.filter(e => 
        new Date(e.member_since) >= cutoffDate
      );
    }

    // For period-based leaderboards, calculate points earned in period
    if (period !== 'all_time') {
      filteredEnrollments = await addPeriodPoints(filteredEnrollments, barberbarbershopId, period);
    }

    // Sort by points and add positions
    const sortField = period === 'all_time' ? 'current_points' : 'period_points';
    const sortedEnrollments = filteredEnrollments.sort((a, b) => 
      (b[sortField] || 0) - (a[sortField] || 0)
    );

    // Format leaderboard entries
    const leaderboard = await Promise.all(sortedEnrollments.slice(0, limit).map(async (enrollment, index) => ({
      position: index + 1,
      customer_id: enrollment.customer_id,
      customer_name: `${enrollment.customers.first_name} ${enrollment.customers.last_name}`,
      points: period === 'all_time' ? enrollment.current_points : (enrollment.period_points || 0),
      lifetime_points: enrollment.lifetime_points_earned,
      tier: enrollment.current_tier,
      member_since: enrollment.member_since,
      badge: getPositionBadge(index + 1),
      streak: await getCustomerStreak(enrollment.customer_id, barberbarbershopId),
      achievements_count: await getCustomerAchievementsCount(enrollment.customer_id, barberbarbershopId)
    })));

    return leaderboard;

  } catch (error) {
    console.error('Error getting customer leaderboard:', error);
    return [];
  }
}

/**
 * Enhanced leaderboard function with multiple metrics
 */
async function getEnhancedLeaderboard(barberbarbershopId, leaderboardType = 'points', period = 'all_time', limit = 10) {
  try {
    let leaderboardData = [];
    
    switch (leaderboardType) {
      case 'points':
        leaderboardData = await getPointsLeaderboard(barberbarbershopId, period, limit);
        break;
      case 'visits':
        leaderboardData = await getVisitsLeaderboard(barberbarbershopId, period, limit);
        break;
      case 'spending':
        leaderboardData = await getSpendingLeaderboard(barberbarbershopId, period, limit);
        break;
      case 'streaks':
        leaderboardData = await getStreaksLeaderboard(barberbarbershopId, limit);
        break;
      case 'engagement':
        leaderboardData = await getEngagementLeaderboard(barberbarbershopId, period, limit);
        break;
      default:
        leaderboardData = await getPointsLeaderboard(barberbarbershopId, period, limit);
    }
    
    return leaderboardData;
    
  } catch (error) {
    console.error('Error getting enhanced leaderboard:', error);
    return [];
  }
}

/**
 * Get points-based leaderboard
 */
async function getPointsLeaderboard(barberbarbershopId, period, limit) {
  const { data: enrollments } = await supabase
    .from('loyalty_program_enrollments')
    .select(`
      customer_id,
      current_points,
      lifetime_points_earned,
      current_tier,
      member_since,
      customers!inner(first_name, last_name, email)
    `)
    .eq('barberbarbershop_id', barberbarbershopId)
    .eq('is_active', true)
    .order('current_points', { ascending: false })
    .limit(limit);
    
  if (!enrollments) return [];
  
  return await Promise.all(enrollments.map(async (enrollment, index) => {
    const achievements = await getCustomerAchievementsCount(enrollment.customer_id, barberbarbershopId);
    const streak = await getCustomerStreak(enrollment.customer_id, barberbarbershopId);
    
    return {
      position: index + 1,
      customer_id: enrollment.customer_id,
      customer_name: `${enrollment.customers.first_name} ${enrollment.customers.last_name}`,
      points: enrollment.current_points,
      lifetime_points: enrollment.lifetime_points_earned,
      tier: enrollment.current_tier,
      member_since: enrollment.member_since,
      badge: getPositionBadge(index + 1),
      achievements_count: achievements,
      current_streak: streak.current,
      metric_type: 'points'
    };
  }));
}

/**
 * Get visits-based leaderboard
 */
async function getVisitsLeaderboard(barberbarbershopId, period, limit) {
  let dateFilter = '';
  const cutoffDate = getPeriodCutoffDate(period);
  
  if (period !== 'all_time') {
    dateFilter = ` AND appointment_date >= '${cutoffDate.toISOString()}'`;
  }
  
  const query = `
    SELECT 
      c.id as customer_id,
      c.first_name,
      c.last_name,
      COUNT(a.id) as visit_count,
      SUM(a.total_amount::numeric) as total_spent
    FROM customers c
    LEFT JOIN appointments a ON c.id = a.customer_id AND a.status = 'completed'${dateFilter}
    WHERE c.barberbarbershop_id = $1
    GROUP BY c.id, c.first_name, c.last_name
    HAVING COUNT(a.id) > 0
    ORDER BY visit_count DESC
    LIMIT $2
  `;
  
  const { data: results } = await supabase.rpc('execute_sql', {
    query: query,
    params: [barberbarbershopId, limit]
  });
  
  if (!results) return [];
  
  return await Promise.all(results.map(async (customer, index) => {
    const achievements = await getCustomerAchievementsCount(customer.customer_id, barberbarbershopId);
    const streak = await getCustomerStreak(customer.customer_id, barberbarbershopId);
    
    return {
      position: index + 1,
      customer_id: customer.customer_id,
      customer_name: `${customer.first_name} ${customer.last_name}`,
      visits: customer.visit_count,
      total_spent: parseFloat(customer.total_spent || 0),
      badge: getPositionBadge(index + 1),
      achievements_count: achievements,
      current_streak: streak.current,
      metric_type: 'visits'
    };
  }));
}

/**
 * Get spending-based leaderboard
 */
async function getSpendingLeaderboard(barberbarbershopId, period, limit) {
  let dateFilter = '';
  const cutoffDate = getPeriodCutoffDate(period);
  
  if (period !== 'all_time') {
    dateFilter = ` AND appointment_date >= '${cutoffDate.toISOString()}'`;
  }
  
  const query = `
    SELECT 
      c.id as customer_id,
      c.first_name,
      c.last_name,
      COUNT(a.id) as visit_count,
      SUM(a.total_amount::numeric) as total_spent
    FROM customers c
    LEFT JOIN appointments a ON c.id = a.customer_id AND a.status = 'completed'${dateFilter}
    WHERE c.barberbarbershop_id = $1
    GROUP BY c.id, c.first_name, c.last_name
    HAVING SUM(a.total_amount::numeric) > 0
    ORDER BY total_spent DESC
    LIMIT $2
  `;
  
  const { data: results } = await supabase.rpc('execute_sql', {
    query: query,
    params: [barberbarbershopId, limit]
  });
  
  if (!results) return [];
  
  return await Promise.all(results.map(async (customer, index) => {
    const achievements = await getCustomerAchievementsCount(customer.customer_id, barberbarbershopId);
    const streak = await getCustomerStreak(customer.customer_id, barberbarbershopId);
    
    return {
      position: index + 1,
      customer_id: customer.customer_id,
      customer_name: `${customer.first_name} ${customer.last_name}`,
      total_spent: parseFloat(customer.total_spent || 0),
      visits: customer.visit_count,
      badge: getPositionBadge(index + 1),
      achievements_count: achievements,
      current_streak: streak.current,
      metric_type: 'spending'
    };
  }));
}

/**
 * Get streaks-based leaderboard
 */
async function getStreaksLeaderboard(barberbarbershopId, limit) {
  const { data: streaks } = await supabase
    .from('customer_streaks')
    .select(`
      customer_id,
      current_streak,
      best_streak,
      streak_type,
      customers!inner(first_name, last_name)
    `)
    .eq('barberbarbershop_id', barberbarbershopId)
    .eq('is_active', true)
    .eq('streak_type', 'monthly_visits')
    .order('current_streak', { ascending: false })
    .limit(limit);
    
  if (!streaks) return [];
  
  return await Promise.all(streaks.map(async (streak, index) => {
    const achievements = await getCustomerAchievementsCount(streak.customer_id, barberbarbershopId);
    
    return {
      position: index + 1,
      customer_id: streak.customer_id,
      customer_name: `${streak.customers.first_name} ${streak.customers.last_name}`,
      current_streak: streak.current_streak,
      best_streak: streak.best_streak,
      streak_type: streak.streak_type,
      badge: getPositionBadge(index + 1),
      achievements_count: achievements,
      metric_type: 'streaks'
    };
  }));
}

/**
 * Get engagement-based leaderboard
 */
async function getEngagementLeaderboard(barberbarbershopId, period, limit) {
  // Get all customers and calculate engagement scores
  const { data: customers } = await supabase
    .from('customers')
    .select('id, first_name, last_name')
    .eq('barberbarbershop_id', barberbarbershopId);
    
  if (!customers) return [];
  
  const customerEngagement = await Promise.all(customers.map(async (customer) => {
    const analytics = await getCustomerAnalytics(customer.id, barberbarbershopId);
    const achievements = await getCustomerAchievementsCount(customer.id, barberbarbershopId);
    const streak = await getCustomerStreak(customer.id, barberbarbershopId);
    
    return {
      customer_id: customer.id,
      customer_name: `${customer.first_name} ${customer.last_name}`,
      engagement_score: analytics.engagement_score,
      total_visits: analytics.total_visits,
      reviews_count: analytics.reviews_count,
      referrals: analytics.total_referrals,
      achievements_count: achievements,
      current_streak: streak.current
    };
  }));
  
  // Sort by engagement score and take top results
  const sortedCustomers = customerEngagement
    .filter(c => c.engagement_score > 0)
    .sort((a, b) => b.engagement_score - a.engagement_score)
    .slice(0, limit);
    
  return sortedCustomers.map((customer, index) => ({
    ...customer,
    position: index + 1,
    badge: getPositionBadge(index + 1),
    metric_type: 'engagement'
  }));
}

/**
 * Helper function to get customer achievements
 */
async function getCustomerAchievements(customerId, barberbarbershopId, programId) {
  try {
    // Get customer milestones
    const { data: milestones, error: milestonesError } = await supabase
      .from('customer_milestones')
      .select('*')
      .eq('customer_id', customerId)
      .eq('barberbarbershop_id', barberbarbershopId)
      .order('achieved_at', { ascending: false });

    if (milestonesError) {
      console.error('Error fetching milestones:', milestonesError);
    }

    // Get customer analytics for achievement calculation
    const analytics = await getCustomerAnalytics(customerId, barberbarbershopId);

    // Calculate achievements based on analytics and milestones
    const achievements = await calculateCustomerAchievements(customerId, barberbarbershopId, analytics, milestones || []);

    // Get progress toward next achievements
    const nextAchievements = await getNextAchievements(customerId, barberbarbershopId, analytics);

    return {
      milestones: milestones || [],
      achievements,
      next_achievements: nextAchievements,
      analytics_summary: analytics
    };

  } catch (error) {
    console.error('Error getting customer achievements:', error);
    return {
      milestones: [],
      achievements: { badges: [], streaks: {}, special_achievements: [] },
      next_achievements: [],
      analytics_summary: {}
    };
  }
}

/**
 * Helper function to get badges and progress
 */
async function getBadgesAndProgress(barberbarbershopId, customerId) {
  try {
    // Define available badge categories
    const badgeCategories = {
      visits: {
        name: 'Visit Badges',
        badges: [
          { name: 'First Timer', requirement: 1, icon: '🎯', description: 'Complete your first appointment' },
          { name: 'Regular', requirement: 5, icon: '⭐', description: '5 appointments completed' },
          { name: 'Frequent Flyer', requirement: 10, icon: '🔥', description: '10 appointments completed' },
          { name: 'VIP', requirement: 25, icon: '👑', description: '25 appointments completed' },
          { name: 'Legend', requirement: 50, icon: '🏆', description: '50 appointments completed' },
          { name: 'Century Club', requirement: 100, icon: '💎', description: '100 appointments completed' }
        ]
      },
      spending: {
        name: 'Spending Badges',
        badges: [
          { name: 'Big Spender', requirement: 500, icon: '💰', description: 'Spend $500 total' },
          { name: 'High Roller', requirement: 1000, icon: '💳', description: 'Spend $1000 total' },
          { name: 'Platinum Patron', requirement: 2500, icon: '🌟', description: 'Spend $2500 total' },
          { name: 'Diamond Member', requirement: 5000, icon: '💎', description: 'Spend $5000 total' }
        ]
      },
      loyalty: {
        name: 'Loyalty Badges',
        badges: [
          { name: 'Point Collector', requirement: 1000, icon: '🎯', description: 'Earn 1000 loyalty points' },
          { name: 'Point Master', requirement: 5000, icon: '🔥', description: 'Earn 5000 loyalty points' },
          { name: 'Point Legend', requirement: 10000, icon: '⚡', description: 'Earn 10000 loyalty points' }
        ]
      },
      engagement: {
        name: 'Engagement Badges',
        badges: [
          { name: 'Reviewer', requirement: 1, icon: '⭐', description: 'Leave your first review' },
          { name: 'Critic', requirement: 5, icon: '📝', description: 'Leave 5 reviews' },
          { name: 'Referral Champion', requirement: 1, icon: '🤝', description: 'Refer your first friend' },
          { name: 'Ambassador', requirement: 5, icon: '🎖️', description: 'Refer 5 friends' }
        ]
      },
      streaks: {
        name: 'Streak Badges',
        badges: [
          { name: 'Consistent', requirement: 3, icon: '🔄', description: '3 month booking streak' },
          { name: 'Dedicated', requirement: 6, icon: '📅', description: '6 month booking streak' },
          { name: 'Unstoppable', requirement: 12, icon: '🚀', description: '12 month booking streak' }
        ]
      },
      special: {
        name: 'Special Badges',
        badges: [
          { name: 'Early Adopter', requirement: 0, icon: '🌟', description: 'Joined in the first month' },
          { name: 'Birthday Star', requirement: 0, icon: '🎂', description: 'Visited on your birthday' },
          { name: 'Holiday Hero', requirement: 0, icon: '🎄', description: 'Booked during holidays' },
          { name: 'Night Owl', requirement: 0, icon: '🦉', description: 'Booked late evening appointments' },
          { name: 'Early Bird', requirement: 0, icon: '🐦', description: 'Booked early morning appointments' }
        ]
      }
    };

    // If customer ID provided, get their progress
    let customerProgress = {};
    if (customerId) {
      const analytics = await getCustomerAnalytics(customerId, barberbarbershopId);
      const milestones = await getCustomerMilestones(customerId, barberbarbershopId);
      
      customerProgress = await calculateBadgeProgress(customerId, barberbarbershopId, badgeCategories, analytics, milestones);
    }

    return {
      categories: badgeCategories,
      customer_progress: customerProgress
    };

  } catch (error) {
    console.error('Error getting badges and progress:', error);
    return { categories: {}, customer_progress: {} };
  }
}

/**
 * Helper function to get active challenges
 */
async function getActiveChallenges(barberbarbershopId, customerId) {
  try {
    // For now, return predefined challenges
    // In a full implementation, these would be stored in a database
    const currentDate = new Date();
    const challenges = [
      {
        id: 'monthly_visits',
        name: 'Monthly Regular',
        description: 'Complete 2 appointments this month',
        type: 'visits',
        requirements: { visits: 2, period: 'month' },
        rewards: { points: 200, badge: 'Monthly Regular' },
        start_date: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1),
        end_date: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0),
        progress: customerId ? await getChallengeProgress(customerId, 'monthly_visits', barberbarbershopId) : null,
        participants: 0, // Would be calculated from database
        completed_by: 0
      },
      {
        id: 'review_warrior',
        name: 'Review Warrior',
        description: 'Leave 3 reviews this quarter',
        type: 'engagement',
        requirements: { reviews: 3, period: 'quarter' },
        rewards: { points: 500, badge: 'Review Warrior' },
        start_date: new Date(currentDate.getFullYear(), Math.floor(currentDate.getMonth() / 3) * 3, 1),
        end_date: new Date(currentDate.getFullYear(), Math.floor(currentDate.getMonth() / 3) * 3 + 3, 0),
        progress: customerId ? await getChallengeProgress(customerId, 'review_warrior', barberbarbershopId) : null,
        participants: 0,
        completed_by: 0
      },
      {
        id: 'referral_master',
        name: 'Referral Master',
        description: 'Refer 2 friends this month',
        type: 'referrals',
        requirements: { referrals: 2, period: 'month' },
        rewards: { points: 1000, badge: 'Referral Master' },
        start_date: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1),
        end_date: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0),
        progress: customerId ? await getChallengeProgress(customerId, 'referral_master', barberbarbershopId) : null,
        participants: 0,
        completed_by: 0
      }
    ];

    // Filter active challenges
    const activeChallenges = challenges.filter(challenge => 
      challenge.start_date <= currentDate && challenge.end_date >= currentDate
    );

    return activeChallenges;

  } catch (error) {
    console.error('Error getting active challenges:', error);
    return [];
  }
}

/**
 * Helper function to get gamification statistics
 */
async function getGamificationStats(barberbarbershopId, programId) {
  try {
    // Get total enrollments
    let query = supabase
      .from('loyalty_program_enrollments')
      .select('*', { count: 'exact' })
      .eq('barberbarbershop_id', barberbarbershopId)
      .eq('is_active', true);

    if (programId) {
      query = query.eq('loyalty_program_id', programId);
    }

    const { count: totalMembers } = await query;

    // Get milestone statistics
    const { data: milestones } = await supabase
      .from('customer_milestones')
      .select('milestone_type')
      .eq('barberbarbershop_id', barberbarbershopId);

    const milestoneStats = (milestones || []).reduce((stats, milestone) => {
      stats[milestone.milestone_type] = (stats[milestone.milestone_type] || 0) + 1;
      return stats;
    }, {});

    // Get tier distribution
    const { data: enrollments } = await supabase
      .from('loyalty_program_enrollments')
      .select('current_tier')
      .eq('barberbarbershop_id', barberbarbershopId)
      .eq('is_active', true);

    const tierDistribution = (enrollments || []).reduce((dist, enrollment) => {
      const tier = enrollment.current_tier || 'No Tier';
      dist[tier] = (dist[tier] || 0) + 1;
      return dist;
    }, {});

    return {
      total_members: totalMembers || 0,
      milestone_stats: milestoneStats,
      tier_distribution: tierDistribution,
      active_challenges: 3, // Would be calculated from database
      badges_awarded: Object.values(milestoneStats).reduce((sum, count) => sum + count, 0)
    };

  } catch (error) {
    console.error('Error getting gamification stats:', error);
    return {
      total_members: 0,
      milestone_stats: {},
      tier_distribution: {},
      active_challenges: 0,
      badges_awarded: 0
    };
  }
}

/**
 * Helper function to award badge
 */
async function awardBadge(customerId, barberbarbershopId, badgeType, badgeName, reason) {
  try {
    // Create milestone for badge
    const milestoneData = {
      barberbarbershop_id: barberbarbershopId,
      customer_id: customerId,
      milestone_type: 'badge_earned',
      milestone_name: `${badgeName} Badge`,
      milestone_description: reason || `Earned ${badgeName} badge`,
      milestone_data: { badge_type: badgeType, badge_name: badgeName },
      achieved_at: new Date().toISOString(),
      achievement_method: 'manual',
      is_celebrated: false,
      importance_level: 2,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: milestone, error } = await supabase
      .from('customer_milestones')
      .insert(milestoneData)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return {
      badge_awarded: true,
      badge_type: badgeType,
      badge_name: badgeName,
      milestone_id: milestone.id
    };

  } catch (error) {
    console.error('Error awarding badge:', error);
    return {
      badge_awarded: false,
      error: 'Failed to award badge'
    };
  }
}

/**
 * Helper function to create challenge
 */
async function createChallenge(barberbarbershopId, challengeData) {
  try {
    // In a full implementation, this would create a challenge record in the database
    // For now, return the challenge data with an ID
    const challenge = {
      id: `challenge_${Date.now()}`,
      barberbarbershop_id: barberbarbershopId,
      ...challengeData,
      status: 'active',
      participants: 0,
      completed_by: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    return challenge;

  } catch (error) {
    console.error('Error creating challenge:', error);
    throw error;
  }
}

/**
 * Helper function to check and award achievements
 */
async function checkAndAwardAchievements(customerId, barberbarbershopId) {
  try {
    const analytics = await getCustomerAnalytics(customerId, barberbarbershopId);
    const newAchievements = [];

    // Check visit-based achievements
    const visitAchievements = [
      { name: 'First Timer', visits: 1, icon: '🎯' },
      { name: 'Regular', visits: 5, icon: '⭐' },
      { name: 'Frequent Flyer', visits: 10, icon: '🔥' },
      { name: 'VIP', visits: 25, icon: '👑' },
      { name: 'Legend', visits: 50, icon: '🏆' },
      { name: 'Century Club', visits: 100, icon: '💎' }
    ];

    for (const achievement of visitAchievements) {
      if (analytics.total_visits >= achievement.visits) {
        // Check if already awarded
        const existing = await checkExistingAchievement(customerId, barberbarbershopId, achievement.name);
        if (!existing) {
          await awardBadge(customerId, barberbarbershopId, 'visits', achievement.name, 
            `Completed ${achievement.visits} appointments`);
          newAchievements.push(achievement);
        }
      }
    }

    // Check spending-based achievements
    const spendingAchievements = [
      { name: 'Big Spender', amount: 500, icon: '💰' },
      { name: 'High Roller', amount: 1000, icon: '💳' },
      { name: 'Platinum Patron', amount: 2500, icon: '🌟' },
      { name: 'Diamond Member', amount: 5000, icon: '💎' }
    ];

    for (const achievement of spendingAchievements) {
      if (analytics.total_spent >= achievement.amount) {
        const existing = await checkExistingAchievement(customerId, barberbarbershopId, achievement.name);
        if (!existing) {
          await awardBadge(customerId, barberbarbershopId, 'spending', achievement.name, 
            `Spent $${achievement.amount} total`);
          newAchievements.push(achievement);
        }
      }
    }

    return {
      achievements_checked: true,
      new_achievements: newAchievements,
      total_achievements: await getCustomerAchievementsCount(customerId, barberbarbershopId)
    };

  } catch (error) {
    console.error('Error checking achievements:', error);
    return {
      achievements_checked: false,
      new_achievements: [],
      error: 'Failed to check achievements'
    };
  }
}

/**
 * Helper function to join challenge
 */
async function joinChallenge(customerId, challengeId, barberbarbershopId) {
  try {
    // In a full implementation, this would create a challenge participation record
    // For now, return success
    return {
      challenge_joined: true,
      challenge_id: challengeId,
      customer_id: customerId,
      joined_at: new Date().toISOString()
    };

  } catch (error) {
    console.error('Error joining challenge:', error);
    return {
      challenge_joined: false,
      error: 'Failed to join challenge'
    };
  }
}

/**
 * Helper function to get period cutoff date
 */
function getPeriodCutoffDate(period) {
  const now = new Date();
  switch (period) {
    case 'weekly':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case 'monthly':
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case 'quarterly':
      return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    case 'yearly':
      return new Date(now.getFullYear(), 0, 1);
    default:
      return new Date(0); // All time
  }
}

/**
 * Helper function to add period points
 */
async function addPeriodPoints(enrollments, barberbarbershopId, period) {
  const cutoffDate = getPeriodCutoffDate(period);
  
  for (const enrollment of enrollments) {
    // Get points earned in period
    const { data: transactions } = await supabase
      .from('loyalty_points')
      .select('points_amount')
      .eq('customer_id', enrollment.customer_id)
      .eq('barberbarbershop_id', barberbarbershopId)
      .gt('points_amount', 0)
      .gte('created_at', cutoffDate.toISOString());

    enrollment.period_points = (transactions || []).reduce((sum, t) => sum + t.points_amount, 0);
  }

  return enrollments;
}

/**
 * Helper function to get position badge emoji
 */
function getPositionBadge(position) {
  switch (position) {
    case 1: return '🥇';
    case 2: return '🥈';
    case 3: return '🥉';
    default: return position <= 10 ? '⭐' : '';
  }
}

/**
 * Helper function to get customer streak
 */
async function getCustomerStreak(customerId, barberbarbershopId) {
  try {
    // Get recent appointments to calculate streak
    const { data: appointments } = await supabase
      .from('appointments')
      .select('appointment_date, status')
      .eq('customer_id', customerId)
      .eq('status', 'completed')
      .order('appointment_date', { ascending: false })
      .limit(12);

    if (!appointments || appointments.length === 0) {
      return { current: 0, type: 'visits' };
    }

    // Calculate monthly visit streak
    let streak = 0;
    const monthsWithVisits = new Set();
    
    for (const appointment of appointments) {
      const appointmentDate = new Date(appointment.appointment_date);
      const monthKey = `${appointmentDate.getFullYear()}-${appointmentDate.getMonth()}`;
      monthsWithVisits.add(monthKey);
    }

    // Check consecutive months
    const now = new Date();
    const checkMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    while (monthsWithVisits.has(`${checkMonth.getFullYear()}-${checkMonth.getMonth()}`)) {
      streak++;
      checkMonth.setMonth(checkMonth.getMonth() - 1);
    }

    return { current: streak, type: 'monthly_visits' };

  } catch (error) {
    console.error('Error calculating customer streak:', error);
    return { current: 0, type: 'visits' };
  }
}

/**
 * Helper function to get customer achievements count
 */
async function getCustomerAchievementsCount(customerId, barberbarbershopId) {
  try {
    const { count } = await supabase
      .from('customer_milestones')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', customerId)
      .eq('barberbarbershop_id', barberbarbershopId)
      .eq('milestone_type', 'badge_earned');

    return count || 0;

  } catch (error) {
    console.error('Error getting achievements count:', error);
    return 0;
  }
}

/**
 * Helper function to get customer analytics
 */
async function getCustomerAnalytics(customerId, barberbarbershopId) {
  try {
    // Get basic customer stats
    const { data: appointments } = await supabase
      .from('appointments')
      .select('total_amount, status, appointment_date, created_at')
      .eq('customer_id', customerId)
      .eq('status', 'completed');

    const totalVisits = appointments?.length || 0;
    const totalSpent = appointments?.reduce((sum, apt) => sum + (parseFloat(apt.total_amount) || 0), 0) || 0;
    
    // Calculate days since first visit
    const firstVisit = appointments?.sort((a, b) => new Date(a.appointment_date) - new Date(b.appointment_date))[0];
    const daysSinceFirst = firstVisit ? 
      Math.floor((new Date() - new Date(firstVisit.appointment_date)) / (1000 * 60 * 60 * 24)) : 0;
    
    // Calculate average days between visits
    let averageDaysBetween = 0;
    if (appointments && appointments.length > 1) {
      const sortedAppointments = appointments.sort((a, b) => new Date(a.appointment_date) - new Date(b.appointment_date));
      const gaps = [];
      for (let i = 1; i < sortedAppointments.length; i++) {
        const gap = Math.floor((new Date(sortedAppointments[i].appointment_date) - new Date(sortedAppointments[i-1].appointment_date)) / (1000 * 60 * 60 * 24));
        gaps.push(gap);
      }
      averageDaysBetween = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
    }

    // Get loyalty points
    const { data: pointsTransactions } = await supabase
      .from('loyalty_points')
      .select('points_amount')
      .eq('customer_id', customerId)
      .eq('barberbarbershop_id', barberbarbershopId)
      .gt('points_amount', 0);

    const totalPointsEarned = pointsTransactions?.reduce((sum, t) => sum + t.points_amount, 0) || 0;
    
    // Get current loyalty points balance
    const { data: enrollment } = await supabase
      .from('loyalty_program_enrollments')
      .select('current_points, current_tier, member_since')
      .eq('customer_id', customerId)
      .eq('barberbarbershop_id', barberbarbershopId)
      .eq('is_active', true)
      .single();
    
    const currentPoints = enrollment?.current_points || 0;
    const currentTier = enrollment?.current_tier || 'Bronze';
    const memberSince = enrollment?.member_since;

    // Get reviews
    const { data: reviews } = await supabase
      .from('customer_feedback')
      .select('overall_rating')
      .eq('customer_id', customerId)
      .eq('barberbarbershop_id', barberbarbershopId)
      .not('overall_rating', 'is', null);

    const reviewsCount = reviews?.length || 0;
    const averageRating = reviewsCount > 0 ? 
      Math.round((reviews.reduce((sum, r) => sum + r.overall_rating, 0) / reviewsCount) * 10) / 10 : 0;

    // Get referrals
    const { data: referrals } = await supabase
      .from('referral_tracking')
      .select('status')
      .eq('referrer_customer_id', customerId)
      .eq('barberbarbershop_id', barberbarbershopId);

    const totalReferrals = referrals?.length || 0;
    const successfulReferrals = referrals?.filter(r => r.status === 'qualified' || r.status === 'rewarded').length || 0;
    
    // Calculate engagement score (0-100)
    const engagementScore = calculateEngagementScore({
      totalVisits,
      totalSpent,
      reviewsCount,
      totalReferrals,
      daysSinceFirst,
      averageDaysBetween
    });

    return {
      total_visits: totalVisits,
      total_spent: totalSpent,
      total_points_earned: totalPointsEarned,
      current_points: currentPoints,
      current_tier: currentTier,
      member_since: memberSince,
      reviews_count: reviewsCount,
      average_rating: averageRating,
      total_referrals: totalReferrals,
      successful_referrals: successfulReferrals,
      days_since_first_visit: daysSinceFirst,
      average_days_between_visits: Math.round(averageDaysBetween),
      engagement_score: engagementScore
    };

  } catch (error) {
    console.error('Error getting customer analytics:', error);
    return {
      total_visits: 0,
      total_spent: 0,
      total_points_earned: 0,
      current_points: 0,
      current_tier: 'Bronze',
      member_since: null,
      reviews_count: 0,
      average_rating: 0,
      total_referrals: 0,
      successful_referrals: 0,
      days_since_first_visit: 0,
      average_days_between_visits: 0,
      engagement_score: 0
    };
  }
}

/**
 * Calculate customer engagement score (0-100)
 */
function calculateEngagementScore({ totalVisits, totalSpent, reviewsCount, totalReferrals, daysSinceFirst, averageDaysBetween }) {
  let score = 0;
  
  // Visit frequency score (30 points max)
  const visitFrequency = daysSinceFirst > 0 ? totalVisits / (daysSinceFirst / 30) : 0;
  score += Math.min(30, visitFrequency * 10);
  
  // Spending score (25 points max)
  const avgSpendPerVisit = totalVisits > 0 ? totalSpent / totalVisits : 0;
  score += Math.min(25, (avgSpendPerVisit / 50) * 25);
  
  // Engagement activities (25 points max)
  score += Math.min(15, reviewsCount * 3);
  score += Math.min(10, totalReferrals * 5);
  
  // Consistency bonus (20 points max)
  if (averageDaysBetween > 0 && averageDaysBetween <= 45) {
    score += 20; // Regular customer
  } else if (averageDaysBetween <= 60) {
    score += 15; // Semi-regular
  } else if (averageDaysBetween <= 90) {
    score += 10; // Occasional
  }
  
  return Math.min(100, Math.max(0, Math.round(score)));
}

/**
 * Helper function to get customer milestones
 */
async function getCustomerMilestones(customerId, barberbarbershopId) {
  try {
    const { data: milestones } = await supabase
      .from('customer_milestones')
      .select('*')
      .eq('customer_id', customerId)
      .eq('barberbarbershop_id', barberbarbershopId);

    return milestones || [];

  } catch (error) {
    console.error('Error getting customer milestones:', error);
    return [];
  }
}

/**
 * Helper function to calculate customer achievements
 */
async function calculateCustomerAchievements(customerId, barberbarbershopId, analytics, milestones) {
  const achievements = {
    badges: [],
    streaks: {},
    special_achievements: []
  };

  // Visit-based badges
  if (analytics.total_visits >= 100) {
    achievements.badges.push({ name: 'Century Club', icon: '💎', description: '100+ visits' });
  } else if (analytics.total_visits >= 50) {
    achievements.badges.push({ name: 'Legend', icon: '🏆', description: '50+ visits' });
  } else if (analytics.total_visits >= 25) {
    achievements.badges.push({ name: 'VIP', icon: '👑', description: '25+ visits' });
  } else if (analytics.total_visits >= 10) {
    achievements.badges.push({ name: 'Frequent Flyer', icon: '🔥', description: '10+ visits' });
  } else if (analytics.total_visits >= 5) {
    achievements.badges.push({ name: 'Regular', icon: '⭐', description: '5+ visits' });
  } else if (analytics.total_visits >= 1) {
    achievements.badges.push({ name: 'First Timer', icon: '🎯', description: 'First visit completed' });
  }

  // Spending-based badges
  if (analytics.total_spent >= 5000) {
    achievements.badges.push({ name: 'Diamond Member', icon: '💎', description: '$5000+ spent' });
  } else if (analytics.total_spent >= 2500) {
    achievements.badges.push({ name: 'Platinum Patron', icon: '🌟', description: '$2500+ spent' });
  } else if (analytics.total_spent >= 1000) {
    achievements.badges.push({ name: 'High Roller', icon: '💳', description: '$1000+ spent' });
  } else if (analytics.total_spent >= 500) {
    achievements.badges.push({ name: 'Big Spender', icon: '💰', description: '$500+ spent' });
  }

  // Review-based badges
  if (analytics.reviews_count >= 5) {
    achievements.badges.push({ name: 'Critic', icon: '📝', description: '5+ reviews' });
  } else if (analytics.reviews_count >= 1) {
    achievements.badges.push({ name: 'Reviewer', icon: '⭐', description: 'First review' });
  }

  // Referral-based badges
  if (analytics.successful_referrals >= 5) {
    achievements.badges.push({ name: 'Ambassador', icon: '🎖️', description: '5+ successful referrals' });
  } else if (analytics.successful_referrals >= 1) {
    achievements.badges.push({ name: 'Referral Champion', icon: '🤝', description: 'First referral' });
  }

  // Calculate streaks
  achievements.streaks = await getCustomerStreak(customerId, barberbarbershopId);

  return achievements;
}

/**
 * Helper function to get next achievements
 */
async function getNextAchievements(customerId, barberbarbershopId, analytics) {
  const nextAchievements = [];

  // Visit-based next achievements
  const visitTargets = [1, 5, 10, 25, 50, 100];
  const nextVisitTarget = visitTargets.find(target => target > analytics.total_visits);
  if (nextVisitTarget) {
    nextAchievements.push({
      name: `${nextVisitTarget} Visits`,
      progress: analytics.total_visits,
      target: nextVisitTarget,
      percentage: Math.round((analytics.total_visits / nextVisitTarget) * 100),
      type: 'visits'
    });
  }

  // Spending-based next achievements
  const spendingTargets = [500, 1000, 2500, 5000];
  const nextSpendingTarget = spendingTargets.find(target => target > analytics.total_spent);
  if (nextSpendingTarget) {
    nextAchievements.push({
      name: `$${nextSpendingTarget} Spent`,
      progress: analytics.total_spent,
      target: nextSpendingTarget,
      percentage: Math.round((analytics.total_spent / nextSpendingTarget) * 100),
      type: 'spending'
    });
  }

  // Review-based next achievements
  const reviewTargets = [1, 5, 10];
  const nextReviewTarget = reviewTargets.find(target => target > analytics.reviews_count);
  if (nextReviewTarget) {
    nextAchievements.push({
      name: `${nextReviewTarget} Reviews`,
      progress: analytics.reviews_count,
      target: nextReviewTarget,
      percentage: Math.round((analytics.reviews_count / nextReviewTarget) * 100),
      type: 'reviews'
    });
  }

  return nextAchievements;
}

/**
 * Helper function to calculate badge progress
 */
async function calculateBadgeProgress(customerId, barberbarbershopId, badgeCategories, analytics, milestones) {
  const progress = {};

  for (const [categoryId, category] of Object.entries(badgeCategories)) {
    progress[categoryId] = {
      name: category.name,
      badges: []
    };

    for (const badge of category.badges) {
      let current = 0;
      let earned = false;

      // Check if badge is already earned
      const existingMilestone = milestones.find(m => 
        m.milestone_type === 'badge_earned' && 
        m.milestone_name.includes(badge.name)
      );
      
      if (existingMilestone) {
        earned = true;
        current = badge.requirement;
      } else {
        // Calculate current progress
        switch (categoryId) {
          case 'visits':
            current = analytics.total_visits;
            break;
          case 'spending':
            current = analytics.total_spent;
            break;
          case 'loyalty':
            current = analytics.total_points_earned;
            break;
          case 'engagement':
            if (badge.name.includes('Review')) {
              current = analytics.reviews_count;
            } else if (badge.name.includes('Referral')) {
              current = analytics.successful_referrals;
            }
            break;
        }
      }

      progress[categoryId].badges.push({
        ...badge,
        current,
        earned,
        percentage: badge.requirement > 0 ? Math.min(100, Math.round((current / badge.requirement) * 100)) : 0
      });
    }
  }

  return progress;
}

/**
 * Helper function to check existing achievement
 */
async function checkExistingAchievement(customerId, barberbarbershopId, achievementName) {
  try {
    const { data: existing } = await supabase
      .from('customer_milestones')
      .select('id')
      .eq('customer_id', customerId)
      .eq('barberbarbershop_id', barberbarbershopId)
      .eq('milestone_type', 'badge_earned')
      .ilike('milestone_name', `%${achievementName}%`)
      .single();

    return !!existing;

  } catch (error) {
    return false;
  }
}

/**
 * Helper function to get challenge progress
 */
async function getChallengeProgress(customerId, challengeId, barberbarbershopId) {
  try {
    // Get specific challenge details from database
    const { data: challenge } = await supabase
      .from('gamification_challenges')
      .select('*')
      .eq('id', challengeId)
      .eq('barberbarbershop_id', barberbarbershopId)
      .single();
      
    if (!challenge) {
      // Fallback for predefined challenges
      return await getChallengeProgressLegacy(customerId, challengeId, barberbarbershopId);
    }
    
    // Get customer's participation record
    const { data: participation } = await supabase
      .from('customer_challenge_participations')
      .select('*')
      .eq('customer_id', customerId)
      .eq('challenge_id', challengeId)
      .single();
    
    if (!participation) {
      return { current: 0, target: 1, percentage: 0 };
    }
    
    const requirements = challenge.challenge_requirements;
    const progress = participation.current_progress || {};
    
    let current = 0;
    let target = 1;
    
    // Calculate progress based on challenge type
    switch (challenge.challenge_type) {
      case 'visits':
        current = progress.visits_completed || 0;
        target = requirements.visits_required || 1;
        break;
        
      case 'spending':
        current = progress.spending_completed || 0;
        target = requirements.spending_required || 100;
        break;
        
      case 'referrals':
        current = progress.referrals_completed || 0;
        target = requirements.referrals_required || 1;
        break;
        
      case 'reviews':
        current = progress.reviews_completed || 0;
        target = requirements.reviews_required || 1;
        break;
        
      default:
        current = progress.custom_progress || 0;
        target = requirements.target_value || 1;
    }
    
    return {
      current: current,
      target: target,
      percentage: Math.min(100, Math.round((current / target) * 100)),
      status: participation.status,
      joined_at: participation.joined_at,
      rewards_earned: participation.rewards_earned || []
    };

  } catch (error) {
    console.error('Error getting challenge progress:', error);
    return { current: 0, target: 1, percentage: 0 };
  }
}

/**
 * Legacy challenge progress calculation for predefined challenges
 */
async function getChallengeProgressLegacy(customerId, challengeId, barberbarbershopId) {
  try {
    const analytics = await getCustomerAnalytics(customerId, barberbarbershopId);
    
    // Calculate progress based on challenge type
    switch (challengeId) {
      case 'monthly_visits':
        const currentMonth = new Date();
        const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        
        const { data: monthlyVisits } = await supabase
          .from('appointments')
          .select('id')
          .eq('customer_id', customerId)
          .eq('status', 'completed')
          .gte('appointment_date', monthStart.toISOString());

        return {
          current: monthlyVisits?.length || 0,
          target: 2,
          percentage: Math.min(100, ((monthlyVisits?.length || 0) / 2) * 100)
        };

      case 'review_warrior':
        const quarterStart = new Date();
        quarterStart.setMonth(Math.floor(quarterStart.getMonth() / 3) * 3, 1);
        
        const { data: quarterlyReviews } = await supabase
          .from('customer_feedback')
          .select('id')
          .eq('customer_id', customerId)
          .eq('barberbarbershop_id', barberbarbershopId)
          .gte('created_at', quarterStart.toISOString());
          
        return {
          current: quarterlyReviews?.length || 0,
          target: 3,
          percentage: Math.min(100, ((quarterlyReviews?.length || 0) / 3) * 100)
        };

      case 'referral_master':
        const referralMonthStart = new Date();
        referralMonthStart.setDate(1);
        referralMonthStart.setHours(0, 0, 0, 0);
        
        const { data: monthlyReferrals } = await supabase
          .from('referral_tracking')
          .select('id')
          .eq('referrer_customer_id', customerId)
          .eq('barberbarbershop_id', barberbarbershopId)
          .gte('created_at', referralMonthStart.toISOString());
          
        return {
          current: monthlyReferrals?.length || 0,
          target: 2,
          percentage: Math.min(100, ((monthlyReferrals?.length || 0) / 2) * 100)
        };

      default:
        return { current: 0, target: 1, percentage: 0 };
    }

  } catch (error) {
    console.error('Error getting legacy challenge progress:', error);
    return { current: 0, target: 1, percentage: 0 };
  }
}

/**
 * Update customer challenge progress
 */
async function updateChallengeProgress(customerId, challengeId, barberbarbershopId, progressData) {
  try {
    // Get current participation record
    const { data: participation } = await supabase
      .from('customer_challenge_participations')
      .select('*')
      .eq('customer_id', customerId)
      .eq('challenge_id', challengeId)
      .single();
      
    if (!participation) {
      // Create new participation record
      const { data: newParticipation, error } = await supabase
        .from('customer_challenge_participations')
        .insert({
          barberbarbershop_id: barberbarbershopId,
          customer_id: customerId,
          challenge_id: challengeId,
          current_progress: progressData,
          progress_percentage: calculateProgressPercentage(progressData, challengeId)
        })
        .select()
        .single();
        
      if (error) throw error;
      return newParticipation;
    } else {
      // Update existing participation
      const updatedProgress = { ...participation.current_progress, ...progressData };
      const progressPercentage = calculateProgressPercentage(updatedProgress, challengeId);
      
      const { data: updatedParticipation, error } = await supabase
        .from('customer_challenge_participations')
        .update({
          current_progress: updatedProgress,
          progress_percentage: progressPercentage,
          status: progressPercentage >= 100 ? 'completed' : 'active',
          completed_at: progressPercentage >= 100 ? new Date().toISOString() : null
        })
        .eq('id', participation.id)
        .select()
        .single();
        
      if (error) throw error;
      
      // Check if challenge completed and award rewards
      if (progressPercentage >= 100 && participation.status !== 'completed') {
        await awardChallengeRewards(customerId, challengeId, barberbarbershopId);
      }
      
      return updatedParticipation;
    }
    
  } catch (error) {
    console.error('Error updating challenge progress:', error);
    return null;
  }
}

/**
 * Calculate progress percentage for a challenge
 */
function calculateProgressPercentage(progressData, challengeId) {
  // This would be more sophisticated in a real implementation
  // For now, use simple calculations
  
  if (progressData.visits_completed && progressData.visits_target) {
    return Math.min(100, (progressData.visits_completed / progressData.visits_target) * 100);
  }
  
  if (progressData.spending_completed && progressData.spending_target) {
    return Math.min(100, (progressData.spending_completed / progressData.spending_target) * 100);
  }
  
  if (progressData.reviews_completed && progressData.reviews_target) {
    return Math.min(100, (progressData.reviews_completed / progressData.reviews_target) * 100);
  }
  
  return 0;
}

/**
 * Award challenge completion rewards
 */
async function awardChallengeRewards(customerId, challengeId, barberbarbershopId) {
  try {
    const { data: challenge } = await supabase
      .from('gamification_challenges')
      .select('reward_structure')
      .eq('id', challengeId)
      .single();
      
    if (!challenge || !challenge.reward_structure.completion_reward) {
      return;
    }
    
    const reward = challenge.reward_structure.completion_reward;
    
    if (reward.type === 'points' && reward.amount) {
      // Award loyalty points
      await awardLoyaltyPoints(customerId, barberbarbershopId, reward.amount, 'challenge_completion', challengeId);
    }
    
    if (reward.type === 'badge' && reward.value) {
      // Award badge through milestone system
      await awardBadge(customerId, barberbarbershopId, 'challenge', reward.value, `Completed challenge`);
    }
    
  } catch (error) {
    console.error('Error awarding challenge rewards:', error);
  }
}

/**
 * Award loyalty points helper
 */
async function awardLoyaltyPoints(customerId, barberbarbershopId, points, source, sourceId) {
  try {
    // Get current balance
    const { data: enrollment } = await supabase
      .from('loyalty_program_enrollments')
      .select('current_points')
      .eq('customer_id', customerId)
      .eq('barberbarbershop_id', barberbarbershopId)
      .single();
      
    const currentBalance = enrollment?.current_points || 0;
    
    // Create points transaction
    const { error } = await supabase
      .from('loyalty_points')
      .insert({
        barberbarbershop_id: barberbarbershopId,
        customer_id: customerId,
        loyalty_program_id: enrollment.loyalty_program_id,
        transaction_type: 'earned',
        points_amount: points,
        source_type: source,
        source_id: sourceId,
        balance_before: currentBalance,
        balance_after: currentBalance + points,
        description: `Points earned from ${source}`
      });
      
    if (error) {
      console.error('Error creating points transaction:', error);
    }
    
  } catch (error) {
    console.error('Error awarding loyalty points:', error);
  }
}