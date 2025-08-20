/**
 * Loyalty Tiers API Route
 * Handles tier management, upgrades, and tier benefits
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
 * GET /api/customers/loyalty/tiers
 * Get loyalty tiers or check upgrade eligibility
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
    const programId = url.searchParams.get('program_id');
    const customerId = url.searchParams.get('customer_id');

    if (action === 'list') {
      // Get loyalty tiers
      let query = supabase
        .from('loyalty_tiers')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .eq('is_active', true)
        .order('tier_level');

      if (programId) {
        query = query.eq('loyalty_program_id', programId);
      }

      const { data: tiers, error: tiersError } = await query;

      if (tiersError) {
        console.error('Error fetching loyalty tiers:', tiersError);
        return NextResponse.json({ error: 'Failed to fetch loyalty tiers' }, { status: 500 });
      }

      return NextResponse.json({ 
        success: true, 
        tiers: tiers || []
      });

    } else if (action === 'check-upgrade') {
      // Check tier upgrade eligibility
      if (!customerId) {
        return NextResponse.json({ error: 'customer_id parameter required for upgrade check' }, { status: 400 });
      }

      const upgradeInfo = await checkTierUpgradeEligibility(customerId, barbershopId, programId);
      
      return NextResponse.json({ 
        success: true, 
        ...upgradeInfo
      });

    } else if (action === 'customer-progress') {
      // Get customer's tier progress
      if (!customerId) {
        return NextResponse.json({ error: 'customer_id parameter required for progress check' }, { status: 400 });
      }

      const progress = await getCustomerTierProgress(customerId, barbershopId, programId);
      
      return NextResponse.json({ 
        success: true, 
        ...progress
      });
    }

    return NextResponse.json({ error: 'Invalid action parameter' }, { status: 400 });

  } catch (error) {
    console.error('Error in loyalty tiers API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/customers/loyalty/tiers
 * Create a new loyalty tier or upgrade customer tier
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
      // Create new tier
      const {
        loyalty_program_id,
        tier_name,
        tier_description,
        tier_level,
        qualification_criteria,
        benefits,
        color_code = '#6B7280',
        icon
      } = body;

      // Validate required fields
      if (!loyalty_program_id || !tier_name || !tier_level || !qualification_criteria || !benefits) {
        return NextResponse.json({ 
          error: 'Missing required fields: loyalty_program_id, tier_name, tier_level, qualification_criteria, benefits' 
        }, { status: 400 });
      }

      // Validate tier level is unique
      const { data: existingTier, error: checkError } = await supabase
        .from('loyalty_tiers')
        .select('id')
        .eq('barbershop_id', barbershopId)
        .eq('loyalty_program_id', loyalty_program_id)
        .eq('tier_level', tier_level)
        .single();

      if (!checkError && existingTier) {
        return NextResponse.json({ 
          error: 'Tier level already exists for this program' 
        }, { status: 400 });
      }

      // Create tier
      const tierData = {
        barbershop_id: barbershopId,
        loyalty_program_id,
        tier_name,
        tier_description,
        tier_level,
        qualification_criteria,
        benefits,
        color_code,
        icon,
        is_active: true,
        current_members: 0,
        average_spending: 0,
        retention_rate: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: tier, error: createError } = await supabase
        .from('loyalty_tiers')
        .insert(tierData)
        .select()
        .single();

      if (createError) {
        console.error('Error creating loyalty tier:', createError);
        return NextResponse.json({ error: 'Failed to create loyalty tier' }, { status: 500 });
      }

      return NextResponse.json({ 
        success: true, 
        tier,
        message: 'Loyalty tier created successfully'
      }, { status: 201 });

    } else if (action === 'upgrade') {
      // Upgrade customer tier
      const { customer_id, new_tier_id } = body;

      if (!customer_id || !new_tier_id) {
        return NextResponse.json({ 
          error: 'Missing required fields: customer_id, new_tier_id' 
        }, { status: 400 });
      }

      const upgradeResult = await upgradeCustomerTier(customer_id, new_tier_id, barbershopId, user.id);
      
      if (!upgradeResult.success) {
        return NextResponse.json({ error: upgradeResult.error }, { status: 400 });
      }

      return NextResponse.json({ 
        success: true, 
        ...upgradeResult,
        message: 'Customer tier upgraded successfully'
      });

    } else if (action === 'bulk-upgrade') {
      // Bulk tier upgrade eligibility check and processing
      const { program_id, dry_run = true } = body;

      const bulkResult = await processBulkTierUpgrades(barbershopId, program_id, dry_run, user.id);
      
      return NextResponse.json({ 
        success: true, 
        ...bulkResult
      });
    }

    return NextResponse.json({ error: 'Invalid action parameter' }, { status: 400 });

  } catch (error) {
    console.error('Error in tier management:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/customers/loyalty/tiers
 * Update loyalty tier
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
    const { tier_id, ...updateData } = body;

    if (!tier_id) {
      return NextResponse.json({ error: 'tier_id is required' }, { status: 400 });
    }

    // Add updated timestamp
    updateData.updated_at = new Date().toISOString();

    // Update tier
    const { data: updatedTier, error: updateError } = await supabase
      .from('loyalty_tiers')
      .update(updateData)
      .eq('id', tier_id)
      .eq('barbershop_id', barbershopId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating loyalty tier:', updateError);
      return NextResponse.json({ error: 'Failed to update loyalty tier' }, { status: 500 });
    }

    if (!updatedTier) {
      return NextResponse.json({ error: 'Tier not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      tier: updatedTier,
      message: 'Loyalty tier updated successfully'
    });

  } catch (error) {
    console.error('Error updating tier:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Helper function to check tier upgrade eligibility
 */
