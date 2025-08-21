/**
 * Loyalty Points API Route
 * Handles points transactions, balance queries, and point management
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
 * GET /api/customers/loyalty/points
 * Get customer points balance or transaction history
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
    const customerId = url.searchParams.get('customer_id');
    const programId = url.searchParams.get('program_id');
    const action = url.searchParams.get('action') || 'balance';
    const limit = parseInt(url.searchParams.get('limit')) || 50;
    const offset = parseInt(url.searchParams.get('offset')) || 0;
    const transactionType = url.searchParams.get('transaction_type');

    if (!customerId) {
      return NextResponse.json({ error: 'customer_id parameter required' }, { status: 400 });
    }

    if (action === 'balance') {
      // Get customer points balance
      let query = supabase
        .from('loyalty_program_enrollments')
        .select(`
          *,
          loyalty_programs!inner(program_name, program_type)
        `)
        .eq('customer_id', customerId)
        .eq('barbershop_id', barbershopId)
        .eq('is_active', true);

      if (programId) {
        query = query.eq('loyalty_program_id', programId);
      }

      const { data: enrollments, error: balanceError } = await query;

      if (balanceError) {
        console.error('Error fetching points balance:', balanceError);
        return NextResponse.json({ error: 'Failed to fetch points balance' }, { status: 500 });
      }

      if (!enrollments || enrollments.length === 0) {
        return NextResponse.json({ 
          error: 'Customer not enrolled in loyalty program' 
        }, { status: 404 });
      }

      // Calculate tier progress for each enrollment
      const enrichedEnrollments = await Promise.all(
        enrollments.map(async (enrollment) => {
          const tierProgress = await calculateTierProgress(enrollment, barbershopId);
          return {
            ...enrollment,
            ...tierProgress
          };
        })
      );

      return NextResponse.json({ 
        success: true, 
        balances: programId ? enrichedEnrollments[0] : enrichedEnrollments
      });

    } else if (action === 'history') {
      // Get points transaction history
      let query = supabase
        .from('loyalty_points')
        .select('*')
        .eq('customer_id', customerId)
        .eq('barbershop_id', barbershopId)
        .order('created_at', { ascending: false });

      if (programId) {
        query = query.eq('loyalty_program_id', programId);
      }

      if (transactionType) {
        query = query.eq('transaction_type', transactionType);
      }

      // Get total count first
      const { count } = await query.select('*', { count: 'exact', head: true });

      // Get paginated results
      const { data: transactions, error: historyError } = await query
        .range(offset, offset + limit - 1);

      if (historyError) {
        console.error('Error fetching points history:', historyError);
        return NextResponse.json({ error: 'Failed to fetch points history' }, { status: 500 });
      }

      // Calculate summary
      const summary = await calculatePointsSummary(customerId, barbershopId, programId);

      return NextResponse.json({ 
        success: true, 
        transactions: transactions || [],
        total_count: count || 0,
        summary
      });
    }

    return NextResponse.json({ error: 'Invalid action parameter' }, { status: 400 });

  } catch (error) {
    console.error('Error in loyalty points API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/customers/loyalty/points
 * Process points transactions (earn, redeem, adjust)
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

    const barbershopId = barbershops.id;
    const body = await request.json();

    const {
      customer_id,
      loyalty_program_id,
      transaction_type,
      points_amount,
      source_type,
      source_id,
      earning_rate,
      base_amount,
      multiplier = 1.0,
      redemption_value,
      redemption_type,
      description,
      metadata = {}
    } = body;

    // Validate required fields
    if (!customer_id || !loyalty_program_id || !transaction_type || points_amount === undefined) {
      return NextResponse.json({ 
        error: 'Missing required fields: customer_id, loyalty_program_id, transaction_type, points_amount' 
      }, { status: 400 });
    }

    // Validate transaction type
    const validTypes = ['earned', 'redeemed', 'expired', 'adjusted', 'bonus'];
    if (!validTypes.includes(transaction_type)) {
      return NextResponse.json({ 
        error: 'Invalid transaction_type. Must be one of: ' + validTypes.join(', ')
      }, { status: 400 });
    }

    // Get customer enrollment
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('loyalty_program_enrollments')
      .select('*')
      .eq('customer_id', customer_id)
      .eq('loyalty_program_id', loyalty_program_id)
      .eq('barbershop_id', barbershopId)
      .eq('is_active', true)
      .single();

    if (enrollmentError || !enrollment) {
      return NextResponse.json({ 
        error: 'Customer not enrolled in loyalty program' 
      }, { status: 404 });
    }

    // Check sufficient balance for redemptions
    if (transaction_type === 'redeemed' && enrollment.current_points < Math.abs(points_amount)) {
      return NextResponse.json({ 
        error: 'Insufficient points balance' 
      }, { status: 400 });
    }

    // Get program details for expiration calculation
    const { data: program, error: programError } = await supabase
      .from('loyalty_programs')
      .select('*')
      .eq('id', loyalty_program_id)
      .single();

    if (programError || !program) {
      return NextResponse.json({ error: 'Loyalty program not found' }, { status: 404 });
    }

    // Calculate expiration date for earned points
    let expiresAt = null;
    if ((transaction_type === 'earned' || transaction_type === 'bonus') && program.points_expiration_months) {
      const expireDate = new Date();
      expireDate.setMonth(expireDate.getMonth() + program.points_expiration_months);
      expiresAt = expireDate.toISOString();
    }

    // Calculate new balance
    const currentBalance = enrollment.current_points || 0;
    const newBalance = currentBalance + points_amount;

    // Create points transaction
    const transactionData = {
      barbershop_id: barbershopId,
      customer_id,
      loyalty_program_id,
      transaction_type,
      points_amount,
      source_type,
      source_id,
      earning_rate,
      base_amount,
      multiplier,
      redemption_value,
      redemption_type,
      expires_at: expiresAt,
      balance_before: currentBalance,
      balance_after: newBalance,
      processed_by_user_id: user.id,
      description,
      metadata,
      created_at: new Date().toISOString()
    };

    const { data: transaction, error: transactionError } = await supabase
      .from('loyalty_points')
      .insert(transactionData)
      .select()
      .single();

    if (transactionError) {
      console.error('Error creating points transaction:', transactionError);
      return NextResponse.json({ error: 'Failed to create points transaction' }, { status: 500 });
    }

    // Update enrollment with new balance and activity dates
    const enrollmentUpdate = {
      current_points: newBalance,
      last_activity_date: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString()
    };

    if (transaction_type === 'earned' || transaction_type === 'bonus') {
      enrollmentUpdate.last_points_earned_date = new Date().toISOString().split('T')[0];
      enrollmentUpdate.lifetime_points_earned = (enrollment.lifetime_points_earned || 0) + points_amount;
    } else if (transaction_type === 'redeemed') {
      enrollmentUpdate.last_redemption_date = new Date().toISOString().split('T')[0];
      enrollmentUpdate.lifetime_points_redeemed = (enrollment.lifetime_points_redeemed || 0) + Math.abs(points_amount);
    }

    const { error: updateError } = await supabase
      .from('loyalty_program_enrollments')
      .update(enrollmentUpdate)
      .eq('id', enrollment.id);

    if (updateError) {
      console.error('Error updating enrollment:', updateError);
      // Transaction was created but enrollment update failed
      // In production, you might want to implement compensation/rollback logic
    }

    // Check for tier upgrade
    const tierUpgrade = await checkTierUpgrade(customer_id, loyalty_program_id, barbershopId, newBalance);

    return NextResponse.json({ 
      success: true, 
      transaction,
      new_balance: newBalance,
      tier_upgraded: tierUpgrade.upgraded,
      new_tier: tierUpgrade.new_tier,
      message: 'Points transaction processed successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Error processing points transaction:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Helper function to calculate tier progress
 */
