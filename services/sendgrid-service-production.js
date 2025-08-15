/**
 * Production SendGrid Email Service
 * Full-featured email service with batching, webhooks, and compliance
 */

const sgMail = require('@sendgrid/mail');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const RateLimiter = require('limiter').RateLimiter;

let supabase;
function getSupabase() {
    if (!supabase && process.env.NEXT_PUBLIC_SUPABASE_URL) {
        supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );
    }
    return supabase;
}

class ProductionSendGridService {
    constructor() {
        this.apiKey = process.env.SENDGRID_API_KEY;
        this.fromEmail = process.env.SENDGRID_FROM_EMAIL || 'support@6fbmentorship.com';
        this.fromName = process.env.SENDGRID_FROM_NAME || '6FB AI System';
        this.webhookSecret = process.env.SENDGRID_WEBHOOK_SECRET;
        
        this.rateLimiter = new RateLimiter({
            tokensPerInterval: parseInt(process.env.SENDGRID_RATE_LIMIT_PER_SECOND) || 100,
            interval: 'second'
        });
        
        this.maxBatchSize = parseInt(process.env.SENDGRID_BATCH_SIZE) || 1000;
        this.maxPersonalizations = parseInt(process.env.SENDGRID_MAX_PERSONALIZATIONS) || 1000;
        
        this.unsubscribeUrl = process.env.UNSUBSCRIBE_URL || 'https://6fbmentorship.com/unsubscribe';
        this.physicalAddress = process.env.PHYSICAL_ADDRESS || '123 Business St, City, State 12345';
        this.companyName = process.env.COMPANY_NAME || '6FB AI Agent System';
        
        if (this.apiKey && !this.apiKey.includes('placeholder')) {
            sgMail.setApiKey(this.apiKey);
            this.initialized = true;
        } else {
            console.warn('⚠️ SendGrid API key not configured');
            this.initialized = false;
        }
        
        this.metrics = {
            emailsSent: 0,
            emailsFailed: 0,
            batchesProcessed: 0,
            webhooksProcessed: 0
        };
    }

    /**
     * Send campaign with batching and rate limiting
     */
    async sendCampaign(campaign, recipients) {
        if (!this.initialized) {
            throw new Error('SendGrid service not initialized');
        }

        const results = {
            success: true,
            sent: [],
            failed: [],
            batches: 0,
            totalCost: 0
        };

        try {
            const validRecipients = await this.filterUnsubscribed(recipients, campaign.owner_id);
            
            const batches = this.createBatches(validRecipients, this.maxBatchSize);
            
            for (const batch of batches) {
                await this.rateLimiter.removeTokens(1);
                
                const batchResult = await this.sendBatch(campaign, batch);
                results.batches++;
                
                if (batchResult.success) {
                    results.sent.push(...batchResult.sent);
                } else {
                    results.failed.push(...batchResult.failed);
                }
                
                results.totalCost += this.calculateCost(batch.length, campaign.owner_type);
                
                await this.delay(100);
            }
            
            await this.storeCampaignResults(campaign.id, results);
            
            this.metrics.emailsSent += results.sent.length;
            this.metrics.emailsFailed += results.failed.length;
            this.metrics.batchesProcessed += results.batches;
            
        } catch (error) {
            console.error('Campaign send error:', error);
            results.success = false;
            results.error = error.message;
        }
        
        return results;
    }

    /**
     * Send a batch of emails
     */
    async sendBatch(campaign, recipients) {
        const personalizations = recipients.map(recipient => ({
            to: recipient.email,
            substitutions: {
                first_name: recipient.first_name || 'Valued Customer',
                last_name: recipient.last_name || '',
                barbershop_name: campaign.barbershop_name || this.companyName,
                unsubscribe_url: `${this.unsubscribeUrl}?email=${encodeURIComponent(recipient.email)}&campaign=${campaign.id}`
            }
        }));

        const msg = {
            personalizations,
            from: {
                email: this.fromEmail,
                name: campaign.barbershop_name || this.fromName
            },
            subject: campaign.subject,
            html: this.buildEmailContent(campaign),
            categories: ['marketing', campaign.type, `campaign-${campaign.id}`],
            customArgs: {
                campaign_id: campaign.id,
                owner_id: campaign.owner_id,
                owner_type: campaign.owner_type
            },
            trackingSettings: {
                clickTracking: { enable: true },
                openTracking: { enable: true },
                subscriptionTracking: {
                    enable: true,
                    text: 'Unsubscribe from marketing emails',
                    html: `<a href="${this.unsubscribeUrl}">Unsubscribe</a>`
                }
            }
        };

        try {
            const response = await sgMail.send(msg);
            
            await this.storeRecipientRecords(campaign.id, recipients, 'sent');
            
            return {
                success: true,
                sent: recipients,
                messageId: response[0].headers['x-message-id']
            };
        } catch (error) {
            console.error('Batch send error:', error);
            
            await this.storeRecipientRecords(campaign.id, recipients, 'failed', error.message);
            
            return {
                success: false,
                failed: recipients,
                error: error.message
            };
        }
    }

