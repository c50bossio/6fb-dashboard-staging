import { NextResponse } from 'next/server';
import path from 'path';

// Import marketing services with absolute paths
const sendGridServicePath = path.join(process.cwd(), 'services', 'sendgrid-service.js');
const twilioServicePath = path.join(process.cwd(), 'services', 'twilio-service.js');

let sendGridService, twilioService;

try {
    const { sendGridEmailService } = require(sendGridServicePath);
    const { twilioSMSService } = require(twilioServicePath);
    sendGridService = sendGridEmailService;
    twilioService = twilioSMSService;
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
        const { type, campaign, shop, recipients } = data;

        if (!campaign || !shop || !recipients) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields: campaign, shop, recipients' },
                { status: 400 }
            );
        }

        // Create new campaign
        const newCampaign = {
            id: `campaign-${Date.now()}`,
            ...campaign,
            shop_id: shop.id,
            created_at: new Date().toISOString(),
            status: 'draft',
            recipients_count: recipients.length
        };

        return NextResponse.json({
            success: true,
            campaign: newCampaign,
            message: 'Campaign created successfully'
        });

    } catch (error) {
        console.error('Campaign creation error:', error);
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