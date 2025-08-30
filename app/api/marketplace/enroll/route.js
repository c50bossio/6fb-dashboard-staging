import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/marketplace/enroll - Check enrollment status
export async function GET(request) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const barberbarbershopId = searchParams.get('barberbarbershop_id');

    if (!barberbarbershopId) {
      return NextResponse.json({ error: 'Barbershop ID required' }, { status: 400 });
    }

    const { data: enrollment, error } = await supabase
      .from('marketplace_enrollment')
      .select('*')
      .eq('barberbarbershop_id', barberbarbershopId)
      .single();

    if (error && error.code !== 'PGRST116') { // Not found is ok
      console.error('Error fetching enrollment:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!enrollment) {
      return NextResponse.json({
        enrolled: false,
        message: 'Not enrolled in marketplace'
      });
    }

    // Get order statistics
    const { data: orderStats } = await supabase
      .from('marketplace_orders')
      .select('total_amount, status')
      .eq('barberbarbershop_id', barberbarbershopId);

    const stats = {
      total_orders: orderStats?.length || 0,
      pending_orders: orderStats?.filter(o => ['submitted', 'approved'].includes(o.status)).length || 0,
      total_spent: orderStats?.reduce((sum, o) => sum + parseFloat(o.total_amount), 0) || 0
    };

    return NextResponse.json({
      enrolled: enrollment.is_enrolled,
      enrollment: {
        ...enrollment,
        statistics: stats
      }
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/marketplace/enroll - Enroll barbershop in marketplace
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      barberbarbershop_id,
      company_name,
      tax_id,
      reseller_permit,
      shipping_address,
      billing_address,
      order_notification_email,
      order_notification_sms,
      preferred_shipping_day,
      marketing_opt_in
    } = body;

    // Validate required fields
    if (!barberbarbershop_id || !company_name || !shipping_address) {
      return NextResponse.json({ 
        error: 'Missing required fields' 
      }, { status: 400 });
    }

    // Check if already enrolled
    const { data: existing } = await supabase
      .from('marketplace_enrollment')
      .select('id')
      .eq('barberbarbershop_id', barberbarbershop_id)
      .single();

    if (existing) {
      return NextResponse.json({ 
        error: 'Already enrolled in marketplace' 
      }, { status: 409 });
    }

    // Generate account number
    const accountNumber = generateAccountNumber();

    // Create enrollment
    const { data: enrollment, error } = await supabase
      .from('marketplace_enrollment')
      .insert({
        barberbarbershop_id,
        is_enrolled: true,
        enrolled_at: new Date().toISOString(),
        enrollment_status: 'pending', // Will be activated after review
        account_number: accountNumber,
        company_name,
        tax_id,
        reseller_permit,
        payment_terms: 'prepaid', // Start with prepaid, can upgrade later
        credit_limit: 0,
        current_balance: 0,
        account_standing: 'good',
        auto_reorder_enabled: false,
        preferred_shipping_day,
        preferred_delivery_window: 'any',
        min_order_value: 100,
        default_shipping_address: shipping_address,
        billing_address: billing_address || shipping_address,
        discount_tier: 'standard',
        flat_discount_percent: 0,
        order_notification_email,
        order_notification_sms,
        marketing_opt_in: marketing_opt_in !== false
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating enrollment:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Send welcome email (implement separately)
    // await sendWelcomeEmail(enrollment);

    // Create initial alert for admin review
    await supabase
      .from('inventory_alerts')
      .insert({
        barberbarbershop_id,
        alert_type: 'enrollment_pending',
        severity: 'info',
        product_name: `New marketplace enrollment: ${company_name}`,
        current_stock: 0,
        reorder_point: 0
      });

    return NextResponse.json({
      success: true,
      enrollment,
      message: 'Enrollment submitted. Your account will be activated within 24 hours.'
    }, { status: 201 });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/marketplace/enroll - Update enrollment settings
export async function PUT(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { barberbarbershop_id, ...updateData } = body;

    if (!barberbarbershop_id) {
      return NextResponse.json({ error: 'Barbershop ID required' }, { status: 400 });
    }

    // Remove fields that shouldn't be updated by user
    delete updateData.enrollment_status;
    delete updateData.account_number;
    delete updateData.credit_limit;
    delete updateData.current_balance;
    delete updateData.account_standing;
    delete updateData.discount_tier;
    delete updateData.total_orders_placed;
    delete updateData.total_amount_spent;

    const { data: enrollment, error } = await supabase
      .from('marketplace_enrollment')
      .update(updateData)
      .eq('barberbarbershop_id', barberbarbershop_id)
      .select()
      .single();

    if (error) {
      console.error('Error updating enrollment:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      enrollment
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/marketplace/enroll - Cancel enrollment
export async function DELETE(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const barberbarbershopId = searchParams.get('barberbarbershop_id');

    if (!barberbarbershopId) {
      return NextResponse.json({ error: 'Barbershop ID required' }, { status: 400 });
    }

    // Check for pending orders
    const { data: pendingOrders } = await supabase
      .from('marketplace_orders')
      .select('id')
      .eq('barberbarbershop_id', barberbarbershopId)
      .in('status', ['submitted', 'approved', 'processing'])
      .limit(1);

    if (pendingOrders && pendingOrders.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot cancel enrollment with pending orders' 
      }, { status: 400 });
    }

    // Check outstanding balance
    const { data: enrollment } = await supabase
      .from('marketplace_enrollment')
      .select('current_balance')
      .eq('barberbarbershop_id', barberbarbershopId)
      .single();

    if (enrollment?.current_balance > 0) {
      return NextResponse.json({ 
        error: `Cannot cancel enrollment with outstanding balance of $${enrollment.current_balance}` 
      }, { status: 400 });
    }

    // Soft delete - set inactive instead of deleting
    const { error } = await supabase
      .from('marketplace_enrollment')
      .update({
        is_enrolled: false,
        enrollment_status: 'inactive'
      })
      .eq('barberbarbershop_id', barberbarbershopId);

    if (error) {
      console.error('Error cancelling enrollment:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Marketplace enrollment cancelled'
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to generate account number
function generateAccountNumber() {
  const prefix = 'BB';
  const year = new Date().getFullYear().toString().slice(-2);
  const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  return `${prefix}${year}${random}`;
}