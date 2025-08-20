/**
 * Loyalty Gamification API Route
 * Handles leaderboards, achievements, badges, and gamification features
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
        .select('barbershop_id')
        .eq('user_id', user.id)
        .single();

      if (barberError || !barbers) {
        return NextResponse.json({ error: 'User not associated with barbershop' }, { status: 403 });
      }
      
      barbershops = { id: barbers.barbershop_id };
    }

    const barbershopId = barbershops.id;
    const url = new URL(request.url);
    const action = url.searchParams.get('action') || 'leaderboard';
    const customerId = url.searchParams.get('customer_id');
    const programId = url.searchParams.get('program_id');
    const period = url.searchParams.get('period') || 'all_time';
    const limit = parseInt(url.searchParams.get('limit')) || 10;

    if (action === 'leaderboard') {
      // Get customer leaderboard
      const leaderboard = await getCustomerLeaderboard(barbershopId, programId, period, limit);
      
      return NextResponse.json({ 
        success: true, 
        leaderboard,
        period,
        limit
      });

    } else if (action === 'achievements') {
      // Get customer achievements
      if (!customerId) {
        return NextResponse.json({ error: 'customer_id parameter required for achievements' }, { status: 400 });
      }

      const achievements = await getCustomerAchievements(customerId, barbershopId, programId);
      
      return NextResponse.json({ 
        success: true, 
        customer_id: customerId,
        ...achievements
      });

    } else if (action === 'badges') {
      // Get available badges and customer progress
      const badges = await getBadgesAndProgress(barbershopId, customerId);
      
      return NextResponse.json({ 
        success: true, 
        badges
      });

    } else if (action === 'challenges') {
      // Get active challenges
      const challenges = await getActiveChallenges(barbershopId, customerId);
      
      return NextResponse.json({ 
        success: true, 
        challenges
      });

    } else if (action === 'stats') {
      // Get gamification statistics
      const stats = await getGamificationStats(barbershopId, programId);
      
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
    let { data: barbershops, error: shopError } = await supabase
      .from('barbershops')
      .select('id')
      .eq('owner_id', user.id)
      .single();

    if (shopError || !barbershops) {
      return NextResponse.json({ error: 'User not associated with barbershop' }, { status: 403 });
    }

    const barbershopId = barbershops.id;
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

      const result = await awardBadge(customer_id, barbershopId, badge_type, badge_name, reason);
      
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

      const challenge = await createChallenge(barbershopId, {
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

      const achievements = await checkAndAwardAchievements(customer_id, barbershopId);
      
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

      const result = await joinChallenge(customer_id, challenge_id, barbershopId);
      
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
async function getCustomerLeaderboard(barbershopId, programId, period, limit) {
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
      .eq('barbershop_id', barbershopId)
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
      filteredEnrollments = await addPeriodPoints(filteredEnrollments, barbershopId, period);
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
      streak: await getCustomerStreak(enrollment.customer_id, barbershopId),
      achievements_count: await getCustomerAchievementsCount(enrollment.customer_id, barbershopId)
    })));

    return leaderboard;

  } catch (error) {
    console.error('Error getting customer leaderboard:', error);
    return [];
  }
}

/**
 * Helper function to get customer achievements
 */
