/**
 * Loyalty Referrals API Route
 * Handles referral tracking, rewards, and referral program management
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
 * GET /api/customers/loyalty/referrals
 * Get referral tracking data and analytics
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
    const action = url.searchParams.get('action') || 'list';
    const customerId = url.searchParams.get('customer_id');
    const status = url.searchParams.get('status');
    const limit = parseInt(url.searchParams.get('limit')) || 50;
    const offset = parseInt(url.searchParams.get('offset')) || 0;

    if (action === 'list') {
      // Get referral tracking data
      let query = supabase
        .from('referral_tracking')
        .select(`
          *,
          referrer:customers!referrer_customer_id(first_name, last_name, email),
          referee:customers!referee_customer_id(first_name, last_name, email)
        `)
        .eq('barbershop_id', barbershopId)
        .order('created_at', { ascending: false });

      if (customerId) {
        query = query.eq('referrer_customer_id', customerId);
      }

      if (status) {
        query = query.eq('status', status);
      }

      // Get total count
      const { count } = await query.select('*', { count: 'exact', head: true });

      // Get paginated results
      const { data: referrals, error: referralsError } = await query
        .range(offset, offset + limit - 1);

      if (referralsError) {
        console.error('Error fetching referrals:', referralsError);
        return NextResponse.json({ error: 'Failed to fetch referrals' }, { status: 500 });
      }

      return NextResponse.json({ 
        success: true, 
        referrals: referrals || [],
        total_count: count || 0
      });

    } else if (action === 'analytics') {
      // Get referral analytics
      const analytics = await getReferralAnalytics(barbershopId, customerId);
      
      return NextResponse.json({ 
        success: true, 
        analytics
      });

    } else if (action === 'code') {
      // Generate or get referral code for customer
      if (!customerId) {
        return NextResponse.json({ error: 'customer_id parameter required' }, { status: 400 });
      }

      const referralCode = await getOrCreateReferralCode(customerId, barbershopId);
      
      return NextResponse.json({ 
        success: true, 
        referral_code: referralCode.code,
        referral_link: referralCode.link,
        stats: referralCode.stats
      });
    }

    return NextResponse.json({ error: 'Invalid action parameter' }, { status: 400 });

  } catch (error) {
    console.error('Error in loyalty referrals API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/customers/loyalty/referrals
 * Track a new referral or update referral status
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
    const action = body.action || 'create';

    if (action === 'create') {
      // Create new referral
      const {
        referrer_customer_id,
        referee_email,
        referee_phone,
        referee_name,
        referral_method = 'manual',
        referral_source,
        referrer_reward_type = 'points',
        referrer_reward_value = 100,
        referee_reward_type = 'points',
        referee_reward_value = 50,
        qualification_requirements = { minimum_visits: 1 },
        notes
      } = body;

      if (!referrer_customer_id) {
        return NextResponse.json({ 
          error: 'referrer_customer_id is required' 
        }, { status: 400 });
      }

      if (!referee_email && !referee_phone) {
        return NextResponse.json({ 
          error: 'Either referee_email or referee_phone is required' 
        }, { status: 400 });
      }

      // Generate unique referral code
      const referralCode = await generateUniqueReferralCode(barbershopId);

      // Set expiration (30 days from now)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      // Create referral record
      const referralData = {
        barbershop_id: barbershopId,
        referrer_customer_id,
        referee_email,
        referee_phone,
        referee_name,
        referral_code: referralCode,
        referral_method,
        referral_source,
        status: 'sent',
        referrer_reward_type,
        referrer_reward_value,
        referee_reward_type,
        referee_reward_value,
        qualification_requirements,
        sent_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: referral, error: createError } = await supabase
        .from('referral_tracking')
        .insert(referralData)
        .select()
        .single();

      if (createError) {
        console.error('Error creating referral:', createError);
        return NextResponse.json({ error: 'Failed to create referral' }, { status: 500 });
      }

      return NextResponse.json({ 
        success: true, 
        referral,
        referral_link: generateReferralLink(referralCode, barbershopId),
        message: 'Referral created successfully'
      }, { status: 201 });

    } else if (action === 'update-status') {
      // Update referral status
      const { referral_id, new_status, referee_customer_id } = body;

      if (!referral_id || !new_status) {
        return NextResponse.json({ 
          error: 'referral_id and new_status are required' 
        }, { status: 400 });
      }

      const updateResult = await updateReferralStatus(
        referral_id, 
        new_status, 
        barbershopId, 
        referee_customer_id
      );

      if (!updateResult.success) {
        return NextResponse.json({ error: updateResult.error }, { status: 400 });
      }

      return NextResponse.json({ 
        success: true, 
        ...updateResult,
        message: `Referral status updated to ${new_status}`
      });

    } else if (action === 'claim') {
      // Claim referral reward (typically called by customer)
      const { referral_code, customer_id } = body;

      if (!referral_code || !customer_id) {
        return NextResponse.json({ 
          error: 'referral_code and customer_id are required' 
        }, { status: 400 });
      }

      const claimResult = await claimReferralReward(referral_code, customer_id, barbershopId);

      if (!claimResult.success) {
        return NextResponse.json({ error: claimResult.error }, { status: 400 });
      }

      return NextResponse.json({ 
        success: true, 
        ...claimResult,
        message: 'Referral reward claimed successfully'
      });
    }

    return NextResponse.json({ error: 'Invalid action parameter' }, { status: 400 });

  } catch (error) {
    console.error('Error processing referral:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/customers/loyalty/referrals
 * Update referral configuration or process bulk operations
 */