async function calculateTierProgress(enrollment, barbershopId) {
  try {
    const { data: tiers, error } = await supabase
      .from('loyalty_tiers')
      .select('*')
      .eq('barbershop_id', barbershopId)
      .eq('loyalty_program_id', enrollment.loyalty_program_id)
      .eq('is_active', true)
      .order('tier_level');

    if (error || !tiers || tiers.length === 0) {
      return {
        tier_progress: 0,
        next_tier_threshold: null,
        points_to_next_tier: null
      };
    }

    const currentPoints = enrollment.current_points || 0;
    const currentTier = enrollment.current_tier;

    // Find current tier level
    let currentTierLevel = 0;
    if (currentTier) {
      const tierObj = tiers.find(t => t.tier_name === currentTier);
      if (tierObj) {
        currentTierLevel = tierObj.tier_level;
      }
    }

    // Find next tier
    const nextTier = tiers.find(t => t.tier_level === currentTierLevel + 1);
    if (!nextTier) {
      return {
        tier_progress: 100,
        next_tier_threshold: null,
        points_to_next_tier: 0
      };
    }

    // Calculate progress
    const nextTierPoints = nextTier.qualification_criteria?.points_required || 0;
    const currentTierPoints = currentTierLevel > 0 ? 
      (tiers.find(t => t.tier_level === currentTierLevel)?.qualification_criteria?.points_required || 0) : 0;

    const pointsNeeded = nextTierPoints - currentTierPoints;
    const pointsProgress = Math.max(0, currentPoints - currentTierPoints);
    const progressPercentage = pointsNeeded > 0 ? Math.min(100, (pointsProgress / pointsNeeded) * 100) : 100;

    return {
      tier_progress: Math.round(progressPercentage * 100) / 100,
      next_tier_threshold: nextTierPoints,
      points_to_next_tier: Math.max(0, nextTierPoints - currentPoints)
    };

  } catch (error) {
    console.error('Error calculating tier progress:', error);
    return {
      tier_progress: 0,
      next_tier_threshold: null,
      points_to_next_tier: null
    };
  }
}

