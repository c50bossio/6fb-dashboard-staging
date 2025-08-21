/**
 * Loyalty System Integrations API Route
 * Handles integration with appointments, payments, and other systems
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
 * POST /api/customers/loyalty/integrations
 * Handle various integration events
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { event_type, data } = body;

    if (!event_type || !data) {
      return NextResponse.json({ 
        error: 'Missing required fields: event_type, data' 
      }, { status: 400 });
    }

    let result;

    switch (event_type) {
      case 'appointment_completed':
        result = await handleAppointmentCompleted(data);
        break;
      
      case 'appointment_cancelled':
        result = await handleAppointmentCancelled(data);
        break;
      
      case 'payment_completed':
        result = await handlePaymentCompleted(data);
        break;
      
      case 'review_submitted':
        result = await handleReviewSubmitted(data);
        break;
      
      case 'customer_signup':
        result = await handleCustomerSignup(data);
        break;
      
      case 'referral_signup':
        result = await handleReferralSignup(data);
        break;
      
      case 'birthday_bonus':
        result = await handleBirthdayBonus(data);
        break;
      
      case 'special_promotion':
        result = await handleSpecialPromotion(data);
        break;
      
      default:
        return NextResponse.json({ 
          error: `Unknown event type: ${event_type}` 
        }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true, 
      event_type,
      ...result
    });

  } catch (error) {
    console.error('Error processing loyalty integration:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Handle appointment completion - award base points
 */
async function handleAppointmentCompleted(data) {
  try {
    const { appointment_id, customer_id, barbershop_id, service_amount, services } = data;

    if (!appointment_id || !customer_id || !barbershop_id || !service_amount) {
      throw new Error('Missing required appointment data');
    }

    // Get customer's active loyalty enrollments
    const { data: enrollments, error: enrollmentError } = await supabase
      .from('loyalty_program_enrollments')
      .select(`
        *,
        loyalty_programs!inner(*)
      `)
      .eq('customer_id', customer_id)
      .eq('barbershop_id', barbershop_id)
      .eq('is_active', true);

    if (enrollmentError || !enrollments || enrollments.length === 0) {
      return { points_awarded: 0, message: 'Customer not enrolled in loyalty program' };
    }

    let totalPointsAwarded = 0;
    const transactions = [];

    // Process each enrollment
    for (const enrollment of enrollments) {
      const program = enrollment.loyalty_programs;
      
      if (!program.is_active) continue;

      // Calculate points based on earning rules
      const earningRules = program.earning_rules || {};
      const pointsPerDollar = earningRules.points_per_dollar || 1;
      const bonusMultipliers = earningRules.bonus_multipliers || {};

      // Base points calculation
      const basePoints = Math.floor(parseFloat(service_amount) * pointsPerDollar);

      // Apply tier multiplier if customer has a tier
      let tierMultiplier = 1.0;
      if (enrollment.current_tier) {
        const { data: tiers } = await supabase
          .from('loyalty_tiers')
          .select('*')
          .eq('barbershop_id', barbershop_id)
          .eq('loyalty_program_id', enrollment.loyalty_program_id)
          .eq('tier_name', enrollment.current_tier)
          .single();

        if (tiers) {
          const tierBenefits = tiers.benefits || {};
          tierMultiplier = tierBenefits.point_multiplier || 1.0;
        }
      }

      // Apply service-specific bonuses
      let serviceMultiplier = 1.0;
      if (services && Array.isArray(services)) {
        // Check if any service qualifies for bonus
        const premiumServices = earningRules.premium_services || [];
        const hasPremiumService = services.some(service => 
          premiumServices.includes(service.service_name?.toLowerCase())
        );
        
        if (hasPremiumService) {
          serviceMultiplier = bonusMultipliers.premium_service || 1.2;
        }
      }

      // Calculate final points
      let finalPoints = Math.floor(basePoints * tierMultiplier * serviceMultiplier);

      // Apply transaction limits
      if (program.max_points_per_transaction && finalPoints > program.max_points_per_transaction) {
        finalPoints = program.max_points_per_transaction;
      }

      // Award points if any earned
      if (finalPoints > 0) {
        const result = await awardLoyaltyPoints({
          customer_id,
          loyalty_program_id: enrollment.loyalty_program_id,
          barbershop_id,
          points_amount: finalPoints,
          source_type: 'appointment',
          source_id: appointment_id,
          earning_rate: pointsPerDollar,
          base_amount: service_amount,
          multiplier: tierMultiplier * serviceMultiplier,
          description: 'Points earned from appointment completion'
        });

        if (result.success) {
          totalPointsAwarded += finalPoints;
          transactions.push(result.transaction);
        }
      }
    }

    // Check for milestone achievements
    await checkAndCreateMilestones(customer_id, barbershop_id, 'appointment_completed', {
      service_amount: parseFloat(service_amount),
      points_awarded: totalPointsAwarded
    });

    return {
      points_awarded: totalPointsAwarded,
      transactions,
      appointment_id
    };

  } catch (error) {
    console.error('Error handling appointment completion:', error);
    throw error;
  }
}

