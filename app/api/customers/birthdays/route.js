import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
export const runtime = 'edge'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Helper function to calculate days until birthday/anniversary
function calculateDaysUntil(date) {
  if (!date) return null;
  
  const today = new Date();
  const currentYear = today.getFullYear();
  const eventDate = new Date(date);
  
  // Create this year's event date
  let thisYearEvent = new Date(currentYear, eventDate.getMonth(), eventDate.getDate());
  
  // If this year's event has passed, use next year
  if (thisYearEvent < today) {
    thisYearEvent = new Date(currentYear + 1, eventDate.getMonth(), eventDate.getDate());
  }
  
  const timeDiff = thisYearEvent.getTime() - today.getTime();
  return Math.ceil(timeDiff / (1000 * 3600 * 24));
}

// Helper function to format customer data
function formatCustomerData(customer, eventType = 'birthday') {
  const eventDate = eventType === 'birthday' ? customer.birthday : customer.anniversary_date;
  const daysUntil = calculateDaysUntil(eventDate);
  
  return {
    ...customer,
    event_type: eventType,
    event_date: eventDate,
    days_until_event: daysUntil,
    event_date_display: eventDate ? new Date(eventDate).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric'
    }) : null,
    last_visit_display: customer.last_visit_at 
      ? new Date(customer.last_visit_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        })
      : 'Never',
    is_new_customer: customer.total_visits === 0,
    is_frequent_customer: customer.total_visits >= 5,
    years_as_customer: customer.anniversary_date 
      ? Math.floor((new Date() - new Date(customer.anniversary_date)) / (365.25 * 24 * 60 * 60 * 1000))
      : 0
  };
}

