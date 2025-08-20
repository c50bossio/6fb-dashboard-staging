/**
 * Loyalty Programs API Route
 * Handles loyalty program management operations
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
 * GET /api/customers/loyalty/programs
 * List all loyalty programs for authenticated barbershop
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
    const activeOnly = url.searchParams.get('active_only') !== 'false';

    // Fetch loyalty programs
    let query = supabase
      .from('loyalty_programs')
      .select('*')
      .eq('barbershop_id', barbershopId);

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data: programs, error: programsError } = await query.order('created_at', { ascending: false });

    if (programsError) {
      console.error('Error fetching loyalty programs:', programsError);
      return NextResponse.json({ error: 'Failed to fetch loyalty programs' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      programs: programs || [],
      barbershop_id: barbershopId
    });

  } catch (error) {
    console.error('Error in loyalty programs API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/customers/loyalty/programs
 * Create a new loyalty program
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

    // Validate required fields
    const { 
      program_name, 
      program_type, 
      earning_rules, 
      redemption_rules,
      program_description,
      auto_enroll_new_customers = true,
      points_expiration_months = 12,
      welcome_message,
      earning_notifications = true,
      redemption_notifications = true,
      expiration_warnings = true
    } = body;

    if (!program_name || !program_type || !earning_rules || !redemption_rules) {
      return NextResponse.json({ 
        error: 'Missing required fields: program_name, program_type, earning_rules, redemption_rules' 
      }, { status: 400 });
    }

    // Validate program type
    const validTypes = ['points', 'visits', 'spending', 'tier', 'hybrid'];
    if (!validTypes.includes(program_type)) {
      return NextResponse.json({ 
        error: 'Invalid program_type. Must be one of: ' + validTypes.join(', ')
      }, { status: 400 });
    }

    // Create loyalty program
    const programData = {
      barbershop_id: barbershopId,
      program_name,
      program_description,
      program_type,
      earning_rules,
      redemption_rules,
      is_active: true,
      auto_enroll_new_customers,
      points_expiration_months,
      welcome_message,
      earning_notifications,
      redemption_notifications,
      expiration_warnings,
      total_members: 0,
      active_members: 0,
      total_points_issued: 0,
      total_points_redeemed: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: program, error: createError } = await supabase
      .from('loyalty_programs')
      .insert(programData)
      .select()
      .single();

    if (createError) {
      console.error('Error creating loyalty program:', createError);
      return NextResponse.json({ error: 'Failed to create loyalty program' }, { status: 500 });
    }

    // Create default tiers if it's a tier-based program
    if (program_type === 'tier' || program_type === 'hybrid') {
      await createDefaultTiers(program.id, barbershopId);
    }

    return NextResponse.json({ 
      success: true, 
      program,
      message: 'Loyalty program created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating loyalty program:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Helper function to create default tiers for tier-based programs
 */
async function createDefaultTiers(programId, barbershopId) {
  const defaultTiers = [
    {
      barbershop_id: barbershopId,
      loyalty_program_id: programId,
      tier_name: 'Bronze',
      tier_description: 'Starting tier for new members',
      tier_level: 1,
      qualification_criteria: { points_required: 0 },
      benefits: { point_multiplier: 1.0 },
      color_code: '#CD7F32',
      is_active: true,
      current_members: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      barbershop_id: barbershopId,
      loyalty_program_id: programId,
      tier_name: 'Silver',
      tier_description: 'Intermediate tier for regular customers',
      tier_level: 2,
      qualification_criteria: { points_required: 500 },
      benefits: { point_multiplier: 1.25, discount_percentage: 5 },
      color_code: '#C0C0C0',
      is_active: true,
      current_members: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      barbershop_id: barbershopId,
      loyalty_program_id: programId,
      tier_name: 'Gold',
      tier_description: 'Premium tier for valued customers',
      tier_level: 3,
      qualification_criteria: { points_required: 1500 },
      benefits: { 
        point_multiplier: 1.5, 
        discount_percentage: 10, 
        priority_booking: true 
      },
      color_code: '#FFD700',
      is_active: true,
      current_members: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      barbershop_id: barbershopId,
      loyalty_program_id: programId,
      tier_name: 'Platinum',
      tier_description: 'Elite tier for VIP customers',
      tier_level: 4,
      qualification_criteria: { points_required: 3000 },
      benefits: { 
        point_multiplier: 2.0, 
        discount_percentage: 15, 
        priority_booking: true, 
        exclusive_offers: true 
      },
      color_code: '#E5E4E2',
      is_active: true,
      current_members: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];

  try {
    const { error } = await supabase
      .from('loyalty_tiers')
      .insert(defaultTiers);

    if (error) {
      console.error('Error creating default tiers:', error);
    }
  } catch (error) {
    console.error('Error creating default tiers:', error);
  }
}