/**
 * Handle appointment cancellation - may deduct points if configured
 */
async function handleAppointmentCancelled(data) {
  try {
    const { appointment_id, customer_id, barbershop_id, cancellation_reason, advance_notice_hours } = data;

    // Check if points should be deducted for late cancellations
    const { data: programs } = await supabase
      .from('loyalty_programs')
      .select('*')
      .eq('barbershop_id', barbershop_id)
      .eq('is_active', true);

    if (!programs || programs.length === 0) {
      return { points_deducted: 0, message: 'No active loyalty programs' };
    }

    let totalPointsDeducted = 0;

    for (const program of programs) {
      const earningRules = program.earning_rules || {};
      const penaltyRules = earningRules.cancellation_penalties || {};

      // Check if cancellation qualifies for penalty
      const minAdvanceNotice = penaltyRules.minimum_advance_notice_hours || 24;
      const penaltyPoints = penaltyRules.late_cancellation_penalty || 0;

      if (advance_notice_hours < minAdvanceNotice && penaltyPoints > 0) {
        // Get customer enrollment
        const { data: enrollment } = await supabase
          .from('loyalty_program_enrollments')
          .select('*')
          .eq('customer_id', customer_id)
          .eq('loyalty_program_id', program.id)
          .eq('barbershop_id', barbershop_id)
          .eq('is_active', true)
          .single();

        if (enrollment && enrollment.current_points >= penaltyPoints) {
          // Deduct penalty points
          const result = await awardLoyaltyPoints({
            customer_id,
            loyalty_program_id: program.id,
            barbershop_id,
            points_amount: -penaltyPoints,
            source_type: 'cancellation_penalty',
            source_id: appointment_id,
            description: `Late cancellation penalty (${advance_notice_hours}h notice)`
          });

          if (result.success) {
            totalPointsDeducted += penaltyPoints;
          }
        }
      }
    }

    return {
      points_deducted: totalPointsDeducted,
      cancellation_reason,
      advance_notice_hours
    };

  } catch (error) {
    console.error('Error handling appointment cancellation:', error);
    throw error;
  }
}

/**
 * Handle payment completion - may award bonus points
 */
async function handlePaymentCompleted(data) {
  try {
    const { payment_id, customer_id, barbershop_id, amount, payment_method, appointment_id } = data;

    // Get active loyalty programs
    const { data: enrollments } = await supabase
      .from('loyalty_program_enrollments')
      .select(`
        *,
        loyalty_programs!inner(*)
      `)
      .eq('customer_id', customer_id)
      .eq('barbershop_id', barbershop_id)
      .eq('is_active', true);

    if (!enrollments || enrollments.length === 0) {
      return { bonus_points: 0, message: 'Customer not enrolled in loyalty program' };
    }

    let totalBonusPoints = 0;

    for (const enrollment of enrollments) {
      const program = enrollment.loyalty_programs;
      const earningRules = program.earning_rules || {};
      const bonusMultipliers = earningRules.bonus_multipliers || {};

      // Payment method bonuses
      let paymentBonus = 0;
      if (payment_method === 'card' && bonusMultipliers.card_payment) {
        paymentBonus = Math.floor(parseFloat(amount) * bonusMultipliers.card_payment);
      } else if (payment_method === 'cash' && bonusMultipliers.cash_payment) {
        paymentBonus = Math.floor(parseFloat(amount) * bonusMultipliers.cash_payment);
      }

      // Large payment bonuses
      const largePaymentThreshold = earningRules.large_payment_threshold || 100;
      if (parseFloat(amount) >= largePaymentThreshold && bonusMultipliers.large_payment) {
        paymentBonus += Math.floor(parseFloat(amount) * bonusMultipliers.large_payment);
      }

      if (paymentBonus > 0) {
        const result = await awardLoyaltyPoints({
          customer_id,
          loyalty_program_id: enrollment.loyalty_program_id,
          barbershop_id,
          points_amount: paymentBonus,
          source_type: 'payment_bonus',
          source_id: payment_id,
          description: `Payment bonus (${payment_method})`
        });

        if (result.success) {
          totalBonusPoints += paymentBonus;
        }
      }
    }

    return {
      bonus_points: totalBonusPoints,
      payment_method,
      amount: parseFloat(amount)
    };

  } catch (error) {
    console.error('Error handling payment completion:', error);
    throw error;
  }
}

