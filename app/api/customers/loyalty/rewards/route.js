/**
 * Loyalty Rewards API Route
 * Handles reward catalog, redemptions, and reward management
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
 * GET /api/customers/loyalty/rewards
 * Get available rewards catalog or redemption history
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
    const action = url.searchParams.get('action') || 'catalog';
    const programId = url.searchParams.get('program_id');
    const customerTier = url.searchParams.get('customer_tier');
    const customerId = url.searchParams.get('customer_id');
    const limit = parseInt(url.searchParams.get('limit')) || 50;
    const offset = parseInt(url.searchParams.get('offset')) || 0;
    const status = url.searchParams.get('status');

    if (action === 'catalog') {
      // Get available rewards catalog
      const rewards = await getAvailableRewards(barbershopId, programId, customerTier);
      
      return NextResponse.json({ 
        success: true, 
        rewards,
        barbershop_id: barbershopId
      });

    } else if (action === 'redemptions') {
      // Get redemption history
      let query = supabase
        .from('reward_redemptions')
        .select(`
          *,
          customers!inner(first_name, last_name, email)
        `)
        .eq('barbershop_id', barbershopId)
        .order('redeemed_at', { ascending: false });

      if (customerId) {
        query = query.eq('customer_id', customerId);
      }

      if (status) {
        query = query.eq('status', status);
      }

      // Get total count
      const { count } = await query.select('*', { count: 'exact', head: true });

      // Get paginated results
      const { data: redemptions, error: redemptionsError } = await query
        .range(offset, offset + limit - 1);

      if (redemptionsError) {
        console.error('Error fetching redemption history:', redemptionsError);
        return NextResponse.json({ error: 'Failed to fetch redemption history' }, { status: 500 });
      }

      return NextResponse.json({ 
        success: true, 
        redemptions: redemptions || [],
        total_count: count || 0
      });
    }

    return NextResponse.json({ error: 'Invalid action parameter' }, { status: 400 });

  } catch (error) {
    console.error('Error in loyalty rewards API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/customers/loyalty/rewards
 * Redeem points for rewards
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
      reward_type,
      reward_name,
      reward_description,
      points_redeemed,
      monetary_value,
      discount_percentage,
      usage_restrictions = {},
      expires_days = 30
    } = body;

    // Validate required fields
    if (!customer_id || !loyalty_program_id || !reward_type || !reward_name || !points_redeemed || !monetary_value) {
      return NextResponse.json({ 
        error: 'Missing required fields: customer_id, loyalty_program_id, reward_type, reward_name, points_redeemed, monetary_value' 
      }, { status: 400 });
    }

    if (points_redeemed <= 0) {
      return NextResponse.json({ error: 'points_redeemed must be greater than 0' }, { status: 400 });
    }

    // Check customer enrollment and balance
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

    if (enrollment.current_points < points_redeemed) {
      return NextResponse.json({ 
        error: 'Insufficient points balance',
        current_balance: enrollment.current_points,
        required_points: points_redeemed
      }, { status: 400 });
    }

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expires_days);

    // Generate redemption code
    const redemptionCode = generateRedemptionCode();

    // Create redemption record
    const redemptionData = {
      barbershop_id: barbershopId,
      customer_id,
      loyalty_program_id,
      reward_type,
      reward_name,
      reward_description,
      points_redeemed,
      monetary_value,
      discount_percentage,
      redemption_code,
      redeemed_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
      status: 'active',
      usage_restrictions,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: redemption, error: redemptionError } = await supabase
      .from('reward_redemptions')
      .insert(redemptionData)
      .select()
      .single();

    if (redemptionError) {
      console.error('Error creating reward redemption:', redemptionError);
      return NextResponse.json({ error: 'Failed to create reward redemption' }, { status: 500 });
    }

    // Create points deduction transaction
    const transactionData = {
      barbershop_id: barbershopId,
      customer_id,
      loyalty_program_id,
      transaction_type: 'redeemed',
      points_amount: -points_redeemed,
      source_type: 'reward_redemption',
      source_id: redemption.id,
      redemption_value: monetary_value,
      redemption_type: reward_type,
      balance_before: enrollment.current_points,
      balance_after: enrollment.current_points - points_redeemed,
      processed_by_user_id: user.id,
      description: `Redeemed: ${reward_name}`,
      created_at: new Date().toISOString()
    };

    const { error: transactionError } = await supabase
      .from('loyalty_points')
      .insert(transactionData);

    if (transactionError) {
      console.error('Error creating points transaction:', transactionError);
      // Rollback redemption
      await supabase
        .from('reward_redemptions')
        .delete()
        .eq('id', redemption.id);
      
      return NextResponse.json({ error: 'Failed to process points deduction' }, { status: 500 });
    }

    // Update customer enrollment
    const newBalance = enrollment.current_points - points_redeemed;
    const { error: updateError } = await supabase
      .from('loyalty_program_enrollments')
      .update({
        current_points: newBalance,
        lifetime_points_redeemed: (enrollment.lifetime_points_redeemed || 0) + points_redeemed,
        last_redemption_date: new Date().toISOString().split('T')[0],
        last_activity_date: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString()
      })
      .eq('id', enrollment.id);

    if (updateError) {
      console.error('Error updating enrollment:', updateError);
      // Note: Transaction was created but enrollment update failed
      // In production, you might want to implement compensation logic
    }

    return NextResponse.json({ 
      success: true, 
      redemption,
      redemption_code: redemptionCode,
      remaining_balance: newBalance,
      expires_at: expiresAt.toISOString(),
      message: 'Reward redeemed successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Error redeeming reward:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/customers/loyalty/rewards
 * Update redemption status (use, cancel, etc.)
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
    const { redemption_id, new_status, applied_to_appointment_id, applied_to_transaction_id, cancellation_reason } = body;

    if (!redemption_id || !new_status) {
      return NextResponse.json({ 
        error: 'Missing required fields: redemption_id, new_status' 
      }, { status: 400 });
    }

    const validStatuses = ['active', 'used', 'expired', 'cancelled'];
    if (!validStatuses.includes(new_status)) {
      return NextResponse.json({ 
        error: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
      }, { status: 400 });
    }

    // Get redemption record
    const { data: redemption, error: redemptionError } = await supabase
      .from('reward_redemptions')
      .select('*')
      .eq('id', redemption_id)
      .eq('barbershop_id', barbershopId)
      .single();

    if (redemptionError || !redemption) {
      return NextResponse.json({ error: 'Redemption not found' }, { status: 404 });
    }

    // Prepare update data
    const updateData = {
      status: new_status,
      updated_at: new Date().toISOString()
    };

    if (new_status === 'used') {
      updateData.used_at = new Date().toISOString();
      updateData.applied_by_user_id = user.id;
      
      if (applied_to_appointment_id) {
        updateData.applied_to_appointment_id = applied_to_appointment_id;
      }
      
      if (applied_to_transaction_id) {
        updateData.applied_to_transaction_id = applied_to_transaction_id;
      }
    } else if (new_status === 'cancelled') {
      updateData.cancelled_at = new Date().toISOString();
      updateData.cancellation_reason = cancellation_reason;
      
      // If cancelling, refund points
      await refundRedemptionPoints(redemption, barbershopId, user.id);
    }

    // Update redemption
    const { data: updatedRedemption, error: updateError } = await supabase
      .from('reward_redemptions')
      .update(updateData)
      .eq('id', redemption_id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating redemption:', updateError);
      return NextResponse.json({ error: 'Failed to update redemption' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      redemption: updatedRedemption,
      message: `Redemption status updated to ${new_status}`
    });

  } catch (error) {
    console.error('Error updating redemption:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Helper function to get available rewards from loyalty programs
 */