/**
 * Helper function to calculate points summary
 */
async function calculatePointsSummary(customerId, barbershopId, programId) {
  try {
    let query = supabase
      .from('loyalty_points')
      .select('points_amount, transaction_type')
      .eq('customer_id', customerId)
      .eq('barbershop_id', barbershopId);

    if (programId) {
      query = query.eq('loyalty_program_id', programId);
    }

    const { data: transactions, error } = await query;

    if (error || !transactions) {
      return {
        total_earned: 0,
        total_redeemed: 0,
        net_points: 0,
        transaction_count: 0
      };
    }

    const totalEarned = transactions
      .filter(t => t.points_amount > 0)
      .reduce((sum, t) => sum + t.points_amount, 0);

    const totalRedeemed = Math.abs(transactions
      .filter(t => t.points_amount < 0)
      .reduce((sum, t) => sum + t.points_amount, 0));

    return {
      total_earned: totalEarned,
      total_redeemed: totalRedeemed,
      net_points: totalEarned - totalRedeemed,
      transaction_count: transactions.length
    };

  } catch (error) {
    console.error('Error calculating points summary:', error);
    return {
      total_earned: 0,
      total_redeemed: 0,
      net_points: 0,
      transaction_count: 0
    };
  }
}

/**
 * Helper function to check and process tier upgrades
 */
async function checkTierUpgrade(customerId, programId, barbershopId, newBalance) {
  try {
    // Get customer's current tier
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('loyalty_program_enrollments')
      .select('current_tier')
      .eq('customer_id', customerId)
      .eq('loyalty_program_id', programId)
      .eq('barbershop_id', barbershopId)
      .single();

    if (enrollmentError || !enrollment) {
      return { upgraded: false };
    }

    // Get available tiers
    const { data: tiers, error: tiersError } = await supabase
      .from('loyalty_tiers')
      .select('*')
      .eq('barbershop_id', barbershopId)
      .eq('loyalty_program_id', programId)
      .eq('is_active', true)
      .order('tier_level');

    if (tiersError || !tiers || tiers.length === 0) {
      return { upgraded: false };
    }

    // Find current tier level
    let currentTierLevel = 0;
    if (enrollment.current_tier) {
      const currentTierObj = tiers.find(t => t.tier_name === enrollment.current_tier);
      if (currentTierObj) {
        currentTierLevel = currentTierObj.tier_level;
      }
    }

    // Find highest eligible tier
    let highestEligibleTier = null;
    for (const tier of tiers) {
      if (tier.tier_level > currentTierLevel) {
        const pointsRequired = tier.qualification_criteria?.points_required || 0;
        if (newBalance >= pointsRequired) {
          highestEligibleTier = tier;
        }
      }
    }

    // Upgrade if eligible
    if (highestEligibleTier) {
      const { error: upgradeError } = await supabase
        .from('loyalty_program_enrollments')
        .update({
          current_tier: highestEligibleTier.tier_name,
          tier_progress: 0, // Reset progress for new tier
          updated_at: new Date().toISOString()
        })
        .eq('customer_id', customerId)
        .eq('loyalty_program_id', programId)
        .eq('barbershop_id', barbershopId);

      if (upgradeError) {
        console.error('Error upgrading tier:', upgradeError);
        return { upgraded: false };
      }

      // Create milestone for tier upgrade
      await createTierUpgradeMilestone(customerId, barbershopId, highestEligibleTier.tier_name);

      return {
        upgraded: true,
        new_tier: highestEligibleTier.tier_name,
        tier_level: highestEligibleTier.tier_level
      };
    }

    return { upgraded: false };

  } catch (error) {
    console.error('Error checking tier upgrade:', error);
    return { upgraded: false };
  }
}

/**
 * Helper function to create tier upgrade milestone
 */
async function createTierUpgradeMilestone(customerId, barbershopId, tierName) {
  try {
    const milestoneData = {
      barbershop_id: barbershopId,
      customer_id: customerId,
      milestone_type: 'tier_upgrade',
      milestone_name: `Achieved ${tierName} Tier`,
      milestone_description: `Customer upgraded to ${tierName} tier`,
      achieved_at: new Date().toISOString(),
      achievement_method: 'automatic',
      is_celebrated: false,
      importance_level: 3,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await supabase
      .from('customer_milestones')
      .insert(milestoneData);

  } catch (error) {
    console.error('Error creating tier upgrade milestone:', error);
  }
}