/**
 * Handle review submission - award review bonus points
 */
async function handleReviewSubmitted(data) {
  try {
    const { review_id, customer_id, barbershop_id, rating, appointment_id } = data;

    if (!rating || rating < 1 || rating > 5) {
      return { bonus_points: 0, message: 'Invalid rating' };
    }

    // Get active loyalty programs
    const { data: enrollments } = await supabase
      .from('loyalty_program_enrollments')
      .select(`
        *,
        loyalty_programs!inner(*)
      `)
      .eq('customer_id', customer_id)
      .eq('barbershop_id', barbershop_id)
      .eq('is_active', true);

    if (!enrollments || enrollments.length === 0) {
      return { bonus_points: 0, message: 'Customer not enrolled in loyalty program' };
    }

    let totalBonusPoints = 0;

    for (const enrollment of enrollments) {
      const program = enrollment.loyalty_programs;
      const earningRules = program.earning_rules || {};
      const bonusMultipliers = earningRules.bonus_multipliers || {};

      // Base review bonus
      let reviewBonus = bonusMultipliers.review_bonus || 50;

      // Rating-based multiplier
      if (rating >= 5) {
        reviewBonus = Math.floor(reviewBonus * (bonusMultipliers.excellent_review_multiplier || 1.5));
      } else if (rating >= 4) {
        reviewBonus = Math.floor(reviewBonus * (bonusMultipliers.good_review_multiplier || 1.2));
      }

      if (reviewBonus > 0) {
        const result = await awardLoyaltyPoints({
          customer_id,
          loyalty_program_id: enrollment.loyalty_program_id,
          barbershop_id,
          points_amount: reviewBonus,
          source_type: 'review',
          source_id: review_id,
          description: `Bonus points for ${rating}-star review`
        });

        if (result.success) {
          totalBonusPoints += reviewBonus;
        }
      }
    }

    // Create milestone for review submission
    await checkAndCreateMilestones(customer_id, barbershop_id, 'review_submitted', {
      rating,
      points_awarded: totalBonusPoints
    });

    return {
      bonus_points: totalBonusPoints,
      rating,
      review_id
    };

  } catch (error) {
    console.error('Error handling review submission:', error);
    throw error;
  }
}

/**
 * Handle customer signup - award welcome bonus
 */
