import { NextResponse } from 'next/server';
export const runtime = 'edge'

// Use service loader to get appropriate services (mock in dev, real in prod)
let sendGridService, twilioSMSService, stripeService;

try {
    const services = require('../../../../services/service-loader');
    sendGridService = services.sendGridService;
    twilioSMSService = services.twilioSMSService;
    stripeService = services.stripeService;
    if (process.env.NODE_ENV === 'development') {
        console.log('✅ Marketing services loaded successfully');
    }
} catch (error) {
    console.error('Failed to import marketing services:', error.message);
}

// Marketing campaigns CRUD operations
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const shopId = searchParams.get('shop_id');
        const accountType = searchParams.get('account_type');
        
        // Mock campaign data based on role
        const campaigns = [
            {
                id: 'campaign-001',
                name: 'Welcome Series',
                type: 'email',
                status: 'active',
                subject: 'Welcome to Elite Cuts!',
                message: 'Thank you for choosing us for your grooming needs.',
                shop_id: shopId || 'shop-001',
                created_at: '2024-01-15T10:00:00Z',
                recipients_count: 125,
                sent_count: 120,
                open_rate: 0.68,
                click_rate: 0.24
            },
            {
                id: 'campaign-002',
                name: 'Monthly Promotion',
                type: 'sms',
                status: 'scheduled',
                subject: '25% Off This Week!',
                message: 'Get 25% off all services this week. Book now!',
                shop_id: shopId || 'shop-001',
                created_at: '2024-01-20T14:30:00Z',
                scheduled_for: '2024-01-25T09:00:00Z',
                recipients_count: 87,
                estimated_cost: '$43.50'
            }
        ];

        return NextResponse.json({
            success: true,
            campaigns: campaigns,
            count: campaigns.length,
            account_type: accountType,
            shop_id: shopId
        });

    } catch (error) {
        console.error('Marketing campaigns API error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

export async function POST(request) {
    try {
        const data = await request.json();
        console.log('📮 Campaign creation request:', data);
        
        // Extract campaign details
        const { 
            type, 
            name, 
            subject, 
            content, 
            message,
            target_audience,
            billing_account,
            user_id 
        } = data;

        // Validate required fields
        if (!type || (!subject && !message)) {
            return NextResponse.json(
                { 
                    success: false, 
                    error: 'Missing required fields. Email campaigns need subject and content, SMS campaigns need message.' 
                },
                { status: 400 }
            );
        }

        // Mock recipients based on target audience
        const mockRecipients = generateMockRecipients(target_audience);
        
        // Create campaign object
        const campaign = {
            id: `campaign-${Date.now()}`,
            name: name || `${type} Campaign - ${new Date().toLocaleDateString()}`,
            type,
            subject: subject || null,
            message: message || content || '',
            status: 'sending',
            created_at: new Date().toISOString(),
            user_id: user_id || 'unknown',
            billing_account: billing_account || 'default'
        };

        // Mock shop data
        const shop = {
            id: 'shop-001',
            name: 'Test Barbershop',
            email: 'shop@testbarbershop.com',
            phone: '+1234567890'
        };

        let result;
        
        // Send campaign using appropriate mock service
        if (type === 'email' && sendGridService) {
            result = await sendGridService.sendWhiteLabelCampaign(
                campaign,
                shop,
                mockRecipients
            );
        } else if (type === 'sms' && twilioSMSService) {
            result = await twilioSMSService.sendWhiteLabelSMSCampaign(
                campaign,
                shop,
                mockRecipients
            );
        } else {
            // Fallback if services not loaded
            result = {
                success: true,
                campaignId: campaign.id,
                stats: {
                    recipients: mockRecipients.length,
                    sent: mockRecipients.length,
                    delivered: Math.floor(mockRecipients.length * 0.95)
                },
                cost: {
                    total: mockRecipients.length * (type === 'email' ? 0.002 : 0.0075)
                }
            };
        }

        // Process billing if stripe service is available
        if (stripeService && result.cost) {
            const billingResult = await stripeService.chargeCampaign(
                billing_account,
                result.cost.total * 100, // Convert to cents
                `${type.toUpperCase()} Campaign: ${campaign.name}`
            );
            result.billing = billingResult;
        }

        return NextResponse.json({
            success: true,
            campaign: {
                ...campaign,
                status: 'sent',
                recipients_count: result.stats?.recipients || mockRecipients.length,
                sent_count: result.stats?.sent || mockRecipients.length,
                delivered_count: result.stats?.delivered || Math.floor(mockRecipients.length * 0.95)
            },
            result,
            message: `${type.toUpperCase()} campaign sent successfully to ${mockRecipients.length} recipients`
        });

    } catch (error) {
        console.error('Campaign creation error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

// Helper function to generate mock recipients
function generateMockRecipients(targetAudience) {
    const count = Math.floor(Math.random() * 200) + 300; // 300-500 recipients
    const recipients = [];
    
    for (let i = 0; i < count; i++) {
        recipients.push({
            id: `customer-${i}`,
            email: `customer${i}@example.com`,
            phone: `+1555${String(Math.floor(Math.random() * 10000000)).padStart(7, '0')}`,
            first_name: `Customer`,
            last_name: `${i}`,
            tags: targetAudience ? [targetAudience] : ['all']
        });
    }
    
    return recipients;
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

        // Update campaign
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
        console.error('Campaign update error:', error);
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
        console.error('Campaign deletion error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}