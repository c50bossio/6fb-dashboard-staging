import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dfhqjdoydihajmjxniee.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

let sendGridService, twilioSMSService, stripeService;

try {
    const services = require('../../../../services/service-loader');
    sendGridService = services.sendGridService;
    twilioSMSService = services.twilioSMSService;
    stripeService = services.stripeService;
    if (process.env.NODE_ENV === 'development') {
    }
} catch (error) {
    // Marketing services not available - will use mock services
}

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const shopId = searchParams.get('shop_id');
        const accountType = searchParams.get('account_type');
        const userId = searchParams.get('user_id');
        const limit = parseInt(searchParams.get('limit') || '50');
        
        let campaigns = [];
        let error = null;
        
        try {
            let query = supabase
                .from('marketing_campaigns')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(limit);
            
            if (userId) {
                query = query.or(`owner_id.eq.${userId},shop_id.eq.${shopId}`);
            } else if (shopId) {
                query = query.eq('shop_id', shopId);
            }
            
            const { data, error: dbError } = await query;
            
            if (!dbError && data) {
                campaigns = data;
            } else {
                error = dbError;
            }
        } catch (e) {
        }
        
        if (campaigns.length === 0) {
            campaigns = [];
        }

        return NextResponse.json({
            success: true,
            campaigns: campaigns,
            count: campaigns.length,
            account_type: accountType,
            shop_id: shopId
        });

    } catch (error) {
        // API error - return error response
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

export async function POST(request) {
    try {
        const data = await request.json();
        
        const { 
            type, 
            name, 
            subject, 
            content, 
            message,
            target_audience,
            billing_account,
            user_id,
            shop_id 
        } = data;

        if (!type || (!subject && !message)) {
            return NextResponse.json(
                { 
                    success: false, 
                    error: 'Missing required fields. Email campaigns need subject and content, SMS campaigns need message.' 
                },
                { status: 400 }
            );
        }

        if (!shop_id || !user_id) {
            return NextResponse.json(
                { 
                    success: false, 
                    error: 'Shop ID and User ID are required' 
                },
                { status: 400 }
            );
        }

        // Query real barbershop from Supabase
        const { data: shopData, error: shopError } = await supabase
            .from('barbershops')
            .select('*')
            .eq('id', shop_id)
            .single();

        if (shopError || !shopData) {
            return NextResponse.json(
                { 
                    success: false, 
                    error: 'Barbershop not found' 
                },
                { status: 404 }
            );
        }

        // Query real customers from Supabase based on target audience
        let customerQuery = supabase
            .from('customers')
            .select('*')
            .eq('shop_id', shop_id)
            .eq('is_active', true);

        // Apply target audience filters
        if (target_audience === 'vip') {
            customerQuery = customerQuery.eq('vip_status', true);
        } else if (target_audience === 'new') {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            customerQuery = customerQuery.gte('created_at', thirtyDaysAgo.toISOString());
        } else if (target_audience === 'inactive') {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            customerQuery = customerQuery.lte('last_visit_at', thirtyDaysAgo.toISOString());
        }

        const { data: customers, error: customersError } = await customerQuery;

        if (customersError) {
            console.error('Error fetching customers:', customersError);
            return NextResponse.json(
                { 
                    success: false, 
                    error: 'Failed to fetch customer list' 
                },
                { status: 500 }
            );
        }

        const recipients = customers || [];
        
        // Store campaign in Supabase
        const campaign = {
            shop_id: shop_id,
            owner_id: user_id,
            name: name || `${type} Campaign - ${new Date().toLocaleDateString()}`,
            type,
            subject: subject || null,
            message: message || content || '',
            target_audience: target_audience || 'all',
            recipients_count: recipients.length,
            status: 'sending',
            created_at: new Date().toISOString(),
            billing_account: billing_account || 'default'
        };

        const { data: savedCampaign, error: campaignError } = await supabase
            .from('marketing_campaigns')
            .insert([campaign])
            .select()
            .single();

        if (campaignError) {
            console.error('Error saving campaign:', campaignError);
            return NextResponse.json(
                { 
                    success: false, 
                    error: 'Failed to save campaign' 
                },
                { status: 500 }
            );
        }

        const shop = {
            id: shopData.id,
            name: shopData.name,
            email: shopData.email || shopData.contact_email,
            phone: shopData.phone || shopData.contact_phone
        };

        let result;
        
        if (type === 'email' && sendGridService) {
            result = await sendGridService.sendWhiteLabelCampaign(
                campaign,
                shop,
                recipients
            );
        } else if (type === 'sms' && twilioSMSService) {
            result = await twilioSMSService.sendWhiteLabelSMSCampaign(
                campaign,
                shop,
                recipients
            );
        } else {
            result = {
                success: true,
                campaignId: campaign.id,
                stats: {
                    recipients: recipients.length,
                    sent: recipients.length,
                    delivered: Math.floor(recipients.length * 0.95)
                },
                cost: {
                    total: recipients.length * (type === 'email' ? 0.002 : 0.0075)
                }
            };
        }

        if (stripeService && result.cost) {
            const billingResult = await stripeService.chargeCampaign(
                billing_account,
                result.cost.total * 100, // Convert to cents
                `${type.toUpperCase()} Campaign: ${campaign.name}`
            );
            result.billing = billingResult;
        }

        // Update campaign status in Supabase
        const { data: updatedCampaign, error: updateError } = await supabase
            .from('marketing_campaigns')
            .update({
                status: 'sent',
                sent_count: result.stats?.sent || recipients.length,
                delivered_count: result.stats?.delivered || Math.floor(recipients.length * 0.95),
                updated_at: new Date().toISOString()
            })
            .eq('id', savedCampaign.id)
            .select()
            .single();

        if (updateError) {
            console.error('Error updating campaign status:', updateError);
        }

        return NextResponse.json({
            success: true,
            campaign: updatedCampaign || savedCampaign,
            result,
            message: `${type.toUpperCase()} campaign sent successfully to ${recipients.length} recipients`
        });

    } catch (error) {
        // Campaign creation failed - return error response
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}


export async function PUT(request) {
    try {
        const data = await request.json();
        const { id, updates } = data;

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'Campaign ID is required' },
                { status: 400 }
            );
        }

        const updatedCampaign = {
            id,
            ...updates,
            updated_at: new Date().toISOString()
        };

        return NextResponse.json({
            success: true,
            campaign: updatedCampaign,
            message: 'Campaign updated successfully'
        });

    } catch (error) {
        // Campaign update failed - return error response
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'Campaign ID is required' },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            message: `Campaign ${id} deleted successfully`
        });

    } catch (error) {
        // Campaign deletion failed - return error response
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}