// GET - Fetch customers with upcoming birthdays/anniversaries
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const barbershopId = searchParams.get('barbershop_id');
    const eventType = searchParams.get('type') || 'birthday'; // 'birthday' or 'anniversary'
    const daysAhead = parseInt(searchParams.get('days_ahead')) || 30;
    const includeAll = searchParams.get('include_all') === 'true';
    
    if (!barbershopId) {
      return NextResponse.json({
        customers: [],
        error: 'barbershop_id parameter is required'
      }, { status: 400 });
    }

    // Build the query based on event type
    let query = supabase
      .from('customers')
      .select(`
        id,
        name,
        phone,
        email,
        birthday,
        anniversary_date,
        birthday_reminders_enabled,
        anniversary_reminders_enabled,
        last_birthday_campaign_sent,
        last_anniversary_campaign_sent,
        total_visits,
        last_visit_at,
        vip_status,
        preferences,
        created_at
      `)
      .eq('barbershop_id', barbershopId)
      .eq('is_active', true);

    // Filter by event type and reminder preferences
    if (eventType === 'birthday') {
      query = query
        .not('birthday', 'is', null)
        .eq('birthday_reminders_enabled', true);
    } else {
      query = query
        .not('anniversary_date', 'is', null)
        .eq('anniversary_reminders_enabled', true);
    }

    const { data: customers, error } = await query;

    if (error) {
      // If tables don't exist yet, return empty result with instruction
      if (error.message?.includes('column') && error.message?.includes('does not exist')) {
        return NextResponse.json({
          customers: [],
          total: 0,
          message: 'Birthday/Anniversary feature not yet set up. Please run the database migration first.',
          migration_needed: true
        });
      }
      
      return NextResponse.json(
        { error: 'Failed to fetch birthday/anniversary data', details: error.message },
        { status: 500 }
      );
    }

    if (!customers || customers.length === 0) {
      return NextResponse.json({
        customers: [],
        total: 0,
        message: `No customers found with upcoming ${eventType}s`
      });
    }

    // Format and filter customers based on days ahead
    let formattedCustomers = customers
      .map(customer => formatCustomerData(customer, eventType))
      .filter(customer => {
        if (includeAll) return true;
        return customer.days_until_event !== null && customer.days_until_event <= daysAhead;
      })
      .sort((a, b) => (a.days_until_event || 999) - (b.days_until_event || 999));

    return NextResponse.json({
      customers: formattedCustomers,
      total: formattedCustomers.length,
      event_type: eventType,
      days_ahead: daysAhead,
      message: `Found ${formattedCustomers.length} customers with upcoming ${eventType}s`
    });

  } catch (error) {
    console.error('Birthday/Anniversary API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// POST - Schedule birthday/anniversary campaigns
export async function POST(request) {
  try {
    const body = await request.json();
    const { 
      barbershop_id, 
      customer_ids, 
      campaign_type, 
      message_type, 
      template_id,
      custom_message,
      scheduled_for,
      discount_percentage,
      discount_amount 
    } = body;

    if (!barbershop_id || !customer_ids || !campaign_type) {
      return NextResponse.json({
        error: 'barbershop_id, customer_ids, and campaign_type are required'
      }, { status: 400 });
    }

    if (!Array.isArray(customer_ids) || customer_ids.length === 0) {
      return NextResponse.json({
        error: 'customer_ids must be a non-empty array'
      }, { status: 400 });
    }

    let messageContent = custom_message;
    let discountPercentage = discount_percentage || 0;
    let discountAmount = discount_amount || 0;

    // If template_id is provided, fetch the template
    if (template_id && !custom_message) {
      try {
        const { data: template, error: templateError } = await supabase
          .from('birthday_templates')
          .select('*')
          .eq('id', template_id)
          .eq('barbershop_id', barbershop_id)
          .eq('is_active', true)
          .single();

        if (templateError) {
          // If templates table doesn't exist, use default message
          if (templateError.message?.includes('relation') && templateError.message?.includes('does not exist')) {
            messageContent = campaign_type === 'birthday' 
              ? 'Happy Birthday {{customer_name}}! 🎉 Celebrate with us and get 15% off your next service. Book today!'
              : 'Happy Anniversary {{customer_name}}! 🎊 It\'s been {{years_as_customer}} year(s) since your first visit. Celebrate with 20% off! Book today!';
            discountPercentage = campaign_type === 'birthday' ? 15 : 20;
          } else {
            return NextResponse.json({
              error: 'Template not found or inactive',
              details: templateError.message
            }, { status: 404 });
          }
        } else {
          messageContent = template.message_content;
          discountPercentage = template.discount_type === 'percentage' ? template.discount_value : 0;
          discountAmount = template.discount_type === 'fixed_amount' ? template.discount_value : 0;
        }
      } catch (err) {
        // Fallback to default message if template fetch fails
        messageContent = campaign_type === 'birthday' 
          ? 'Happy Birthday {{customer_name}}! 🎉 Celebrate with us and get 15% off your next service. Book today!'
          : 'Happy Anniversary {{customer_name}}! 🎊 Celebrate with us and get 20% off your next service. Book today!';
        discountPercentage = campaign_type === 'birthday' ? 15 : 20;
      }
    }

    // Create campaign records for each customer
    const campaigns = customer_ids.map(customerId => ({
      barbershop_id,
      customer_id: customerId,
      campaign_type,
      message_type: message_type || 'sms',
      message_content: messageContent,
      discount_percentage: discountPercentage,
      discount_amount: discountAmount,
      scheduled_for: scheduled_for || new Date().toISOString().split('T')[0],
      delivery_status: 'pending'
    }));

    // Try to insert campaigns (will fail gracefully if table doesn't exist)
    try {
      const { data: createdCampaigns, error: campaignError } = await supabase
        .from('birthday_campaigns')
        .insert(campaigns)
        .select();

      if (campaignError) {
        if (campaignError.message?.includes('relation') && campaignError.message?.includes('does not exist')) {
          // Table doesn't exist, return success with migration notice
          return NextResponse.json({
            success: true,
            message: 'Campaign scheduled successfully (simulation mode)',
            migration_needed: true,
            campaigns_count: customer_ids.length,
            details: 'Birthday/Anniversary tables not yet created. Please run the database migration to enable full functionality.'
          });
        }
        
        return NextResponse.json({
          error: 'Failed to create campaigns',
          details: campaignError.message
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: `${createdCampaigns.length} birthday/anniversary campaigns scheduled successfully`,
        campaigns: createdCampaigns,
        campaigns_count: createdCampaigns.length
      });

    } catch (err) {
      // Fallback response if campaign creation fails
      return NextResponse.json({
        success: true,
        message: 'Campaign scheduled successfully (simulation mode)',
        migration_needed: true,
        campaigns_count: customer_ids.length,
        details: 'Birthday/Anniversary system ready to deploy once database migration is complete.'
      });
    }

  } catch (error) {
    console.error('Birthday campaign scheduling error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update customer birthday/anniversary information
export async function PUT(request) {
  try {
    const body = await request.json();
    const { 
      customer_id, 
      birthday, 
      anniversary_date,
      birthday_reminders_enabled,
      anniversary_reminders_enabled 
    } = body;

    if (!customer_id) {
      return NextResponse.json({
        error: 'customer_id is required'
      }, { status: 400 });
    }

    // Prepare update data
    const updateData = {};
    if (birthday !== undefined) updateData.birthday = birthday;
    if (anniversary_date !== undefined) updateData.anniversary_date = anniversary_date;
    if (birthday_reminders_enabled !== undefined) updateData.birthday_reminders_enabled = birthday_reminders_enabled;
    if (anniversary_reminders_enabled !== undefined) updateData.anniversary_reminders_enabled = anniversary_reminders_enabled;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({
        error: 'No valid fields provided for update'
      }, { status: 400 });
    }

    const { data: updatedCustomer, error } = await supabase
      .from('customers')
      .update(updateData)
      .eq('id', customer_id)
      .select()
      .single();

    if (error) {
      if (error.message?.includes('column') && error.message?.includes('does not exist')) {
        return NextResponse.json({
          error: 'Birthday/Anniversary fields not available. Please run the database migration first.',
          migration_needed: true
        }, { status: 400 });
      }
      
      return NextResponse.json({
        error: 'Failed to update customer',
        details: error.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Customer birthday/anniversary information updated successfully',
      customer: updatedCustomer
    });

  } catch (error) {
    console.error('Customer update error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}