async function checkTierUpgradeEligibility(customerId, barbershopId, programId) {
  try {
    // Get customer enrollment
    let query = supabase
      .from('loyalty_program_enrollments')
      .select('*')
      .eq('customer_id', customerId)
      .eq('barbershop_id', barbershopId)
      .eq('is_active', true);

    if (programId) {
      query = query.eq('loyalty_program_id', programId);
    }

    const { data: enrollments, error: enrollmentError } = await query;

    if (enrollmentError || !enrollments || enrollments.length === 0) {
      return { eligible: false, reason: 'Customer not enrolled in loyalty program' };
    }

    const enrollment = enrollments[0]; // Use first enrollment if no specific program

    // Get customer analytics (simplified)
    const analytics = await getCustomerAnalytics(customerId, barbershopId);

    // Get available tiers
    const { data: tiers, error: tiersError } = await supabase
      .from('loyalty_tiers')
      .select('*')
      .eq('barbershop_id', barbershopId)
      .eq('loyalty_program_id', enrollment.loyalty_program_id)
      .eq('is_active', true)
      .order('tier_level');

    if (tiersError || !tiers || tiers.length === 0) {
      return { eligible: false, reason: 'No tiers available' };
    }

    // Find current tier level
    let currentTierLevel = 0;
    if (enrollment.current_tier) {
      const currentTierObj = tiers.find(t => t.tier_name === enrollment.current_tier);
      if (currentTierObj) {
        currentTierLevel = currentTierObj.tier_level;
      }
    }

    // Check eligibility for higher tiers
    const eligibleTiers = [];
    for (const tier of tiers) {
      if (tier.tier_level > currentTierLevel) {
        if (await meetsTierRequirements(tier, analytics, enrollment)) {
          eligibleTiers.push(tier);
        }
      }
    }

    // Get the highest eligible tier
    if (eligibleTiers.length > 0) {
      const nextTier = eligibleTiers.reduce((highest, current) => 
        current.tier_level > highest.tier_level ? current : highest
      );
      
      return {
        eligible: true,
        next_tier: nextTier,
        current_tier_level: currentTierLevel,
        analytics,
        all_eligible_tiers: eligibleTiers
      };
    }

    // Check progress to next tier
    const nextTier = tiers.find(t => t.tier_level === currentTierLevel + 1);
    if (nextTier) {
      const progress = await calculateTierRequirementProgress(nextTier, analytics, enrollment);
      return {
        eligible: false,
        next_tier: nextTier,
        progress,
        current_tier_level: currentTierLevel,
        reason: 'Requirements not yet met'
      };
    }

    return { 
      eligible: false, 
      reason: 'Already at highest tier',
      current_tier_level: currentTierLevel
    };

  } catch (error) {
    console.error('Error checking tier upgrade eligibility:', error);
    return { eligible: false, reason: 'Error checking eligibility' };
  }
}