    /**
     * Build email content with compliance footer
     */
    buildEmailContent(campaign) {
        const unsubscribeLink = `${this.unsubscribeUrl}?campaign=${campaign.id}`;
        
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${campaign.subject}</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
                    .content { padding: 20px; background: #f9fafb; }
                    .footer { padding: 20px; font-size: 12px; color: #666; text-align: center; }
                    .button { display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 5px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>${campaign.barbershop_name || this.companyName}</h1>
                    </div>
                    <div class="content">
                        ${campaign.html_content || campaign.message}
                    </div>
                    <div class="footer">
                        <p>${this.companyName}<br>
                        ${this.physicalAddress}</p>
                        <p>
                            You received this email because you are subscribed to marketing emails from ${campaign.barbershop_name || this.companyName}.
                            <br>
                            <a href="${unsubscribeLink}">Unsubscribe</a> | 
                            <a href="${this.unsubscribeUrl}/preferences">Update Preferences</a>
                        </p>
                    </div>
                </div>
            </body>
            </html>
        `;
    }

    /**
     * Process webhook from SendGrid
     */
    async processWebhook(body, signature) {
        if (!this.verifyWebhookSignature(body, signature)) {
            throw new Error('Invalid webhook signature');
        }

        const events = JSON.parse(body);
        const results = {
            processed: 0,
            errors: 0
        };

        for (const event of events) {
            try {
                await this.processWebhookEvent(event);
                results.processed++;
            } catch (error) {
                console.error('Webhook event processing error:', error);
                results.errors++;
            }
        }

        this.metrics.webhooksProcessed += results.processed;
        return results;
    }

    /**
     * Process individual webhook event
     */
    async processWebhookEvent(event) {
        const { event: eventType, email, campaign_id, timestamp } = event;
        
        const statusMap = {
            'delivered': 'delivered',
            'open': 'opened',
            'click': 'clicked',
            'bounce': 'bounced',
            'dropped': 'failed',
            'spamreport': 'complained',
            'unsubscribe': 'unsubscribed'
        };

        const status = statusMap[eventType];
        if (!status) return;

        const { error } = await getSupabase()
            .from('campaign_recipients')
            .update({
                status,
                [`${status}_at`]: new Date(timestamp * 1000).toISOString(),
                provider_status: eventType,
                updated_at: new Date().toISOString()
            })
            .eq('campaign_id', campaign_id)
            .eq('email', email);

        if (error) {
            console.error('Failed to update recipient status:', error);
        }

        if (eventType === 'unsubscribe' || eventType === 'spamreport') {
            await this.handleUnsubscribe(email, campaign_id, eventType);
        }

        await this.updateCampaignMetrics(campaign_id, eventType);
    }

    /**
     * Verify webhook signature
     */
    verifyWebhookSignature(body, signature) {
        if (!this.webhookSecret) {
            console.warn('Webhook secret not configured');
            return true; // Allow in development
        }

        const timestamp = signature.split(' ')[0].split('=')[1];
        const providedSignature = signature.split(' ')[1].split('=')[1];
        
        const payload = timestamp + body;
        const calculatedSignature = crypto
            .createHmac('sha256', this.webhookSecret)
            .update(payload)
            .digest('base64');

        return calculatedSignature === providedSignature;
    }

    /**
     * Filter out unsubscribed recipients
     */
    async filterUnsubscribed(recipients, ownerId) {
        const emails = recipients.map(r => r.email);
        
        const { data: unsubscribed } = await getSupabase()
            .from('email_unsubscribes')
            .select('email')
            .in('email', emails)
            .eq('owner_id', ownerId);

        const unsubscribedEmails = new Set(unsubscribed?.map(u => u.email) || []);
        
        return recipients.filter(r => !unsubscribedEmails.has(r.email));
    }

    /**
     * Handle unsubscribe
     */
    async handleUnsubscribe(email, campaignId, method) {
        const { error } = await getSupabase()
            .from('email_unsubscribes')
            .upsert({
                email,
                campaign_id: campaignId,
                unsubscribe_method: method,
                unsubscribed_at: new Date().toISOString()
            });

        if (error) {
            console.error('Failed to record unsubscribe:', error);
        }
    }

    /**
     * Store campaign results
     */
    async storeCampaignResults(campaignId, results) {
        const { error } = await getSupabase()
            .from('marketing_campaigns')
            .update({
                sent_count: results.sent.length,
                status: results.success ? 'completed' : 'failed',
                completed_at: new Date().toISOString()
            })
            .eq('id', campaignId);

        if (error) {
            console.error('Failed to update campaign results:', error);
        }
    }

    /**
     * Store recipient records
     */
    async storeRecipientRecords(campaignId, recipients, status, errorMessage = null) {
        const records = recipients.map(recipient => ({
            campaign_id: campaignId,
            customer_id: recipient.id,
            email: recipient.email,
            first_name: recipient.first_name,
            last_name: recipient.last_name,
            status,
            sent_at: status === 'sent' ? new Date().toISOString() : null,
            failed_at: status === 'failed' ? new Date().toISOString() : null,
            error_message: errorMessage,
            provider: 'sendgrid'
        }));

        const { error } = await getSupabase()
            .from('campaign_recipients')
            .insert(records);

        if (error) {
            console.error('Failed to store recipient records:', error);
        }
    }

    /**
     * Update campaign metrics
     */
    async updateCampaignMetrics(campaignId, eventType) {
        const metricMap = {
            'delivered': 'delivered_count',
            'open': 'opened_count',
            'click': 'clicked_count',
            'bounce': 'bounced_count',
            'unsubscribe': 'unsubscribed_count',
            'spamreport': 'complained_count'
        };

        const metric = metricMap[eventType];
        if (!metric) return;

        const { error } = await getSupabase().rpc('increment_campaign_metric', {
            campaign_id: campaignId,
            metric_name: metric
        });

        if (error) {
            console.error('Failed to update campaign metrics:', error);
        }
    }

    /**
     * Calculate email cost with markup
     */
    calculateCost(recipientCount, ownerType) {
        const baseCost = parseFloat(process.env.EMAIL_BASE_COST_CENTS) / 100 || 0.001;
        const markupRates = {
            barber: parseFloat(process.env.MARKUP_RATE_BARBER) / 100 || 3.95,
            shop: parseFloat(process.env.MARKUP_RATE_SHOP) / 100 || 2.80,
            enterprise: parseFloat(process.env.MARKUP_RATE_ENTERPRISE) / 100 || 1.50
        };

        const markupRate = markupRates[ownerType] || markupRates.shop;
        const serviceCost = recipientCount * baseCost;
        const platformFee = serviceCost * markupRate;
        const totalCharge = serviceCost + platformFee;

        return {
            recipientCount,
            serviceCost,
            platformFee,
            totalCharge,
            markupRate,
            profitMargin: (platformFee / totalCharge * 100).toFixed(2)
        };
    }

    /**
     * Create batches from recipients
     */
    createBatches(recipients, batchSize) {
        const batches = [];
        for (let i = 0; i < recipients.length; i += batchSize) {
            batches.push(recipients.slice(i, i + batchSize));
        }
        return batches;
    }

    /**
     * Delay helper
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get service metrics
     */
    getMetrics() {
        return this.metrics;
    }

    /**
     * Health check
     */
    async healthCheck() {
        try {
            if (this.initialized) {
                const response = await sgMail.send({
                    to: 'test@example.com',
                    from: this.fromEmail,
                    subject: 'Health Check',
                    text: 'Health check',
                    mailSettings: {
                        sandboxMode: { enable: true }
                    }
                });
                
                return {
                    healthy: true,
                    service: 'sendgrid',
                    metrics: this.metrics
                };
            }
            
            return {
                healthy: false,
                service: 'sendgrid',
                error: 'Not initialized'
            };
        } catch (error) {
            return {
                healthy: false,
                service: 'sendgrid',
                error: error.message
            };
        }
    }
}

const sendGridService = new ProductionSendGridService();
module.exports = sendGridService;

module.exports.ProductionSendGridService = ProductionSendGridService;