async function getAvailableRewards(barbershopId, programId, customerTier) {
  try {
    // Get loyalty programs
    let query = supabase
      .from('loyalty_programs')
      .select('*')
      .eq('barbershop_id', barbershopId)
      .eq('is_active', true);

    if (programId) {
      query = query.eq('id', programId);
    }

    const { data: programs, error: programsError } = await query;

    if (programsError || !programs) {
      return [];
    }

    const rewards = [];

    // Extract rewards from program redemption rules
    for (const program of programs) {
      const redemptionRules = program.redemption_rules || {};
      const redemptionOptions = redemptionRules.redemption_options || [];

      for (const option of redemptionOptions) {
        const reward = {
          program_id: program.id,
          program_name: program.program_name,
          points_required: option.points || 0,
          reward_type: determineRewardType(option.reward || ''),
          reward_name: option.reward || '',
          description: option.description || '',
          terms: option.terms || '',
          available_for_tier: option.tier_requirement || 'all',
          monetary_value: option.monetary_value || 0,
          discount_percentage: option.discount_percentage || null,
          category: option.category || 'general',
          is_featured: option.is_featured || false,
          image_url: option.image_url || null,
          usage_restrictions: option.usage_restrictions || {}
        };

        // Filter by customer tier if provided
        if (customerTier && reward.available_for_tier !== 'all') {
          if (Array.isArray(reward.available_for_tier)) {
            if (!reward.available_for_tier.includes(customerTier)) {
              continue;
            }
          } else if (customerTier !== reward.available_for_tier) {
            continue;
          }
        }

        rewards.push(reward);
      }
    }

    // Sort by points required (ascending)
    return rewards.sort((a, b) => a.points_required - b.points_required);

  } catch (error) {
    console.error('Error getting available rewards:', error);
    return [];
  }
}

