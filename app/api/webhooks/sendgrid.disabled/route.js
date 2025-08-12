/**
 * SendGrid Webhook Handler
 * 
 * Processes SendGrid webhook events for email tracking:
 * - Delivered, Bounced, Opened, Clicked
 * - Unsubscribes and Spam Reports
 * - Updates campaign analytics in real-time
 * 
 * @version 1.0.0
 */

import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { sendGridService } from './sendgrid-service.js';

// Webhook event types we track
const TRACKED_EVENTS = [
    'delivered',
    'bounce', 
    'open',
    'click',
    'unsubscribe',
    'spamreport',
    'dropped',
    'deferred'
];

/**
 * POST /api/webhooks/sendgrid
 * Handle SendGrid webhook events
 */
export async function POST(request) {
    try {
        // Get raw body for signature verification
        const body = await request.text();
        const signature = request.headers.get('x-twilio-email-event-webhook-signature');
        const timestamp = request.headers.get('x-twilio-email-event-webhook-timestamp');
        
        // Verify webhook signature for security
        if (!verifyWebhookSignature(body, signature, timestamp)) {
            console.error('Invalid webhook signature');
            return NextResponse.json(
                { error: 'Invalid signature' }, 
                { status: 401 }
            );
        }
        
        // Parse events
        const events = JSON.parse(body);
        
        console.log(`Processing ${events.length} SendGrid webhook events`);
        
        // Process each event
        const results = await Promise.allSettled(
            events.map(event => processWebhookEvent(event))
        );
        
        // Count successes and failures
        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;
        
        if (failed > 0) {
            console.error(`${failed} webhook events failed to process`);
            results.forEach((result, index) => {
                if (result.status === 'rejected') {
                    console.error(`Event ${index} failed:`, result.reason);
                }
            });
        }
        
        return NextResponse.json({
            success: true,
            processed: successful,
            failed: failed,
            total: events.length
        });
        
    } catch (error) {
        console.error('Webhook processing error:', error);
        
        return NextResponse.json(
            { 
                error: 'Webhook processing failed',
                details: error.message 
            },
            { status: 500 }
        );
    }
}

/**
 * Process individual webhook event
 */
async function processWebhookEvent(event) {
    try {
        const { 
            event: eventType, 
            email, 
            timestamp,
            sg_message_id,
            smtp_id,
            category,
            asm_group_id,
            reason,
            status,
            response,
            url,
            url_offset,
            useragent,
            ip
        } = event;
        
        // Only process events we track
        if (!TRACKED_EVENTS.includes(eventType)) {
            console.log(`Ignoring untracked event type: ${eventType}`);
            return;
        }
        
        // Extract campaign ID from custom args or category
        const campaignId = extractCampaignId(event);
        
        if (!campaignId) {
            console.log(`No campaign ID found for event: ${eventType} - ${email}`);
            return;
        }
        
        console.log(`Processing ${eventType} event for campaign ${campaignId} - ${email}`);
        
        // Process event through SendGrid service
        await sendGridService.processWebhookEvent({
            event: eventType,
            email,
            timestamp,
            sg_message_id: sg_message_id || smtp_id,
            campaign_id: campaignId,
            metadata: {
                reason,
                status,
                response,
                url: eventType === 'click' ? url : null,
                url_offset: eventType === 'click' ? url_offset : null,
                useragent,
                ip,
                asm_group_id
            }
        });
        
        // Log successful processing
        console.log(`Successfully processed ${eventType} for ${email} in campaign ${campaignId}`);
        
    } catch (error) {
        console.error('Error processing individual webhook event:', error);
        console.error('Event data:', event);
        throw error;
    }
}

/**
 * Extract campaign ID from webhook event
 */
function extractCampaignId(event) {
    // Try to get from custom args first
    if (event.campaign_id) {
        return event.campaign_id;
    }
    
    // Try to get from category array
    if (event.category && Array.isArray(event.category)) {
        const campaignCategory = event.category.find(cat => cat.startsWith('campaign_'));
        if (campaignCategory) {
            return campaignCategory;
        }
    }
    
    // Try to get from unique_args (legacy)
    if (event.unique_args && event.unique_args.campaign_id) {
        return event.unique_args.campaign_id;
    }
    
    // Try to get from sg_message_id pattern matching
    if (event.sg_message_id && event.sg_message_id.includes('campaign_')) {
        const match = event.sg_message_id.match(/campaign_[a-zA-Z0-9_-]+/);
        if (match) {
            return match[0];
        }
    }
    
    return null;
}

/**
 * Verify SendGrid webhook signature
 */
function verifyWebhookSignature(payload, signature, timestamp) {
    // Skip verification in development if no webhook key is configured
    if (process.env.NODE_ENV === 'development' && !process.env.SENDGRID_WEBHOOK_VERIFICATION_KEY) {
        console.warn('Skipping webhook signature verification in development');
        return true;
    }
    
    const verificationKey = process.env.SENDGRID_WEBHOOK_VERIFICATION_KEY;
    
    if (!verificationKey) {
        console.error('SENDGRID_WEBHOOK_VERIFICATION_KEY not configured');
        return false;
    }
    
    if (!signature || !timestamp) {
        console.error('Missing signature or timestamp headers');
        return false;
    }
    
    try {
        // SendGrid signature verification
        const expectedSignature = crypto
            .createHmac('sha256', verificationKey)
            .update(timestamp + payload)
            .digest('base64');
        
        // Compare signatures using constant-time comparison
        return crypto.timingSafeEqual(
            Buffer.from(signature, 'base64'),
            Buffer.from(expectedSignature, 'base64')
        );
        
    } catch (error) {
        console.error('Signature verification error:', error);
        return false;
    }
}

/**
 * GET /api/webhooks/sendgrid
 * Health check endpoint
 */
export async function GET() {
    return NextResponse.json({
        status: 'healthy',
        service: 'sendgrid-webhook',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        tracked_events: TRACKED_EVENTS
    });
}

/**
 * OPTIONS /api/webhooks/sendgrid
 * CORS preflight support
 */
export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, x-twilio-email-event-webhook-signature, x-twilio-email-event-webhook-timestamp',
        },
    });
}