/**
 * Helper function to get customer tier progress
 */
async function getCustomerTierProgress(customerId, barbershopId, programId) {
  try {
    // Get customer enrollment
    let query = supabase
      .from('loyalty_program_enrollments')
      .select('*')
      .eq('customer_id', customerId)
      .eq('barbershop_id', barbershopId)
      .eq('is_active', true);

    if (programId) {
      query = query.eq('loyalty_program_id', programId);
    }

    const { data: enrollments, error: enrollmentError } = await query;

    if (enrollmentError || !enrollments || enrollments.length === 0) {
      return { error: 'Customer not enrolled in loyalty program' };
    }

    const enrollment = enrollments[0];

    // Get tiers for this program
    const { data: tiers, error: tiersError } = await supabase
      .from('loyalty_tiers')
      .select('*')
      .eq('barbershop_id', barbershopId)
      .eq('loyalty_program_id', enrollment.loyalty_program_id)
      .eq('is_active', true)
      .order('tier_level');

    if (tiersError || !tiers) {
      return { error: 'Failed to fetch tiers' };
    }

    const currentPoints = enrollment.current_points || 0;
    const currentTier = enrollment.current_tier;

    // Find current tier level
    let currentTierLevel = 0;
    let currentTierObj = null;
    if (currentTier) {
      currentTierObj = tiers.find(t => t.tier_name === currentTier);
      if (currentTierObj) {
        currentTierLevel = currentTierObj.tier_level;
      }
    }

    // Find next tier
    const nextTier = tiers.find(t => t.tier_level === currentTierLevel + 1);
    
    if (!nextTier) {
      return {
        current_tier: currentTierObj,
        current_tier_level: currentTierLevel,
        current_points: currentPoints,
        tier_progress: 100,
        next_tier: null,
        points_to_next_tier: 0,
        is_highest_tier: true
      };
    }

    // Calculate progress
    const nextTierPoints = nextTier.qualification_criteria?.points_required || 0;
    const currentTierPoints = currentTierLevel > 0 ? 
      (currentTierObj?.qualification_criteria?.points_required || 0) : 0;

    const pointsNeeded = nextTierPoints - currentTierPoints;
    const pointsProgress = Math.max(0, currentPoints - currentTierPoints);
    const progressPercentage = pointsNeeded > 0 ? 
      Math.min(100, (pointsProgress / pointsNeeded) * 100) : 100;

    return {
      current_tier: currentTierObj,
      current_tier_level: currentTierLevel,
      current_points: currentPoints,
      tier_progress: Math.round(progressPercentage * 100) / 100,
      next_tier: nextTier,
      next_tier_threshold: nextTierPoints,
      points_to_next_tier: Math.max(0, nextTierPoints - currentPoints),
      is_highest_tier: false,
      points_needed_for_progress: pointsNeeded,
      points_earned_toward_next: pointsProgress
    };

  } catch (error) {
    console.error('Error getting customer tier progress:', error);
    return { error: 'Failed to get tier progress' };
  }
}

/**
 * Helper function to upgrade customer tier
 */