async function handleCustomerSignup(data) {
  try {
    const { customer_id, barbershop_id, signup_method, referral_code } = data;

    // Get active loyalty programs with auto-enroll enabled
    const { data: programs } = await supabase
      .from('loyalty_programs')
      .select('*')
      .eq('barbershop_id', barbershop_id)
      .eq('is_active', true)
      .eq('auto_enroll_new_customers', true);

    if (!programs || programs.length === 0) {
      return { enrolled: false, message: 'No auto-enroll loyalty programs available' };
    }

    const enrollments = [];
    let totalWelcomePoints = 0;

    // Auto-enroll customer in applicable programs
    for (const program of programs) {
      // Check if customer is already enrolled
      const { data: existingEnrollment } = await supabase
        .from('loyalty_program_enrollments')
        .select('id')
        .eq('customer_id', customer_id)
        .eq('loyalty_program_id', program.id)
        .single();

      if (existingEnrollment) continue; // Already enrolled

      // Create enrollment
      const enrollmentData = {
        barbershop_id,
        customer_id,
        loyalty_program_id: program.id,
        enrolled_at: new Date().toISOString(),
        enrollment_method: 'auto_signup',
        status: 'active',
        current_points: 0,
        lifetime_points_earned: 0,
        lifetime_points_redeemed: 0,
        member_since: new Date().toISOString().split('T')[0],
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: enrollment, error: enrollmentError } = await supabase
        .from('loyalty_program_enrollments')
        .insert(enrollmentData)
        .select()
        .single();

      if (!enrollmentError && enrollment) {
        enrollments.push(enrollment);

        // Award welcome bonus if configured
        const earningRules = program.earning_rules || {};
        const bonusMultipliers = earningRules.bonus_multipliers || {};
        const welcomeBonus = bonusMultipliers.welcome_bonus || bonusMultipliers.signup_bonus || 0;

        if (welcomeBonus > 0) {
          const result = await awardLoyaltyPoints({
            customer_id,
            loyalty_program_id: program.id,
            barbershop_id,
            points_amount: welcomeBonus,
            source_type: 'welcome_bonus',
            source_id: customer_id,
            description: 'Welcome bonus for joining loyalty program'
          });

          if (result.success) {
            totalWelcomePoints += welcomeBonus;
          }
        }
      }
    }

    // Create signup milestone
    await checkAndCreateMilestones(customer_id, barbershop_id, 'customer_signup', {
      signup_method,
      enrollments_created: enrollments.length,
      welcome_points: totalWelcomePoints
    });

    return {
      enrolled: enrollments.length > 0,
      enrollments_created: enrollments.length,
      welcome_points: totalWelcomePoints,
      programs_enrolled: enrollments.map(e => e.loyalty_program_id)
    };

  } catch (error) {
    console.error('Error handling customer signup:', error);
    throw error;
  }
}

/**
 * Handle referral signup - process referral rewards
 */