/**
 * Helper function to determine reward type from reward string
 */
function determineRewardType(rewardString) {
  const reward = rewardString.toLowerCase();
  
  if (reward.includes('discount') || reward.includes('%')) {
    return 'discount';
  } else if (reward.includes('free')) {
    return 'free_service';
  } else if (reward.includes('product')) {
    return 'product';
  } else if (reward.includes('cash') || reward.includes('$')) {
    return 'cash_back';
  } else if (reward.includes('priority') || reward.includes('booking')) {
    return 'priority_booking';
  } else if (reward.includes('exclusive') || reward.includes('access')) {
    return 'exclusive_access';
  }
  
  return 'other';
}

/**
 * Helper function to generate unique redemption code
 */
function generateRedemptionCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Helper function to refund points when redemption is cancelled
 */
async function refundRedemptionPoints(redemption, barbershopId, userId) {
  try {
    // Get current enrollment
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('loyalty_program_enrollments')
      .select('current_points')
      .eq('customer_id', redemption.customer_id)
      .eq('loyalty_program_id', redemption.loyalty_program_id)
      .eq('barbershop_id', barbershopId)
      .single();

    if (enrollmentError || !enrollment) {
      console.error('Error getting enrollment for refund:', enrollmentError);
      return;
    }

    const currentBalance = enrollment.current_points || 0;
    const refundAmount = redemption.points_redeemed;
    const newBalance = currentBalance + refundAmount;

    // Create refund transaction
    const refundTransactionData = {
      barbershop_id: barbershopId,
      customer_id: redemption.customer_id,
      loyalty_program_id: redemption.loyalty_program_id,
      transaction_type: 'adjusted',
      points_amount: refundAmount,
      source_type: 'redemption_refund',
      source_id: redemption.id,
      balance_before: currentBalance,
      balance_after: newBalance,
      processed_by_user_id: userId,
      description: `Refund for cancelled redemption: ${redemption.reward_name}`,
      created_at: new Date().toISOString()
    };

    const { error: transactionError } = await supabase
      .from('loyalty_points')
      .insert(refundTransactionData);

    if (transactionError) {
      console.error('Error creating refund transaction:', transactionError);
      return;
    }

    // Update enrollment with refunded points
    const { error: updateError } = await supabase
      .from('loyalty_program_enrollments')
      .update({
        current_points: newBalance,
        lifetime_points_redeemed: Math.max(0, (enrollment.lifetime_points_redeemed || 0) - refundAmount),
        last_activity_date: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString()
      })
      .eq('customer_id', redemption.customer_id)
      .eq('loyalty_program_id', redemption.loyalty_program_id)
      .eq('barbershop_id', barbershopId);

    if (updateError) {
      console.error('Error updating enrollment for refund:', updateError);
    }

  } catch (error) {
    console.error('Error processing refund:', error);
  }
}