async function upgradeCustomerTier(customerId, newTierId, barbershopId, userId) {
  try {
    // Get tier information
    const { data: tier, error: tierError } = await supabase
      .from('loyalty_tiers')
      .select('*')
      .eq('id', newTierId)
      .eq('barbershop_id', barbershopId)
      .single();

    if (tierError || !tier) {
      return { success: false, error: 'Tier not found' };
    }

    // Get customer enrollment
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('loyalty_program_enrollments')
      .select('*')
      .eq('customer_id', customerId)
      .eq('loyalty_program_id', tier.loyalty_program_id)
      .eq('barbershop_id', barbershopId)
      .eq('is_active', true)
      .single();

    if (enrollmentError || !enrollment) {
      return { success: false, error: 'Customer not enrolled in loyalty program' };
    }

    // Update enrollment with new tier
    const { data: updatedEnrollment, error: updateError } = await supabase
      .from('loyalty_program_enrollments')
      .update({
        current_tier: tier.tier_name,
        tier_progress: 0, // Reset progress for new tier
        updated_at: new Date().toISOString()
      })
      .eq('id', enrollment.id)
      .select()
      .single();

    if (updateError) {
      return { success: false, error: 'Failed to upgrade customer tier' };
    }

    // Create milestone record
    await createTierUpgradeMilestone(customerId, barbershopId, tier.tier_name);

    return {
      success: true,
      new_tier_name: tier.tier_name,
      new_tier_level: tier.tier_level,
      tier_benefits: tier.benefits,
      updated_enrollment: updatedEnrollment
    };

  } catch (error) {
    console.error('Error upgrading customer tier:', error);
    return { success: false, error: 'Internal error during tier upgrade' };
  }
}

/**
 * Helper function to process bulk tier upgrades
 */
async function processBulkTierUpgrades(barbershopId, programId, dryRun, userId) {
  try {
    // Get all active enrollments
    let query = supabase
      .from('loyalty_program_enrollments')
      .select('*')
      .eq('barbershop_id', barbershopId)
      .eq('is_active', true);

    if (programId) {
      query = query.eq('loyalty_program_id', programId);
    }

    const { data: enrollments, error: enrollmentsError } = await query;

    if (enrollmentsError || !enrollments) {
      return { eligible_customers: 0, upgrades_processed: 0, error: 'Failed to fetch enrollments' };
    }

    const eligibleUpgrades = [];

    // Check each customer for tier upgrade eligibility
    for (const enrollment of enrollments) {
      const upgradeInfo = await checkTierUpgradeEligibility(
        enrollment.customer_id,
        barbershopId,
        enrollment.loyalty_program_id
      );

      if (upgradeInfo.eligible) {
        eligibleUpgrades.push({
          customer_id: enrollment.customer_id,
          current_tier: enrollment.current_tier,
          new_tier: upgradeInfo.next_tier,
          enrollment_id: enrollment.id
        });
      }
    }

    if (dryRun) {
      return {
        dry_run: true,
        eligible_customers: eligibleUpgrades.length,
        upgrades: eligibleUpgrades
      };
    }

    // Process upgrades
    const upgradedCustomers = [];
    for (const upgrade of eligibleUpgrades) {
      try {
        const result = await upgradeCustomerTier(
          upgrade.customer_id,
          upgrade.new_tier.id,
          barbershopId,
          userId
        );
        
        if (result.success) {
          upgradedCustomers.push({
            customer_id: upgrade.customer_id,
            new_tier: result.new_tier_name
          });
        }
      } catch (error) {
        console.error(`Failed to upgrade customer ${upgrade.customer_id}:`, error);
      }
    }

    return {
      dry_run: false,
      eligible_customers: eligibleUpgrades.length,
      upgrades_processed: upgradedCustomers.length,
      upgraded_customers: upgradedCustomers
    };

  } catch (error) {
    console.error('Error processing bulk tier upgrades:', error);
    return { 
      eligible_customers: 0, 
      upgrades_processed: 0, 
      error: 'Internal error during bulk upgrade'
    };
  }
}

