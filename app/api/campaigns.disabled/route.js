/**
 * Email Campaigns API
 * 
 * Handles CRUD operations for email marketing campaigns:
 * - GET: List campaigns with analytics
 * - POST: Create and send new campaigns
 * - PUT: Update campaign settings
 * - DELETE: Remove campaigns
 * 
 * @version 1.0.0
 */

import { NextResponse } from 'next/server';
const { sendGridService } = require('./sendgrid-service.js');
import { supabase } from '../../../lib/supabase';

/**
 * GET /api/campaigns
 * List user's email campaigns with analytics
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const campaignId = searchParams.get('campaignId');
        const limit = parseInt(searchParams.get('limit')) || 50;
        const offset = parseInt(searchParams.get('offset')) || 0;

        if (!userId) {
            return NextResponse.json(
                { error: 'userId parameter is required' },
                { status: 400 }
            );
        }

        // Get specific campaign details
        if (campaignId) {
            const analytics = await sendGridService.getCampaignAnalytics(campaignId, userId);
            return NextResponse.json({
                success: true,
                campaign: analytics
            });
        }

        // Get campaigns list
        const { data: campaigns, error } = await supabase
            .from('campaign_analytics')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            console.error('Error fetching campaigns:', error);
            return NextResponse.json(
                { error: 'Failed to fetch campaigns' },
                { status: 500 }
            );
        }

        // Calculate summary statistics
        const totalSent = campaigns.reduce((sum, c) => sum + (c.emails_sent || 0), 0);
        const totalOpened = campaigns.reduce((sum, c) => sum + (c.emails_opened || 0), 0);
        const totalClicked = campaigns.reduce((sum, c) => sum + (c.emails_clicked || 0), 0);
        const totalRevenue = campaigns.reduce((sum, c) => sum + (c.total_charged || 0), 0);
        const totalProfit = campaigns.reduce((sum, c) => sum + (c.profit_margin || 0), 0);

        return NextResponse.json({
            success: true,
            campaigns,
            summary: {
                totalCampaigns: campaigns.length,
                totalSent,
                totalOpened,
                totalClicked,
                averageOpenRate: totalSent > 0 ? (totalOpened / totalSent) : 0,
                averageClickRate: totalSent > 0 ? (totalClicked / totalSent) : 0,
                totalRevenue,
                totalProfit,
                profitMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) : 0
            },
            pagination: {
                limit,
                offset,
                hasMore: campaigns.length === limit
            }
        });

    } catch (error) {
        console.error('Campaigns API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/campaigns
 * Create and send new email campaign
 */
export async function POST(request) {
    try {
        const body = await request.json();
        const {
            userId,
            campaignName,
            subject,
            htmlContent,
            textContent,
            fromEmail,
            fromName,
            recipients,
            templateId,
            segmentId,
            planTier = 'PROFESSIONAL',
            scheduleAt,
            personalizationData = {}
        } = body;

        // Validation
        if (!userId || !campaignName || !subject || !htmlContent) {
            return NextResponse.json(
                { error: 'Missing required fields: userId, campaignName, subject, htmlContent' },
                { status: 400 }
            );
        }

        if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
            return NextResponse.json(
                { error: 'Recipients array is required and cannot be empty' },
                { status: 400 }
            );
        }

        // Validate email format for recipients
        const invalidEmails = recipients.filter(r => !isValidEmail(r.email));
        if (invalidEmails.length > 0) {
            return NextResponse.json(
                { error: `Invalid email addresses: ${invalidEmails.map(r => r.email).join(', ')}` },
                { status: 400 }
            );
        }

        // If scheduled, save campaign for later sending
        if (scheduleAt && new Date(scheduleAt) > new Date()) {
            const scheduledCampaign = await scheduleEmailCampaign({
                userId,
                campaignName,
                subject,
                htmlContent,
                textContent,
                fromEmail,
                fromName,
                recipients,
                templateId,
                planTier,
                scheduleAt,
                personalizationData
            });

            return NextResponse.json({
                success: true,
                message: 'Campaign scheduled successfully',
                campaignId: scheduledCampaign.campaign_id,
                scheduledAt: scheduleAt
            });
        }

        // Send campaign immediately
        const campaignConfig = {
            campaignName,
            recipients,
            subject,
            htmlContent,
            textContent,
            fromEmail: fromEmail || process.env.DEFAULT_FROM_EMAIL || 'noreply@6fb.com',
            fromName: fromName || '6FB Barbershop',
            planTier,
            templateId,
            personalizationData,
            userId,
            segmentCriteria: segmentId ? { segmentId } : {}
        };

        const result = await sendGridService.sendEmailCampaign(campaignConfig);

        return NextResponse.json({
            success: true,
            message: 'Campaign sent successfully',
            ...result
        });

    } catch (error) {
        console.error('Campaign creation error:', error);
        
        return NextResponse.json(
            { 
                error: 'Failed to create campaign',
                details: error.message 
            },
            { status: 500 }
        );
    }
}

