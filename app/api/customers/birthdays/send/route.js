import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import SMSService from '@/lib/notifications/sms-service'
// Use Node.js runtime for Twilio compatibility
export const runtime = 'nodejs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// POST - Send birthday/anniversary campaigns immediately
export async function POST(request) {
  try {
    const body = await request.json();
    const { 
      barbershop_id, 
      customer_ids, 
      campaign_type, 
      message_content,
      discount_percentage,
      discount_amount,
      shop_name,
      booking_link
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

    // Fetch customer details
    const { data: customers, error: customerError } = await supabase
      .from('customers')
      .select(`
        id,
        name,
        phone,
        email,
        birthday,
        anniversary_date,
        total_visits,
        created_at
      `)
      .eq('barbershop_id', barbershop_id)
      .in('id', customer_ids)
      .eq('is_active', true);

    if (customerError) {
      return NextResponse.json({
        error: 'Failed to fetch customer data',
        details: customerError.message
      }, { status: 500 });
    }

    if (!customers || customers.length === 0) {
      return NextResponse.json({
        error: 'No valid customers found'
      }, { status: 404 });
    }

    // Filter customers who have phone numbers
    const customersWithPhone = customers.filter(c => c.phone);
    
    if (customersWithPhone.length === 0) {
      return NextResponse.json({
        error: 'No customers have phone numbers for SMS delivery'
      }, { status: 400 });
    }

    // Add years as customer calculation for anniversary campaigns
    const enrichedCustomers = customersWithPhone.map(customer => ({
      ...customer,
      years_as_customer: customer.anniversary_date 
        ? Math.floor((new Date() - new Date(customer.anniversary_date)) / (365.25 * 24 * 60 * 60 * 1000))
        : Math.floor((new Date() - new Date(customer.created_at)) / (365.25 * 24 * 60 * 60 * 1000))
    }));

    // Prepare campaign data
    const campaignData = {
      campaign_type,
      message_content: message_content || (campaign_type === 'birthday' 
        ? 'Happy Birthday {{customer_name}}! 🎉 Celebrate with us and get {{discount_description}}. Book your special day appointment today! Valid for 30 days.'
        : 'Happy Anniversary {{customer_name}}! 🎊 It\'s been {{years_as_customer}} year(s) since your first visit. Celebrate with {{discount_description}}! Book today!'
      ),
      discount_percentage: discount_percentage || (campaign_type === 'birthday' ? 15 : 20),
      discount_amount: discount_amount || 0,
      shop_name: shop_name || 'Your Barbershop',
      booking_link: booking_link || '#'
    };

    // Send SMS campaigns
    try {
      const smsResults = await SMSService.sendBulkCampaign(enrichedCustomers, campaignData);

      // Try to record campaign results in database (graceful failure if tables don't exist)
      const campaignRecords = enrichedCustomers.map(customer => {
        const customerResult = smsResults.results.find(r => r.customer_id === customer.id);
        return {
          barbershop_id,
          customer_id: customer.id,
          campaign_type,
          message_type: 'sms',
          message_content: campaignData.message_content,
          discount_percentage: campaignData.discount_percentage,
          discount_amount: campaignData.discount_amount,
          scheduled_for: new Date().toISOString().split('T')[0],
          sent_at: new Date().toISOString(),
          delivery_status: customerResult?.success ? 'sent' : 'failed'
        };
      });

      try {
        await supabase
          .from('birthday_campaigns')
          .insert(campaignRecords);
      } catch (dbError) {
        // Database recording failed, but SMS was sent - this is okay
        console.warn('Failed to record campaigns in database:', dbError.message);
      }

      // Update last campaign sent date for customers
      const successfulCustomerIds = smsResults.results
        .filter(r => r.success)
        .map(r => r.customer_id);

      if (successfulCustomerIds.length > 0) {
        const updateField = campaign_type === 'birthday' 
          ? 'last_birthday_campaign_sent' 
          : 'last_anniversary_campaign_sent';
        
        try {
          await supabase
            .from('customers')
            .update({ [updateField]: new Date().toISOString().split('T')[0] })
            .in('id', successfulCustomerIds);
        } catch (updateError) {
          // Update failed, but campaigns were sent - this is okay if migration hasn't run
          console.warn('Failed to update customer campaign dates:', updateError.message);
        }
      }

      return NextResponse.json({
        success: true,
        message: `Birthday/Anniversary campaigns sent successfully`,
        results: {
          total_customers: enrichedCustomers.length,
          total_sent: smsResults.total_sent,
          total_failed: smsResults.total_failed,
          campaign_type,
          details: smsResults.results
        }
      });

    } catch (smsError) {
      return NextResponse.json({
        error: 'Failed to send SMS campaigns',
        details: smsError.message
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Birthday campaign sending error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// GET - Get campaign sending status and history
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const barbershopId = searchParams.get('barbershop_id');
    const campaignType = searchParams.get('campaign_type') || 'birthday';
    const limit = parseInt(searchParams.get('limit')) || 50;
    
    if (!barbershopId) {
      return NextResponse.json({
        campaigns: [],
        error: 'barbershop_id parameter is required'
      }, { status: 400 });
    }

    try {
      // Try to fetch campaign history
      const { data: campaigns, error } = await supabase
        .from('birthday_campaigns')
        .select(`
          id,
          customer_id,
          customers!inner(name, phone, email),
          campaign_type,
          message_type,
          discount_percentage,
          discount_amount,
          scheduled_for,
          sent_at,
          delivery_status,
          opened_at,
          clicked_at,
          redeemed_at,
          booking_made,
          created_at
        `)
        .eq('barbershop_id', barbershopId)
        .eq('campaign_type', campaignType)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
          return NextResponse.json({
            campaigns: [],
            message: 'Campaign history not available. Database migration required.',
            migration_needed: true
          });
        }
        
        return NextResponse.json({
          error: 'Failed to fetch campaign history',
          details: error.message
        }, { status: 500 });
      }

      const formattedCampaigns = campaigns.map(campaign => ({
        ...campaign,
        customer_name: campaign.customers?.name,
        customer_phone: campaign.customers?.phone,
        sent_at_display: campaign.sent_at 
          ? new Date(campaign.sent_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: 'numeric',
              minute: '2-digit'
            })
          : null,
        status_display: campaign.delivery_status === 'sent' ? 'Sent' :
                       campaign.delivery_status === 'delivered' ? 'Delivered' :
                       campaign.delivery_status === 'failed' ? 'Failed' : 'Pending'
      }));

      return NextResponse.json({
        campaigns: formattedCampaigns,
        total: formattedCampaigns.length,
        campaign_type: campaignType
      });

    } catch (err) {
      // Graceful fallback if campaign tables don't exist
      return NextResponse.json({
        campaigns: [],
        message: 'Campaign history not available. Database migration required.',
        migration_needed: true
      });
    }

  } catch (error) {
    console.error('Campaign history fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}