export async function PUT(request) {
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
    const action = body.action || 'update';

    if (action === 'process-rewards') {
      // Process pending referral rewards
      const { dry_run = true } = body;

      const processResult = await processPendingReferralRewards(barbershopId, dry_run);
      
      return NextResponse.json({ 
        success: true, 
        ...processResult
      });

    } else if (action === 'expire-old') {
      // Expire old referrals
      const { days_old = 30, dry_run = true } = body;

      const expireResult = await expireOldReferrals(barbershopId, days_old, dry_run);
      
      return NextResponse.json({ 
        success: true, 
        ...expireResult
      });
    }

    return NextResponse.json({ error: 'Invalid action parameter' }, { status: 400 });

  } catch (error) {
    console.error('Error in referral bulk operations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Helper function to get referral analytics
 */
async function getReferralAnalytics(barbershopId, customerId = null) {
  try {
    let query = supabase
      .from('referral_tracking')
      .select('*')
      .eq('barbershop_id', barbershopId);

    if (customerId) {
      query = query.eq('referrer_customer_id', customerId);
    }

    const { data: referrals, error } = await query;

    if (error || !referrals) {
      return {
        total_referrals: 0,
        successful_referrals: 0,
        pending_referrals: 0,
        conversion_rate: 0,
        total_rewards_given: 0,
        status_breakdown: {}
      };
    }

    // Calculate analytics
    const totalReferrals = referrals.length;
    const successfulReferrals = referrals.filter(r => r.status === 'qualified' || r.status === 'rewarded').length;
    const pendingReferrals = referrals.filter(r => ['sent', 'opened', 'clicked', 'signed_up'].includes(r.status)).length;
    const conversionRate = totalReferrals > 0 ? (successfulReferrals / totalReferrals) * 100 : 0;

    // Calculate total rewards given
    const totalRewardsGiven = referrals
      .filter(r => r.referrer_reward_given || r.referee_reward_given)
      .reduce((sum, r) => {
        let reward = 0;
        if (r.referrer_reward_given && r.referrer_reward_value) {
          reward += parseFloat(r.referrer_reward_value);
        }
        if (r.referee_reward_given && r.referee_reward_value) {
          reward += parseFloat(r.referee_reward_value);
        }
        return sum + reward;
      }, 0);

    // Status breakdown
    const statusBreakdown = referrals.reduce((breakdown, r) => {
      breakdown[r.status] = (breakdown[r.status] || 0) + 1;
      return breakdown;
    }, {});

    // Monthly trends (last 6 months)
    const monthlyTrends = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const monthReferrals = referrals.filter(r => {
        const createdAt = new Date(r.created_at);
        return createdAt >= monthStart && createdAt <= monthEnd;
      });

      monthlyTrends.push({
        month: date.toISOString().substring(0, 7), // YYYY-MM format
        total_referrals: monthReferrals.length,
        successful_referrals: monthReferrals.filter(r => r.status === 'qualified' || r.status === 'rewarded').length
      });
    }

    return {
      total_referrals: totalReferrals,
      successful_referrals: successfulReferrals,
      pending_referrals: pendingReferrals,
      conversion_rate: Math.round(conversionRate * 100) / 100,
      total_rewards_given: totalRewardsGiven,
      status_breakdown: statusBreakdown,
      monthly_trends: monthlyTrends,
      top_referrers: await getTopReferrers(barbershopId)
    };

  } catch (error) {
    console.error('Error calculating referral analytics:', error);
    return {
      total_referrals: 0,
      successful_referrals: 0,
      pending_referrals: 0,
      conversion_rate: 0,
      total_rewards_given: 0,
      status_breakdown: {},
      error: 'Failed to calculate analytics'
    };
  }
}

/**
 * Helper function to get or create referral code for customer
 */
async function getOrCreateReferralCode(customerId, barbershopId) {
  try {
    // Check if customer already has an active referral code
    const { data: existingReferral, error: existingError } = await supabase
      .from('referral_tracking')
      .select('referral_code')
      .eq('referrer_customer_id', customerId)
      .eq('barbershop_id', barbershopId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let referralCode;
    if (!existingError && existingReferral) {
      referralCode = existingReferral.referral_code;
    } else {
      // Generate new code
      referralCode = await generateUniqueReferralCode(barbershopId);
    }

    // Get referral stats
    const { data: stats, error: statsError } = await supabase
      .from('referral_tracking')
      .select('status')
      .eq('referrer_customer_id', customerId)
      .eq('barbershop_id', barbershopId);

    const referralStats = {
      total_sent: stats?.length || 0,
      successful: stats?.filter(s => s.status === 'qualified' || s.status === 'rewarded').length || 0,
      pending: stats?.filter(s => ['sent', 'opened', 'clicked', 'signed_up'].includes(s.status)).length || 0
    };

    return {
      code: referralCode,
      link: generateReferralLink(referralCode, barbershopId),
      stats: referralStats
    };

  } catch (error) {
    console.error('Error getting referral code:', error);
    throw error;
  }
}

/**
 * Helper function to update referral status
 */
async function updateReferralStatus(referralId, newStatus, barbershopId, refereeCustomerId = null) {
  try {
    // Get current referral
    const { data: referral, error: referralError } = await supabase
      .from('referral_tracking')
      .select('*')
      .eq('id', referralId)
      .eq('barbershop_id', barbershopId)
      .single();

    if (referralError || !referral) {
      return { success: false, error: 'Referral not found' };
    }

    // Prepare update data
    const updateData = {
      status: newStatus,
      updated_at: new Date().toISOString()
    };

    // Add timestamp for status change
    const statusTimestamps = {
      'opened': 'opened_at',
      'clicked': 'clicked_at',
      'signed_up': 'signed_up_at',
      'first_visit': 'first_visit_at',
      'qualified': 'qualified_at'
    };

    if (statusTimestamps[newStatus]) {
      updateData[statusTimestamps[newStatus]] = new Date().toISOString();
    }

    // If referee customer ID provided, link it
    if (refereeCustomerId && !referral.referee_customer_id) {
      updateData.referee_customer_id = refereeCustomerId;
    }

    // Check if referral qualifies for rewards
    const qualified = await checkReferralQualification(referral, newStatus);
    if (qualified && !referral.referrer_reward_given) {
      await processReferralRewards(referral, barbershopId);
      updateData.referrer_reward_given = true;
      updateData.referee_reward_given = true;
      updateData.referrer_reward_given_at = new Date().toISOString();
      updateData.referee_reward_given_at = new Date().toISOString();
    }

    // Update referral
    const { data: updatedReferral, error: updateError } = await supabase
      .from('referral_tracking')
      .update(updateData)
      .eq('id', referralId)
      .select()
      .single();

    if (updateError) {
      return { success: false, error: 'Failed to update referral status' };
    }

    return {
      success: true,
      new_status: newStatus,
      qualified,
      rewards_processed: qualified && !referral.referrer_reward_given,
      updated_referral: updatedReferral
    };

  } catch (error) {
    console.error('Error updating referral status:', error);
    return { success: false, error: 'Internal error updating referral status' };
  }
}

/**
 * Helper function to claim referral reward
 */
async function claimReferralReward(referralCode, customerId, barbershopId) {
  try {
    // Find referral by code
    const { data: referral, error: referralError } = await supabase
      .from('referral_tracking')
      .select('*')
      .eq('referral_code', referralCode)
      .eq('barbershop_id', barbershopId)
      .single();

    if (referralError || !referral) {
      return { success: false, error: 'Invalid referral code' };
    }

    // Check if already claimed
    if (referral.referee_customer_id) {
      return { success: false, error: 'Referral already claimed' };
    }

    // Check if expired
    if (referral.expires_at && new Date(referral.expires_at) < new Date()) {
      return { success: false, error: 'Referral code has expired' };
    }

    // Update referral with customer ID and status
    const { error: updateError } = await supabase
      .from('referral_tracking')
      .update({
        referee_customer_id: customerId,
        status: 'signed_up',
        signed_up_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', referral.id);

    if (updateError) {
      return { success: false, error: 'Failed to claim referral' };
    }

    // Award referee signup bonus if configured
    if (referral.referee_reward_type === 'points' && referral.referee_reward_value) {
      await awardReferralPoints(
        customerId,
        referral.referee_reward_value,
        'signup_bonus',
        referral.id,
        barbershopId
      );
    }

    return {
      success: true,
      referral_id: referral.id,
      referrer_name: await getCustomerName(referral.referrer_customer_id),
      signup_bonus: referral.referee_reward_value
    };

  } catch (error) {
    console.error('Error claiming referral reward:', error);
    return { success: false, error: 'Internal error claiming referral' };
  }
}

/**
 * Helper function to process referral rewards
 */
async function processReferralRewards(referral, barbershopId) {
  try {
    // Award points to referrer
    if (referral.referrer_reward_type === 'points' && referral.referrer_reward_value) {
      await awardReferralPoints(
        referral.referrer_customer_id,
        referral.referrer_reward_value,
        'referral_reward',
        referral.id,
        barbershopId
      );
    }

    // Award points to referee if they have an account
    if (referral.referee_customer_id && referral.referee_reward_type === 'points' && referral.referee_reward_value) {
      await awardReferralPoints(
        referral.referee_customer_id,
        referral.referee_reward_value,
        'referral_bonus',
        referral.id,
        barbershopId
      );
    }

  } catch (error) {
    console.error('Error processing referral rewards:', error);
    throw error;
  }
}

/**
 * Helper function to award referral points
 */
async function awardReferralPoints(customerId, points, type, referralId, barbershopId) {
  try {
    // Get customer's active loyalty enrollment
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('loyalty_program_enrollments')
      .select('*')
      .eq('customer_id', customerId)
      .eq('barbershop_id', barbershopId)
      .eq('is_active', true)
      .limit(1)
      .single();

    if (enrollmentError || !enrollment) {
      console.log(`Customer ${customerId} not enrolled in loyalty program, skipping points award`);
      return;
    }

    const currentBalance = enrollment.current_points || 0;
    const newBalance = currentBalance + points;

    // Create points transaction
    const transactionData = {
      barbershop_id: barbershopId,
      customer_id: customerId,
      loyalty_program_id: enrollment.loyalty_program_id,
      transaction_type: 'bonus',
      points_amount: points,
      source_type: type,
      source_id: referralId,
      balance_before: currentBalance,
      balance_after: newBalance,
      processed_by_user_id: 'system',
      description: `${type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} points`,
      created_at: new Date().toISOString()
    };

    const { error: transactionError } = await supabase
      .from('loyalty_points')
      .insert(transactionData);

    if (transactionError) {
      console.error('Error creating points transaction:', transactionError);
      return;
    }

    // Update enrollment
    const { error: updateError } = await supabase
      .from('loyalty_program_enrollments')
      .update({
        current_points: newBalance,
        lifetime_points_earned: (enrollment.lifetime_points_earned || 0) + points,
        last_points_earned_date: new Date().toISOString().split('T')[0],
        last_activity_date: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString()
      })
      .eq('id', enrollment.id);

    if (updateError) {
      console.error('Error updating enrollment:', updateError);
    }

  } catch (error) {
    console.error('Error awarding referral points:', error);
    throw error;
  }
}

/**
 * Helper function to generate unique referral code
 */
async function generateUniqueReferralCode(barbershopId) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  
  for (let attempts = 0; attempts < 10; attempts++) {
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Check if code already exists
    const { data: existing, error } = await supabase
      .from('referral_tracking')
      .select('id')
      .eq('barbershop_id', barbershopId)
      .eq('referral_code', code)
      .single();

    if (error && error.code === 'PGRST116') { // No rows found
      return code;
    }
  }

  // Fallback to UUID-based code
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

/**
 * Helper function to generate referral link
 */
function generateReferralLink(referralCode, barbershopId) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://your-domain.com';
  return `${baseUrl}/book?ref=${referralCode}&shop=${barbershopId}`;
}

/**
 * Helper function to check referral qualification
 */
async function checkReferralQualification(referral, newStatus) {
  const qualificationRequirements = referral.qualification_requirements || {};
  
  // Default qualification is first visit
  if (newStatus === 'first_visit' && !qualificationRequirements.minimum_visits) {
    return true;
  }

  // Check if status indicates qualification
  if (newStatus === 'qualified') {
    return true;
  }

  // Check specific requirements
  if (qualificationRequirements.minimum_visits && newStatus === 'first_visit') {
    // Would need to check actual visit count
    return qualificationRequirements.minimum_visits <= 1;
  }

  return false;
}

/**
 * Helper function to get top referrers
 */
async function getTopReferrers(barbershopId) {
  try {
    const { data: referrals, error } = await supabase
      .from('referral_tracking')
      .select(`
        referrer_customer_id,
        status,
        customers!referrer_customer_id(first_name, last_name)
      `)
      .eq('barbershop_id', barbershopId);

    if (error || !referrals) {
      return [];
    }

    // Group by referrer and count successful referrals
    const referrerStats = referrals.reduce((stats, referral) => {
      const referrerId = referral.referrer_customer_id;
      if (!stats[referrerId]) {
        stats[referrerId] = {
          customer_id: referrerId,
          customer_name: referral.customers ? 
            `${referral.customers.first_name} ${referral.customers.last_name}` : 'Unknown',
          total_referrals: 0,
          successful_referrals: 0
        };
      }
      
      stats[referrerId].total_referrals++;
      if (referral.status === 'qualified' || referral.status === 'rewarded') {
        stats[referrerId].successful_referrals++;
      }
      
      return stats;
    }, {});

    // Convert to array and sort by successful referrals
    return Object.values(referrerStats)
      .sort((a, b) => b.successful_referrals - a.successful_referrals)
      .slice(0, 10); // Top 10

  } catch (error) {
    console.error('Error getting top referrers:', error);
    return [];
  }
}

/**
 * Helper function to get customer name
 */
async function getCustomerName(customerId) {
  try {
    const { data: customer, error } = await supabase
      .from('customers')
      .select('first_name, last_name')
      .eq('id', customerId)
      .single();

    if (error || !customer) {
      return 'Unknown Customer';
    }

    return `${customer.first_name} ${customer.last_name}`;

  } catch (error) {
    console.error('Error getting customer name:', error);
    return 'Unknown Customer';
  }
}

/**
 * Helper function to process pending referral rewards
 */
async function processPendingReferralRewards(barbershopId, dryRun) {
  try {
    // Find qualified referrals that haven't been rewarded
    const { data: pendingReferrals, error } = await supabase
      .from('referral_tracking')
      .select('*')
      .eq('barbershop_id', barbershopId)
      .eq('status', 'qualified')
      .eq('referrer_reward_given', false);

    if (error || !pendingReferrals) {
      return { processed_count: 0, error: 'Failed to fetch pending referrals' };
    }

    if (dryRun) {
      return {
        dry_run: true,
        pending_count: pendingReferrals.length,
        total_reward_value: pendingReferrals.reduce((sum, r) => 
          sum + (parseFloat(r.referrer_reward_value) || 0) + (parseFloat(r.referee_reward_value) || 0), 0
        )
      };
    }

    let processedCount = 0;
    for (const referral of pendingReferrals) {
      try {
        await processReferralRewards(referral, barbershopId);
        
        // Update referral as rewarded
        await supabase
          .from('referral_tracking')
          .update({
            referrer_reward_given: true,
            referee_reward_given: true,
            referrer_reward_given_at: new Date().toISOString(),
            referee_reward_given_at: new Date().toISOString(),
            status: 'rewarded',
            updated_at: new Date().toISOString()
          })
          .eq('id', referral.id);

        processedCount++;
      } catch (error) {
        console.error(`Failed to process referral ${referral.id}:`, error);
      }
    }

    return {
      dry_run: false,
      processed_count: processedCount,
      total_pending: pendingReferrals.length
    };

  } catch (error) {
    console.error('Error processing pending referral rewards:', error);
    return { processed_count: 0, error: 'Internal error processing rewards' };
  }
}

/**
 * Helper function to expire old referrals
 */
async function expireOldReferrals(barbershopId, daysOld, dryRun) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    // Find old pending referrals
    const { data: oldReferrals, error } = await supabase
      .from('referral_tracking')
      .select('*')
      .eq('barbershop_id', barbershopId)
      .in('status', ['sent', 'opened', 'clicked'])
      .lt('created_at', cutoffDate.toISOString());

    if (error || !oldReferrals) {
      return { expired_count: 0, error: 'Failed to fetch old referrals' };
    }

    if (dryRun) {
      return {
        dry_run: true,
        eligible_for_expiry: oldReferrals.length,
        cutoff_date: cutoffDate.toISOString()
      };
    }

    // Expire old referrals
    const { error: expireError } = await supabase
      .from('referral_tracking')
      .update({
        status: 'expired',
        updated_at: new Date().toISOString()
      })
      .eq('barbershop_id', barbershopId)
      .in('status', ['sent', 'opened', 'clicked'])
      .lt('created_at', cutoffDate.toISOString());

    if (expireError) {
      return { expired_count: 0, error: 'Failed to expire old referrals' };
    }

    return {
      dry_run: false,
      expired_count: oldReferrals.length,
      cutoff_date: cutoffDate.toISOString()
    };

  } catch (error) {
    console.error('Error expiring old referrals:', error);
    return { expired_count: 0, error: 'Internal error expiring referrals' };
  }
}