/**
 * PUT /api/campaigns
 * Update campaign settings (for scheduled campaigns)
 */
export async function PUT(request) {
    try {
        const body = await request.json();
        const { campaignId, userId, updates } = body;

        if (!campaignId || !userId) {
            return NextResponse.json(
                { error: 'campaignId and userId are required' },
                { status: 400 }
            );
        }

        // Only allow updates to scheduled campaigns
        const { data: campaign, error: fetchError } = await supabase
            .from('campaign_analytics')
            .select('*')
            .eq('campaign_id', campaignId)
            .eq('user_id', userId)
            .single();

        if (fetchError || !campaign) {
            return NextResponse.json(
                { error: 'Campaign not found' },
                { status: 404 }
            );
        }

        if (campaign.sent_at) {
            return NextResponse.json(
                { error: 'Cannot update campaigns that have already been sent' },
                { status: 400 }
            );
        }

        // Update campaign
        const { error: updateError } = await supabase
            .from('campaign_analytics')
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('campaign_id', campaignId)
            .eq('user_id', userId);

        if (updateError) {
            console.error('Error updating campaign:', updateError);
            return NextResponse.json(
                { error: 'Failed to update campaign' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Campaign updated successfully'
        });

    } catch (error) {
        console.error('Campaign update error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/campaigns
 * Delete campaign (only if not sent)
 */
export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url);
        const campaignId = searchParams.get('campaignId');
        const userId = searchParams.get('userId');

        if (!campaignId || !userId) {
            return NextResponse.json(
                { error: 'campaignId and userId are required' },
                { status: 400 }
            );
        }

        // Check if campaign exists and hasn't been sent
        const { data: campaign, error: fetchError } = await supabase
            .from('campaign_analytics')
            .select('sent_at')
            .eq('campaign_id', campaignId)
            .eq('user_id', userId)
            .single();

        if (fetchError || !campaign) {
            return NextResponse.json(
                { error: 'Campaign not found' },
                { status: 404 }
            );
        }

        if (campaign.sent_at) {
            return NextResponse.json(
                { error: 'Cannot delete campaigns that have been sent' },
                { status: 400 }
            );
        }

        // Delete campaign and related data
        const { error: deleteError } = await supabase
            .from('campaign_analytics')
            .delete()
            .eq('campaign_id', campaignId)
            .eq('user_id', userId);

        if (deleteError) {
            console.error('Error deleting campaign:', deleteError);
            return NextResponse.json(
                { error: 'Failed to delete campaign' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Campaign deleted successfully'
        });

    } catch (error) {
        console.error('Campaign deletion error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * Schedule email campaign for later sending
 */
async function scheduleEmailCampaign(campaignData) {
    const campaignId = `scheduled_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Calculate costs for scheduled campaign
    const sendGridCost = campaignData.recipients.length * 0.001;
    const markupRate = {
        'STARTER': 0.95,
        'PROFESSIONAL': 0.80,
        'BUSINESS': 0.65,
        'ENTERPRISE': 0.50
    }[campaignData.planTier] || 0.80;
    
    const platformMarkup = sendGridCost * markupRate;
    const totalCharged = sendGridCost + platformMarkup;

    const { data, error } = await supabase
        .from('campaign_analytics')
        .insert({
            user_id: campaignData.userId,
            campaign_id: campaignId,
            campaign_name: campaignData.campaignName,
            campaign_type: 'marketing',
            plan_tier: campaignData.planTier.toLowerCase(),
            subject_line: campaignData.subject,
            from_email: campaignData.fromEmail,
            from_name: campaignData.fromName,
            template_id: campaignData.templateId,
            personalization_data: campaignData.personalizationData,
            sendgrid_cost: sendGridCost,
            platform_markup_rate: markupRate,
            platform_markup: platformMarkup,
            total_charged: totalCharged,
            profit_margin: platformMarkup,
            // Don't set sent_at - indicates scheduled
            created_at: new Date().toISOString()
        })
        .select()
        .single();

    if (error) {
        throw new Error(`Failed to schedule campaign: ${error.message}`);
    }

    return data;
}

/**
 * Email validation helper
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * OPTIONS /api/campaigns
 * CORS preflight support
 */
export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}