/**
 * Helper function to get customer analytics (simplified)
 */
async function getCustomerAnalytics(customerId, barbershopId) {
  // This would typically pull from customer_analytics_summary table
  // For now, return mock data based on actual customer data
  try {
    // Get basic customer stats from appointments and transactions
    const { data: appointments, error: apptError } = await supabase
      .from('appointments')
      .select('total_amount, status, appointment_date')
      .eq('customer_id', customerId)
      .eq('status', 'completed');

    if (apptError) {
      console.error('Error fetching customer appointments:', apptError);
      return {
        total_visits: 0,
        total_spent: 0,
        visit_frequency: 0,
        last_visit_days_ago: null,
        average_rating: 0
      };
    }

    const totalVisits = appointments?.length || 0;
    const totalSpent = appointments?.reduce((sum, apt) => sum + (parseFloat(apt.total_amount) || 0), 0) || 0;
    
    // Calculate days since last visit
    let lastVisitDaysAgo = null;
    if (appointments && appointments.length > 0) {
      const lastVisit = new Date(Math.max(...appointments.map(apt => new Date(apt.appointment_date))));
      lastVisitDaysAgo = Math.floor((new Date() - lastVisit) / (1000 * 60 * 60 * 24));
    }

    return {
      total_visits: totalVisits,
      total_spent: totalSpent,
      visit_frequency: totalVisits > 0 ? totalVisits / Math.max(1, (lastVisitDaysAgo || 30) / 30) : 0,
      last_visit_days_ago: lastVisitDaysAgo,
      average_rating: 4.5 // Would calculate from actual reviews
    };

  } catch (error) {
    console.error('Error getting customer analytics:', error);
    return {
      total_visits: 0,
      total_spent: 0,
      visit_frequency: 0,
      last_visit_days_ago: null,
      average_rating: 0
    };
  }
}

/**
 * Helper function to check if customer meets tier requirements
 */
async function meetsTierRequirements(tier, analytics, enrollment) {
  const criteria = tier.qualification_criteria || {};
  const currentPoints = enrollment.current_points || 0;

  // Check points requirement
  if (criteria.points_required && currentPoints < criteria.points_required) {
    return false;
  }

  // Check visits requirement
  if (criteria.visits_required && analytics.total_visits < criteria.visits_required) {
    return false;
  }

  // Check spending requirement
  if (criteria.spending_required && analytics.total_spent < criteria.spending_required) {
    return false;
  }

  // Check time period requirement (e.g., must maintain criteria for X months)
  if (criteria.time_period_months) {
    // Would implement time-based validation here
    // For now, assume met if other criteria are met
  }

  return true;
}

/**
 * Helper function to calculate tier requirement progress
 */
async function calculateTierRequirementProgress(tier, analytics, enrollment) {
  const criteria = tier.qualification_criteria || {};
  const progress = {};

  // Points progress
  if (criteria.points_required) {
    const currentPoints = enrollment.current_points || 0;
    const requiredPoints = criteria.points_required;
    progress.points = {
      current: currentPoints,
      required: requiredPoints,
      percentage: Math.min(100, (currentPoints / requiredPoints) * 100)
    };
  }

  // Visits progress
  if (criteria.visits_required) {
    const currentVisits = analytics.total_visits;
    const requiredVisits = criteria.visits_required;
    progress.visits = {
      current: currentVisits,
      required: requiredVisits,
      percentage: Math.min(100, (currentVisits / requiredVisits) * 100)
    };
  }

  // Spending progress
  if (criteria.spending_required) {
    const currentSpending = analytics.total_spent;
    const requiredSpending = criteria.spending_required;
    progress.spending = {
      current: currentSpending,
      required: requiredSpending,
      percentage: Math.min(100, (currentSpending / requiredSpending) * 100)
    };
  }

  return progress;
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