async function handleReferralSignup(data) {
  try {
    const { referral_code, new_customer_id, barbershop_id } = data;

    if (!referral_code) {
      return { referral_processed: false, message: 'No referral code provided' };
    }

    // Find referral by code
    const { data: referral, error: referralError } = await supabase
      .from('referral_tracking')
      .select('*')
      .eq('referral_code', referral_code)
      .eq('barbershop_id', barbershop_id)
      .single();

    if (referralError || !referral) {
      return { referral_processed: false, message: 'Invalid referral code' };
    }

    // Check if already used
    if (referral.referee_customer_id) {
      return { referral_processed: false, message: 'Referral code already used' };
    }

    // Check if expired
    if (referral.expires_at && new Date(referral.expires_at) < new Date()) {
      return { referral_processed: false, message: 'Referral code has expired' };
    }

    // Update referral with new customer
    const { error: updateError } = await supabase
      .from('referral_tracking')
      .update({
        referee_customer_id: new_customer_id,
        status: 'signed_up',
        signed_up_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', referral.id);

    if (updateError) {
      console.error('Error updating referral:', updateError);
      return { referral_processed: false, message: 'Failed to process referral' };
    }

    // Award signup bonus to new customer
    let signupBonus = 0;
    if (referral.referee_reward_type === 'points' && referral.referee_reward_value) {
      const result = await awardReferralPoints(
        new_customer_id,
        referral.referee_reward_value,
        'referral_signup_bonus',
        referral.id,
        barbershop_id
      );
      if (result.success) {
        signupBonus = referral.referee_reward_value;
      }
    }

    return {
      referral_processed: true,
      referral_id: referral.id,
      referrer_customer_id: referral.referrer_customer_id,
      signup_bonus: signupBonus
    };

  } catch (error) {
    console.error('Error handling referral signup:', error);
    throw error;
  }
}

/**
 * Handle birthday bonus
 */
async function handleBirthdayBonus(data) {
  try {
    const { customer_id, barbershop_id } = data;

    // Get customer's active loyalty enrollments
    const { data: enrollments } = await supabase
      .from('loyalty_program_enrollments')
      .select(`
        *,
        loyalty_programs!inner(*)
      `)
      .eq('customer_id', customer_id)
      .eq('barbershop_id', barbershop_id)
      .eq('is_active', true);

    if (!enrollments || enrollments.length === 0) {
      return { birthday_bonus: 0, message: 'Customer not enrolled in loyalty program' };
    }

    let totalBirthdayBonus = 0;

    for (const enrollment of enrollments) {
      const program = enrollment.loyalty_programs;
      const earningRules = program.earning_rules || {};
      const bonusMultipliers = earningRules.bonus_multipliers || {};
      const birthdayBonus = bonusMultipliers.birthday_bonus || 100;

      if (birthdayBonus > 0) {
        const result = await awardLoyaltyPoints({
          customer_id,
          loyalty_program_id: enrollment.loyalty_program_id,
          barbershop_id,
          points_amount: birthdayBonus,
          source_type: 'birthday_bonus',
          source_id: customer_id,
          description: 'Happy Birthday bonus points!'
        });

        if (result.success) {
          totalBirthdayBonus += birthdayBonus;
        }
      }
    }

    // Create birthday milestone
    await checkAndCreateMilestones(customer_id, barbershop_id, 'birthday_bonus', {
      bonus_points: totalBirthdayBonus
    });

    return {
      birthday_bonus: totalBirthdayBonus,
      customer_id
    };

  } catch (error) {
    console.error('Error handling birthday bonus:', error);
    throw error;
  }
}

/**
 * Handle special promotion
 */
async function handleSpecialPromotion(data) {
  try {
    const { 
      customer_id, 
      barbershop_id, 
      promotion_type, 
      promotion_value, 
      promotion_name,
      program_id 
    } = data;

    let query = supabase
      .from('loyalty_program_enrollments')
      .select('*')
      .eq('customer_id', customer_id)
      .eq('barbershop_id', barbershop_id)
      .eq('is_active', true);

    if (program_id) {
      query = query.eq('loyalty_program_id', program_id);
    }

    const { data: enrollments } = await query;

    if (!enrollments || enrollments.length === 0) {
      return { promotion_bonus: 0, message: 'Customer not enrolled in loyalty program' };
    }

    let totalPromotionBonus = 0;

    for (const enrollment of enrollments) {
      if (promotion_type === 'points' && promotion_value > 0) {
        const result = await awardLoyaltyPoints({
          customer_id,
          loyalty_program_id: enrollment.loyalty_program_id,
          barbershop_id,
          points_amount: promotion_value,
          source_type: 'special_promotion',
          source_id: `promotion_${promotion_name}`,
          description: `Special promotion: ${promotion_name}`
        });

        if (result.success) {
          totalPromotionBonus += promotion_value;
        }
      }
    }

    return {
      promotion_bonus: totalPromotionBonus,
      promotion_type,
      promotion_name
    };

  } catch (error) {
    console.error('Error handling special promotion:', error);
    throw error;
  }
}

/**
 * Helper function to award loyalty points
 */
async function awardLoyaltyPoints(pointsData) {
  try {
    // Get current enrollment
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('loyalty_program_enrollments')
      .select('*')
      .eq('customer_id', pointsData.customer_id)
      .eq('loyalty_program_id', pointsData.loyalty_program_id)
      .eq('barbershop_id', pointsData.barbershop_id)
      .eq('is_active', true)
      .single();

    if (enrollmentError || !enrollment) {
      return { success: false, error: 'Customer enrollment not found' };
    }

    const currentBalance = enrollment.current_points || 0;
    const newBalance = currentBalance + pointsData.points_amount;

    // Calculate expiration if it's earned points
    let expiresAt = null;
    if (pointsData.points_amount > 0) {
      const { data: program } = await supabase
        .from('loyalty_programs')
        .select('points_expiration_months')
        .eq('id', pointsData.loyalty_program_id)
        .single();

      if (program?.points_expiration_months) {
        const expireDate = new Date();
        expireDate.setMonth(expireDate.getMonth() + program.points_expiration_months);
        expiresAt = expireDate.toISOString();
      }
    }

    // Create points transaction
    const transactionData = {
      barbershop_id: pointsData.barbershop_id,
      customer_id: pointsData.customer_id,
      loyalty_program_id: pointsData.loyalty_program_id,
      transaction_type: pointsData.points_amount > 0 ? 'earned' : 'adjusted',
      points_amount: pointsData.points_amount,
      source_type: pointsData.source_type,
      source_id: pointsData.source_id,
      earning_rate: pointsData.earning_rate,
      base_amount: pointsData.base_amount,
      multiplier: pointsData.multiplier,
      expires_at: expiresAt,
      balance_before: currentBalance,
      balance_after: newBalance,
      processed_by_user_id: 'system',
      description: pointsData.description,
      created_at: new Date().toISOString()
    };

    const { data: transaction, error: transactionError } = await supabase
      .from('loyalty_points')
      .insert(transactionData)
      .select()
      .single();

    if (transactionError) {
      console.error('Error creating points transaction:', transactionError);
      return { success: false, error: 'Failed to create points transaction' };
    }

    // Update enrollment
    const enrollmentUpdate = {
      current_points: newBalance,
      last_activity_date: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString()
    };

    if (pointsData.points_amount > 0) {
      enrollmentUpdate.last_points_earned_date = new Date().toISOString().split('T')[0];
      enrollmentUpdate.lifetime_points_earned = (enrollment.lifetime_points_earned || 0) + pointsData.points_amount;
    }

    const { error: updateError } = await supabase
      .from('loyalty_program_enrollments')
      .update(enrollmentUpdate)
      .eq('id', enrollment.id);

    if (updateError) {
      console.error('Error updating enrollment:', updateError);
    }

    return { 
      success: true, 
      transaction,
      new_balance: newBalance
    };

  } catch (error) {
    console.error('Error awarding loyalty points:', error);
    return { success: false, error: 'Internal error awarding points' };
  }
}

/**
 * Helper function to award referral points
 */
async function awardReferralPoints(customerId, points, type, referralId, barbershopId) {
  try {
    // Get customer's first active loyalty enrollment
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('loyalty_program_enrollments')
      .select('*')
      .eq('customer_id', customerId)
      .eq('barbershop_id', barbershopId)
      .eq('is_active', true)
      .limit(1)
      .single();

    if (enrollmentError || !enrollment) {
      return { success: false, error: 'Customer not enrolled in loyalty program' };
    }

    return await awardLoyaltyPoints({
      customer_id: customerId,
      loyalty_program_id: enrollment.loyalty_program_id,
      barbershop_id: barbershopId,
      points_amount: points,
      source_type: type,
      source_id: referralId,
      description: `${type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} points`
    });

  } catch (error) {
    console.error('Error awarding referral points:', error);
    return { success: false, error: 'Failed to award referral points' };
  }
}

/**
 * Helper function to check and create milestones
 */
async function checkAndCreateMilestones(customerId, barbershopId, milestoneType, data) {
  try {
    let milestoneData = {};

    switch (milestoneType) {
      case 'customer_signup':
        milestoneData = {
          milestone_name: 'Joined Loyalty Program',
          milestone_description: `Customer signed up and enrolled in loyalty program`,
          milestone_value: data.welcome_points
        };
        break;

      case 'appointment_completed':
        milestoneData = {
          milestone_name: 'Appointment Completed',
          milestone_description: `Completed appointment and earned ${data.points_awarded} points`,
          milestone_value: data.service_amount
        };
        break;

      case 'review_submitted':
        milestoneData = {
          milestone_name: `${data.rating}-Star Review`,
          milestone_description: `Submitted ${data.rating}-star review and earned ${data.points_awarded} points`,
          milestone_value: data.points_awarded
        };
        break;

      case 'birthday_bonus':
        milestoneData = {
          milestone_name: 'Birthday Celebration',
          milestone_description: `Received birthday bonus of ${data.bonus_points} points`,
          milestone_value: data.bonus_points
        };
        break;

      default:
        return; // Don't create milestone for unknown types
    }

    const milestone = {
      barbershop_id: barbershopId,
      customer_id: customerId,
      milestone_type: milestoneType,
      milestone_name: milestoneData.milestone_name,
      milestone_description: milestoneData.milestone_description,
      milestone_value: milestoneData.milestone_value,
      achieved_at: new Date().toISOString(),
      achievement_method: 'automatic',
      is_celebrated: false,
      importance_level: 2,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await supabase
      .from('customer_milestones')
      .insert(milestone);

  } catch (error) {
    console.error('Error creating milestone:', error);
    // Don't throw error as milestone creation is not critical
  }
}