async function getCustomerAchievements(customerId, barbershopId, programId) {
  try {
    // Get customer milestones
    const { data: milestones, error: milestonesError } = await supabase
      .from('customer_milestones')
      .select('*')
      .eq('customer_id', customerId)
      .eq('barbershop_id', barbershopId)
      .order('achieved_at', { ascending: false });

    if (milestonesError) {
      console.error('Error fetching milestones:', milestonesError);
    }

    // Get customer analytics for achievement calculation
    const analytics = await getCustomerAnalytics(customerId, barbershopId);

    // Calculate achievements based on analytics and milestones
    const achievements = await calculateCustomerAchievements(customerId, barbershopId, analytics, milestones || []);

    // Get progress toward next achievements
    const nextAchievements = await getNextAchievements(customerId, barbershopId, analytics);

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
async function getBadgesAndProgress(barbershopId, customerId) {
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
      const analytics = await getCustomerAnalytics(customerId, barbershopId);
      const milestones = await getCustomerMilestones(customerId, barbershopId);
      
      customerProgress = await calculateBadgeProgress(customerId, barbershopId, badgeCategories, analytics, milestones);
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
async function getActiveChallenges(barbershopId, customerId) {
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
        progress: customerId ? await getChallengeProgress(customerId, 'monthly_visits', barbershopId) : null,
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
        progress: customerId ? await getChallengeProgress(customerId, 'review_warrior', barbershopId) : null,
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
        progress: customerId ? await getChallengeProgress(customerId, 'referral_master', barbershopId) : null,
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
async function getGamificationStats(barbershopId, programId) {
  try {
    // Get total enrollments
    let query = supabase
      .from('loyalty_program_enrollments')
      .select('*', { count: 'exact' })
      .eq('barbershop_id', barbershopId)
      .eq('is_active', true);

    if (programId) {
      query = query.eq('loyalty_program_id', programId);
    }

    const { count: totalMembers } = await query;

    // Get milestone statistics
    const { data: milestones } = await supabase
      .from('customer_milestones')
      .select('milestone_type')
      .eq('barbershop_id', barbershopId);

    const milestoneStats = (milestones || []).reduce((stats, milestone) => {
      stats[milestone.milestone_type] = (stats[milestone.milestone_type] || 0) + 1;
      return stats;
    }, {});

    // Get tier distribution
    const { data: enrollments } = await supabase
      .from('loyalty_program_enrollments')
      .select('current_tier')
      .eq('barbershop_id', barbershopId)
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
async function awardBadge(customerId, barbershopId, badgeType, badgeName, reason) {
  try {
    // Create milestone for badge
    const milestoneData = {
      barbershop_id: barbershopId,
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
async function createChallenge(barbershopId, challengeData) {
  try {
    // In a full implementation, this would create a challenge record in the database
    // For now, return the challenge data with an ID
    const challenge = {
      id: `challenge_${Date.now()}`,
      barbershop_id: barbershopId,
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
async function checkAndAwardAchievements(customerId, barbershopId) {
  try {
    const analytics = await getCustomerAnalytics(customerId, barbershopId);
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
        const existing = await checkExistingAchievement(customerId, barbershopId, achievement.name);
        if (!existing) {
          await awardBadge(customerId, barbershopId, 'visits', achievement.name, 
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
        const existing = await checkExistingAchievement(customerId, barbershopId, achievement.name);
        if (!existing) {
          await awardBadge(customerId, barbershopId, 'spending', achievement.name, 
            `Spent $${achievement.amount} total`);
          newAchievements.push(achievement);
        }
      }
    }

    return {
      achievements_checked: true,
      new_achievements: newAchievements,
      total_achievements: await getCustomerAchievementsCount(customerId, barbershopId)
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
async function joinChallenge(customerId, challengeId, barbershopId) {
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
async function addPeriodPoints(enrollments, barbershopId, period) {
  const cutoffDate = getPeriodCutoffDate(period);
  
  for (const enrollment of enrollments) {
    // Get points earned in period
    const { data: transactions } = await supabase
      .from('loyalty_points')
      .select('points_amount')
      .eq('customer_id', enrollment.customer_id)
      .eq('barbershop_id', barbershopId)
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
async function getCustomerStreak(customerId, barbershopId) {
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
    let checkMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
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
async function getCustomerAchievementsCount(customerId, barbershopId) {
  try {
    const { count } = await supabase
      .from('customer_milestones')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', customerId)
      .eq('barbershop_id', barbershopId)
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
async function getCustomerAnalytics(customerId, barbershopId) {
  try {
    // Get basic customer stats
    const { data: appointments } = await supabase
      .from('appointments')
      .select('total_amount, status, appointment_date')
      .eq('customer_id', customerId)
      .eq('status', 'completed');

    const totalVisits = appointments?.length || 0;
    const totalSpent = appointments?.reduce((sum, apt) => sum + (parseFloat(apt.total_amount) || 0), 0) || 0;

    // Get loyalty points
    const { data: pointsTransactions } = await supabase
      .from('loyalty_points')
      .select('points_amount')
      .eq('customer_id', customerId)
      .eq('barbershop_id', barbershopId)
      .gt('points_amount', 0);

    const totalPointsEarned = pointsTransactions?.reduce((sum, t) => sum + t.points_amount, 0) || 0;

    // Get reviews
    const { data: reviews } = await supabase
      .from('customer_feedback')
      .select('overall_rating')
      .eq('customer_id', customerId)
      .eq('barbershop_id', barbershopId)
      .not('overall_rating', 'is', null);

    const reviewsCount = reviews?.length || 0;
    const averageRating = reviewsCount > 0 ? 
      reviews.reduce((sum, r) => sum + r.overall_rating, 0) / reviewsCount : 0;

    // Get referrals
    const { data: referrals } = await supabase
      .from('referral_tracking')
      .select('status')
      .eq('referrer_customer_id', customerId)
      .eq('barbershop_id', barbershopId);

    const totalReferrals = referrals?.length || 0;
    const successfulReferrals = referrals?.filter(r => r.status === 'qualified' || r.status === 'rewarded').length || 0;

    return {
      total_visits: totalVisits,
      total_spent: totalSpent,
      total_points_earned: totalPointsEarned,
      reviews_count: reviewsCount,
      average_rating: averageRating,
      total_referrals: totalReferrals,
      successful_referrals: successfulReferrals
    };

  } catch (error) {
    console.error('Error getting customer analytics:', error);
    return {
      total_visits: 0,
      total_spent: 0,
      total_points_earned: 0,
      reviews_count: 0,
      average_rating: 0,
      total_referrals: 0,
      successful_referrals: 0
    };
  }
}

/**
 * Helper function to get customer milestones
 */
async function getCustomerMilestones(customerId, barbershopId) {
  try {
    const { data: milestones } = await supabase
      .from('customer_milestones')
      .select('*')
      .eq('customer_id', customerId)
      .eq('barbershop_id', barbershopId);

    return milestones || [];

  } catch (error) {
    console.error('Error getting customer milestones:', error);
    return [];
  }
}

/**
 * Helper function to calculate customer achievements
 */
async function calculateCustomerAchievements(customerId, barbershopId, analytics, milestones) {
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
  achievements.streaks = await getCustomerStreak(customerId, barbershopId);

  return achievements;
}

/**
 * Helper function to get next achievements
 */
async function getNextAchievements(customerId, barbershopId, analytics) {
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
async function calculateBadgeProgress(customerId, barbershopId, badgeCategories, analytics, milestones) {
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
async function checkExistingAchievement(customerId, barbershopId, achievementName) {
  try {
    const { data: existing } = await supabase
      .from('customer_milestones')
      .select('id')
      .eq('customer_id', customerId)
      .eq('barbershop_id', barbershopId)
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
async function getChallengeProgress(customerId, challengeId, barbershopId) {
  try {
    const analytics = await getCustomerAnalytics(customerId, barbershopId);
    
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
        // Would calculate reviews for current quarter
        return {
          current: analytics.reviews_count,
          target: 3,
          percentage: Math.min(100, (analytics.reviews_count / 3) * 100)
        };

      case 'referral_master':
        // Would calculate referrals for current month
        return {
          current: analytics.total_referrals,
          target: 2,
          percentage: Math.min(100, (analytics.total_referrals / 2) * 100)
        };

      default:
        return { current: 0, target: 1, percentage: 0 };
    }

  } catch (error) {
    console.error('Error getting challenge progress:', error);
    return { current: 0, target: 1, percentage: 0 };
  }
}