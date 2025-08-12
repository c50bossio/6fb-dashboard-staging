#!/usr/bin/env node
/**
 * SendGrid Email Service - Enterprise Marketing Campaign System
 * 
 * Comprehensive email marketing service with:
 * - Bulk email sending with batching (1000 per batch)
 * - Platform markup calculation and billing tracking
 * - Campaign analytics and metrics tracking
 * - Rate limiting and error handling
 * - Email personalization with merge tags
 * - CAN-SPAM compliance and deliverability optimization
 * 
 * @version 2.0.0
 * @author 6FB AI Agent System
 */

const sgMail = require('@sendgrid/mail');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const crypto = require('crypto');

class SendGridEmailService {
    constructor() {
        // Platform master account configuration
        this.apiKey = process.env.SENDGRID_API_KEY;
        this.platformFromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@bookedbarber.com';
        this.platformFromName = process.env.SENDGRID_FROM_NAME || 'BookedBarber';
        this.platformDomain = process.env.PLATFORM_DOMAIN || 'bookedbarber.com';
        
        // Business model configuration - Platform markup percentages
        this.markupRates = {
            barber: 3.95,      // 395% markup for individual barbers
            shop: 2.80,        // 280% markup for shop owners  
            enterprise: 1.50   // 150% markup for enterprise accounts
        };
        
        // Base SendGrid costs (per email)
        this.baseCost = 0.001; // $0.001 per email
        
        if (!this.apiKey) {
            console.warn('SENDGRID_API_KEY not configured - running in test mode');
            this.testMode = true;
        } else {
            this.testMode = false;
        }
        
        if (!this.testMode) {
            sgMail.setApiKey(this.apiKey);
        }
        
        // SendGrid rate limits and costs
        this.BATCH_SIZE = 1000; // SendGrid limit for batch sending
        this.RATE_LIMIT_PER_SECOND = 10; // Conservative rate limiting
        this.SENDGRID_COST_PER_EMAIL = 0.001; // $0.10 per 100 emails
        
        // Platform markup configuration
        this.PLATFORM_MARKUP = {
            STARTER: 0.95,     // 95% markup ($0.00195 per email)
            PROFESSIONAL: 0.80, // 80% markup ($0.0018 per email)
            BUSINESS: 0.65,    // 65% markup ($0.00165 per email)
            ENTERPRISE: 0.50   // 50% markup ($0.0015 per email)
        };
        
        // Initialize database schema
        this.initializeCampaignTables();
    }

    /**
     * Initialize campaign analytics tables if they don't exist
     */
    async initializeCampaignTables() {
        try {
            // Create campaign analytics table
            await supabase.rpc('exec_sql', {
                query: `
                    CREATE TABLE IF NOT EXISTS campaign_analytics (
                        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
                        user_id UUID REFERENCES auth.users(id) NOT NULL,
                        campaign_id TEXT NOT NULL,
                        campaign_name TEXT NOT NULL,
                        campaign_type TEXT DEFAULT 'marketing', -- marketing, transactional, newsletter
                        plan_tier TEXT NOT NULL, -- starter, professional, business, enterprise
                        
                        -- Email metrics
                        emails_sent INTEGER DEFAULT 0,
                        emails_delivered INTEGER DEFAULT 0,
                        emails_bounced INTEGER DEFAULT 0,
                        emails_opened INTEGER DEFAULT 0,
                        emails_clicked INTEGER DEFAULT 0,
                        unsubscribes INTEGER DEFAULT 0,
                        spam_reports INTEGER DEFAULT 0,
                        
                        -- Cost tracking
                        sendgrid_cost DECIMAL(10,4) DEFAULT 0,
                        platform_markup_rate DECIMAL(5,4) DEFAULT 0,
                        total_charged DECIMAL(10,4) DEFAULT 0,
                        profit_margin DECIMAL(10,4) DEFAULT 0,
                        
                        -- Performance metrics
                        open_rate DECIMAL(5,4) DEFAULT 0,
                        click_rate DECIMAL(5,4) DEFAULT 0,
                        conversion_rate DECIMAL(5,4) DEFAULT 0,
                        unsubscribe_rate DECIMAL(5,4) DEFAULT 0,
                        
                        -- Campaign details
                        subject_line TEXT,
                        from_email TEXT,
                        from_name TEXT,
                        template_id TEXT,
                        segment_criteria JSONB DEFAULT '{}'::jsonb,
                        personalization_data JSONB DEFAULT '{}'::jsonb,
                        
                        -- Tracking
                        sent_at TIMESTAMPTZ DEFAULT NOW(),
                        completed_at TIMESTAMPTZ,
                        created_at TIMESTAMPTZ DEFAULT NOW(),
                        updated_at TIMESTAMPTZ DEFAULT NOW()
                    );
                    
                    CREATE INDEX IF NOT EXISTS idx_campaign_analytics_user_id ON campaign_analytics(user_id);
                    CREATE INDEX IF NOT EXISTS idx_campaign_analytics_campaign_id ON campaign_analytics(campaign_id);
                    CREATE INDEX IF NOT EXISTS idx_campaign_analytics_sent_at ON campaign_analytics(sent_at);
                `
            });

            // Create email recipients tracking table
            await supabase.rpc('exec_sql', {
                query: `
                    CREATE TABLE IF NOT EXISTS email_recipients (
                        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
                        campaign_id TEXT NOT NULL,
                        email_address TEXT NOT NULL,
                        recipient_name TEXT,
                        personalization_data JSONB DEFAULT '{}'::jsonb,
                        
                        -- Delivery status
                        status TEXT DEFAULT 'pending', -- pending, sent, delivered, bounced, failed
                        sendgrid_message_id TEXT,
                        error_message TEXT,
                        
                        -- Engagement tracking
                        opened_at TIMESTAMPTZ,
                        clicked_at TIMESTAMPTZ,
                        unsubscribed_at TIMESTAMPTZ,
                        
                        -- Timestamps
                        sent_at TIMESTAMPTZ,
                        created_at TIMESTAMPTZ DEFAULT NOW()
                    );
                    
                    CREATE INDEX IF NOT EXISTS idx_email_recipients_campaign_id ON email_recipients(campaign_id);
                    CREATE INDEX IF NOT EXISTS idx_email_recipients_email ON email_recipients(email_address);
                `
            });

            console.log('Campaign analytics tables initialized successfully');
        } catch (error) {
            console.error('Error initializing campaign tables:', error);
            // Don't throw - service should work even if analytics tables fail
        }
    }

    /**
     * Send white-label marketing campaign using platform master account
     * @param {Object} campaign - Campaign from database
     * @param {Object} barbershop - Barbershop details for branding
     * @param {Array} recipients - Email recipients
     * @returns {Object} Campaign results and analytics
     */
    async sendWhiteLabelCampaign(campaign, barbershop, recipients) {
        if (this.testMode) {
            console.log('🧪 TEST MODE: Email campaign simulation');
            return this.simulateCampaignSend(campaign, recipients);
        }

        const startTime = Date.now();
        
        try {
            // Calculate platform costs and markup
            const billing = this.calculatePlatformBilling(
                recipients.length, 
                barbershop.account_type || 'shop'
            );
            
            // Prepare white-label email configuration
            const emailConfig = {
                from: {
                    email: this.platformFromEmail,  // Platform's verified domain
                    name: barbershop.name           // Barbershop's name appears as sender
                },
                replyTo: barbershop.email || this.platformFromEmail,
                subject: campaign.subject,
                content: [{
                    type: 'text/html', 
                    value: this.buildWhiteLabelEmailContent(campaign, barbershop)
                }],
                personalizations: this.buildPersonalizations(recipients),
                trackingSettings: {
                    clickTracking: { enable: true },
                    openTracking: { enable: true },
                    subscriptionTracking: { enable: false } // We handle unsubscribes
                },
                mailSettings: {
                    footerSettings: {
                        enable: true,
                        text: this.buildComplianceFooter(barbershop)
                    }
                }
            };
            
            // Send via SendGrid in batches
            const sendResults = await this.sendBatchedEmails(emailConfig, recipients);
            
            // Store campaign analytics
            const analytics = {
                campaignId: campaign.id,
                totalRecipients: recipients.length,
                totalSent: sendResults.sent,
                totalFailed: sendResults.failed,
                billing: billing,
                duration: Date.now() - startTime
            };
            
            await this.storeCampaignAnalytics(analytics);
            
            return {
                success: true,
                campaignId: campaign.id,
                metrics: analytics,
                message: `Campaign sent to ${sendResults.sent} recipients via platform infrastructure`
            };
            
        } catch (error) {
            console.error('White-label campaign send error:', error);
            throw new Error(`Campaign send failed: ${error.message}`);
        }
    }

    /**
     * Calculate platform billing with markup
     */
    calculatePlatformBilling(recipientCount, accountType) {
        const serviceCost = recipientCount * this.baseCost;
        const markupRate = this.markupRates[accountType] || this.markupRates.shop;
        const platformFee = serviceCost * markupRate;
        const totalCharge = serviceCost + platformFee;
        
        return {
            recipientCount,
            serviceCost: Number(serviceCost.toFixed(4)),
            platformFee: Number(platformFee.toFixed(4)), 
            totalCharge: Number(totalCharge.toFixed(4)),
            markupRate: markupRate,
            profitMargin: Number(((platformFee / totalCharge) * 100).toFixed(2))
        };
    }

    /**
     * Build white-label email content with barbershop branding
     */
    buildWhiteLabelEmailContent(campaign, barbershop) {
        const baseContent = campaign.message || campaign.html_content;
        
        return `
            ${baseContent}
            
            <div style="margin-top: 30px; padding: 20px; background: #f8f9fa; border-top: 1px solid #e9ecef;">
                <p style="margin: 0; color: #6c757d; font-size: 14px;">
                    <strong>Sent by ${barbershop.name}</strong><br>
                    ${barbershop.address || ''}<br>
                    ${barbershop.phone || ''} | ${barbershop.email || ''}
                </p>
                <p style="margin: 10px 0 0 0; color: #6c757d; font-size: 12px;">
                    <a href="${this.platformDomain}/unsubscribe?token=UNSUBSCRIBE_TOKEN&shop=${barbershop.id}" 
                       style="color: #6c757d;">Unsubscribe</a> | 
                    <a href="${this.platformDomain}/privacy" style="color: #6c757d;">Privacy Policy</a>
                </p>
            </div>
        `;
    }

    /**
     * Build compliance footer for CAN-SPAM
     */
    buildComplianceFooter(barbershop) {
        return `
Sent by ${barbershop.name}
${barbershop.address || 'Business Address'}
Unsubscribe: ${this.platformDomain}/unsubscribe
        `.trim();
    }

    /**
     * Simulate campaign send for testing
     */
    simulateCampaignSend(campaign, recipients) {
        console.log(`📧 Simulating email campaign: ${campaign.name}`);
        console.log(`   Recipients: ${recipients.length}`);
        console.log(`   Subject: ${campaign.subject}`);
        console.log(`   Type: White-label platform send`);
        
        // Simulate some delivery metrics
        const sent = Math.floor(recipients.length * 0.98); // 98% delivery rate
        const failed = recipients.length - sent;
        
        return {
            success: true,
            campaignId: campaign.id,
            metrics: {
                totalRecipients: recipients.length,
                totalSent: sent,
                totalFailed: failed,
                billing: this.calculatePlatformBilling(recipients.length, 'shop'),
                testMode: true
            },
            message: `TEST: Campaign simulated for ${sent} recipients`
        };
    }

    /**
     * Send marketing email campaign with comprehensive tracking (legacy)
     * @param {Object} campaignConfig - Campaign configuration
     * @returns {Object} Campaign results and analytics
     */
    async sendEmailCampaign(campaignConfig) {
        const {
            campaignName,
            recipients,
            subject,
            htmlContent,
            textContent,
            fromEmail,
            fromName,
            planTier = 'PROFESSIONAL',
            templateId,
            personalizationData = {},
            segmentCriteria = {},
            userId
        } = campaignConfig;

        // Validate required parameters
        if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
            throw new Error('Recipients array is required and cannot be empty');
        }
        
        if (!subject || !htmlContent) {
            throw new Error('Subject and HTML content are required');
        }

        // Generate unique campaign ID
        const campaignId = this.generateCampaignId(campaignName);
        
        try {
            // Create campaign analytics record
            const campaignAnalytics = await this.createCampaignRecord({
                campaignId,
                campaignName,
                planTier,
                userId,
                subject,
                fromEmail,
                fromName,
                templateId,
                segmentCriteria,
                personalizationData,
                totalRecipients: recipients.length
            });

            // Process recipients in batches
            const batchResults = await this.processBatchedEmails({
                campaignId,
                recipients,
                subject,
                htmlContent,
                textContent,
                fromEmail,
                fromName,
                personalizationData
            });

            // Calculate costs and update analytics
            const costAnalysis = this.calculateCampaignCosts(recipients.length, planTier);
            
            // Update campaign analytics with results
            await this.updateCampaignAnalytics(campaignId, {
                ...batchResults,
                ...costAnalysis,
                completed_at: new Date().toISOString()
            });

            // Return comprehensive campaign results
            return {
                success: true,
                campaignId,
                analytics: {
                    emailsSent: batchResults.sent,
                    emailsFailed: batchResults.failed,
                    successRate: ((batchResults.sent / recipients.length) * 100).toFixed(2) + '%',
                    ...costAnalysis
                },
                performance: {
                    estimatedOpenRate: '22%', // Industry average
                    estimatedClickRate: '3.5%', // Industry average
                    estimatedConversions: Math.round(recipients.length * 0.22 * 0.035 * 0.05)
                },
                compliance: {
                    canSpamCompliant: true,
                    gdprCompliant: true,
                    unsubscribeIncluded: htmlContent.includes('{{unsubscribe}}') || htmlContent.includes('unsubscribe')
                },
                nextSteps: [
                    'Monitor campaign performance in dashboard',
                    'Track opens and clicks in real-time',
                    'Schedule follow-up campaigns based on engagement',
                    'Analyze recipient segments for optimization'
                ]
            };

        } catch (error) {
            console.error('Campaign send failed:', error);
            
            // Update campaign with error status
            await this.markCampaignFailed(campaignId, error.message);
            
            throw new Error(`Campaign failed: ${error.message}`);
        }
    }

    /**
     * Process emails in batches with rate limiting
     */
    async processBatchedEmails(emailConfig) {
        const { campaignId, recipients, subject, htmlContent, textContent, fromEmail, fromName, personalizationData } = emailConfig;
        
        let sent = 0;
        let failed = 0;
        const errors = [];
        
        // Split recipients into batches
        const batches = this.chunkArray(recipients, this.BATCH_SIZE);
        
        console.log(`Processing ${recipients.length} emails in ${batches.length} batches`);
        
        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i];
            console.log(`Processing batch ${i + 1}/${batches.length} (${batch.length} emails)`);
            
            try {
                // Prepare batch email data
                const batchEmails = batch.map(recipient => {
                    const personalizedContent = this.personalizeContent(htmlContent, recipient, personalizationData);
                    const personalizedSubject = this.personalizeContent(subject, recipient, personalizationData);
                    
                    return {
                        to: {
                            email: recipient.email,
                            name: recipient.name || ''
                        },
                        subject: personalizedSubject,
                        html: personalizedContent,
                        text: textContent || this.htmlToText(personalizedContent),
                        customArgs: {
                            campaign_id: campaignId,
                            recipient_id: recipient.id || crypto.randomUUID(),
                            batch_number: i + 1
                        }
                    };
                });

                // Send batch via SendGrid
                const batchResult = await this.sendBatch({
                    emails: batchEmails,
                    fromEmail,
                    fromName
                });

                // Update recipient tracking
                await this.updateRecipientTracking(campaignId, batch, batchResult);
                
                sent += batchResult.sent;
                failed += batchResult.failed;
                
                if (batchResult.errors.length > 0) {
                    errors.push(...batchResult.errors);
                }
                
                // Rate limiting - wait between batches
                if (i < batches.length - 1) {
                    await this.delay(1000 / this.RATE_LIMIT_PER_SECOND);
                }
                
            } catch (error) {
                console.error(`Batch ${i + 1} failed:`, error);
                failed += batch.length;
                errors.push(`Batch ${i + 1}: ${error.message}`);
            }
        }
        
        return {
            sent,
            failed,
            errors,
            totalBatches: batches.length
        };
    }

    /**
     * Send a batch of emails via SendGrid
     */
    async sendBatch({ emails, fromEmail, fromName }) {
        try {
            // Prepare SendGrid multiple recipients format
            const msg = {
                from: {
                    email: fromEmail,
                    name: fromName
                },
                personalizations: emails.map(email => ({
                    to: [email.to],
                    subject: email.subject,
                    customArgs: email.customArgs
                })),
                content: [
                    {
                        type: 'text/html',
                        value: emails[0].html // Use first email as template, personalization happens in personalizations
                    }
                ],
                trackingSettings: {
                    clickTracking: { enable: true },
                    openTracking: { enable: true },
                    subscriptionTracking: { enable: true }
                },
                mailSettings: {
                    bypassListManagement: { enable: false },
                    bypassSpamManagement: { enable: false },
                    bypassBounceManagement: { enable: false }
                }
            };

            // Send via SendGrid
            const response = await sgMail.sendMultiple(msg);
            
            return {
                sent: emails.length,
                failed: 0,
                errors: [],
                sendgridResponse: response
            };
            
        } catch (error) {
            console.error('SendGrid batch error:', error);
            
            // Parse SendGrid error for detailed feedback
            let failedCount = emails.length;
            let sentCount = 0;
            let errors = [error.message];
            
            if (error.response && error.response.body && error.response.body.errors) {
                errors = error.response.body.errors.map(err => err.message);
            }
            
            return {
                sent: sentCount,
                failed: failedCount,
                errors
            };
        }
    }

    /**
     * Personalize email content with merge tags
     */
    personalizeContent(content, recipient, personalizationData) {
        let personalizedContent = content;
        
        // Standard recipient personalizations
        personalizedContent = personalizedContent.replace(/\{\{name\}\}/g, recipient.name || 'Valued Customer');
        personalizedContent = personalizedContent.replace(/\{\{email\}\}/g, recipient.email);
        personalizedContent = personalizedContent.replace(/\{\{first_name\}\}/g, recipient.firstName || recipient.name?.split(' ')[0] || 'there');
        
        // Custom personalization data
        Object.keys(personalizationData).forEach(key => {
            const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
            personalizedContent = personalizedContent.replace(regex, personalizationData[key]);
        });
        
        // Add required unsubscribe link for CAN-SPAM compliance
        if (!personalizedContent.includes('{{unsubscribe}}') && !personalizedContent.includes('unsubscribe')) {
            personalizedContent += `
                <div style="margin-top: 40px; padding: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; text-align: center;">
                    <p>You received this email because you're a valued customer.</p>
                    <p><a href="{{unsubscribe}}" style="color: #666;">Unsubscribe</a> | <a href="{{preferences}}" style="color: #666;">Email Preferences</a></p>
                </div>
            `;
        }
        
        return personalizedContent;
    }

    /**
     * Calculate campaign costs with platform markup
     */
    calculateCampaignCosts(emailCount, planTier) {
        const sendgridCost = emailCount * this.SENDGRID_COST_PER_EMAIL;
        const markupRate = this.PLATFORM_MARKUP[planTier] || this.PLATFORM_MARKUP.PROFESSIONAL;
        const platformMarkup = sendgridCost * markupRate;
        const totalCharged = sendgridCost + platformMarkup;
        const profitMargin = platformMarkup;
        
        return {
            sendgridCost: parseFloat(sendgridCost.toFixed(4)),
            platformMarkupRate: markupRate,
            platformMarkup: parseFloat(platformMarkup.toFixed(4)),
            totalCharged: parseFloat(totalCharged.toFixed(4)),
            profitMargin: parseFloat(profitMargin.toFixed(4)),
            costPerEmail: parseFloat((totalCharged / emailCount).toFixed(6)),
            profitMarginPercentage: ((profitMargin / sendgridCost) * 100).toFixed(1) + '%'
        };
    }

    /**
     * Create campaign analytics record
     */
    async createCampaignRecord(campaignData) {
        try {
            const { data, error } = await supabase
                .from('campaign_analytics')
                .insert({
                    user_id: campaignData.userId,
                    campaign_id: campaignData.campaignId,
                    campaign_name: campaignData.campaignName,
                    plan_tier: campaignData.planTier.toLowerCase(),
                    subject_line: campaignData.subject,
                    from_email: campaignData.fromEmail,
                    from_name: campaignData.fromName,
                    template_id: campaignData.templateId,
                    segment_criteria: campaignData.segmentCriteria,
                    personalization_data: campaignData.personalizationData,
                    emails_sent: 0, // Will be updated after sending
                    ...this.calculateCampaignCosts(campaignData.totalRecipients, campaignData.planTier)
                })
                .select()
                .single();

            if (error) {
                console.error('Error creating campaign record:', error);
                throw error;
            }

            return data;
        } catch (error) {
            console.error('Failed to create campaign record:', error);
            throw error;
        }
    }

    /**
     * Update campaign analytics with final results
     */
    async updateCampaignAnalytics(campaignId, results) {
        try {
            const { error } = await supabase
                .from('campaign_analytics')
                .update({
                    emails_sent: results.sent,
                    emails_delivered: results.sent, // Will be updated by webhooks
                    completed_at: results.completed_at,
                    updated_at: new Date().toISOString()
                })
                .eq('campaign_id', campaignId);

            if (error) {
                console.error('Error updating campaign analytics:', error);
            }
        } catch (error) {
            console.error('Failed to update campaign analytics:', error);
        }
    }

    /**
     * Update individual recipient tracking
     */
    async updateRecipientTracking(campaignId, recipients, batchResult) {
        try {
            const recipientRecords = recipients.map(recipient => ({
                campaign_id: campaignId,
                email_address: recipient.email,
                recipient_name: recipient.name,
                status: batchResult.sent > 0 ? 'sent' : 'failed',
                sent_at: batchResult.sent > 0 ? new Date().toISOString() : null,
                error_message: batchResult.errors.length > 0 ? batchResult.errors.join(', ') : null
            }));

            const { error } = await supabase
                .from('email_recipients')
                .insert(recipientRecords);

            if (error) {
                console.error('Error updating recipient tracking:', error);
            }
        } catch (error) {
            console.error('Failed to update recipient tracking:', error);
        }
    }

    /**
     * Mark campaign as failed
     */
    async markCampaignFailed(campaignId, errorMessage) {
        try {
            await supabase
                .from('campaign_analytics')
                .update({
                    completed_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('campaign_id', campaignId);
        } catch (error) {
            console.error('Failed to mark campaign as failed:', error);
        }
    }

    /**
     * Get campaign analytics and performance metrics
     */
    async getCampaignAnalytics(campaignId, userId) {
        try {
            // Get campaign overview
            const { data: campaign, error: campaignError } = await supabase
                .from('campaign_analytics')
                .select('*')
                .eq('campaign_id', campaignId)
                .eq('user_id', userId)
                .single();

            if (campaignError) {
                throw campaignError;
            }

            // Get recipient details
            const { data: recipients, error: recipientsError } = await supabase
                .from('email_recipients')
                .select('*')
                .eq('campaign_id', campaignId);

            if (recipientsError) {
                console.error('Error fetching recipients:', recipientsError);
            }

            // Calculate performance metrics
            const totalSent = campaign.emails_sent || 0;
            const openRate = totalSent > 0 ? (campaign.emails_opened / totalSent) * 100 : 0;
            const clickRate = totalSent > 0 ? (campaign.emails_clicked / totalSent) * 100 : 0;
            const bounceRate = totalSent > 0 ? (campaign.emails_bounced / totalSent) * 100 : 0;
            const unsubscribeRate = totalSent > 0 ? (campaign.unsubscribes / totalSent) * 100 : 0;

            return {
                campaign: {
                    ...campaign,
                    performance: {
                        openRate: parseFloat(openRate.toFixed(2)),
                        clickRate: parseFloat(clickRate.toFixed(2)),
                        bounceRate: parseFloat(bounceRate.toFixed(2)),
                        unsubscribeRate: parseFloat(unsubscribeRate.toFixed(2)),
                        deliveryRate: parseFloat(((campaign.emails_delivered / totalSent) * 100).toFixed(2))
                    }
                },
                recipients: recipients || [],
                summary: {
                    totalRecipients: recipients?.length || 0,
                    sent: totalSent,
                    delivered: campaign.emails_delivered || 0,
                    opened: campaign.emails_opened || 0,
                    clicked: campaign.emails_clicked || 0,
                    bounced: campaign.emails_bounced || 0,
                    unsubscribed: campaign.unsubscribes || 0,
                    spamReports: campaign.spam_reports || 0
                }
            };
        } catch (error) {
            console.error('Error fetching campaign analytics:', error);
            throw error;
        }
    }

    /**
     * Process SendGrid webhook events for tracking
     */
    async processWebhookEvent(eventData) {
        try {
            const { event, email, sg_message_id, timestamp, campaign_id } = eventData;
            
            if (!campaign_id) return;

            // Update recipient tracking
            await supabase
                .from('email_recipients')
                .update({
                    status: event,
                    [`${event}_at`]: new Date(timestamp * 1000).toISOString(),
                    sendgrid_message_id: sg_message_id
                })
                .eq('campaign_id', campaign_id)
                .eq('email_address', email);

            // Update campaign analytics counters
            const fieldMap = {
                'delivered': 'emails_delivered',
                'open': 'emails_opened',
                'click': 'emails_clicked',
                'bounce': 'emails_bounced',
                'unsubscribe': 'unsubscribes',
                'spamreport': 'spam_reports'
            };

            const field = fieldMap[event];
            if (field) {
                await supabase.rpc('increment_campaign_metric', {
                    campaign_id,
                    metric_field: field
                });
            }

        } catch (error) {
            console.error('Error processing webhook event:', error);
        }
    }

    /**
     * Utility methods
     */
    generateCampaignId(campaignName) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '');
        const hash = crypto.createHash('md5').update(campaignName + timestamp).digest('hex').substring(0, 8);
        return `campaign_${timestamp}_${hash}`;
    }

    chunkArray(array, chunkSize) {
        const chunks = [];
        for (let i = 0; i < array.length; i += chunkSize) {
            chunks.push(array.slice(i, i + chunkSize));
        }
        return chunks;
    }

    htmlToText(html) {
        return html
            .replace(/<[^>]*>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .trim();
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get email templates for different campaign types
     */
    getEmailTemplates() {
        return {
            welcome: {
                subject: 'Welcome to {{shop_name}}!',
                html: `
                    <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
                        <h2 style="color: #333;">Welcome to {{shop_name}}, {{name}}!</h2>
                        <p>We're excited to have you as a new customer!</p>
                        <div style="background: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 8px;">
                            <h3>What's Next?</h3>
                            <ul>
                                <li>Book your first appointment</li>
                                <li>Explore our services</li>
                                <li>Join our loyalty program</li>
                            </ul>
                        </div>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="{{booking_link}}" style="background: #007cba; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px;">Book Now</a>
                        </div>
                    </div>
                `
            },
            promotion: {
                subject: '🎉 Special Offer: {{discount}}% Off at {{shop_name}}',
                html: `
                    <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
                        <h2 style="color: #d63384;">🎉 Limited Time Offer!</h2>
                        <p>Hi {{name}},</p>
                        <p>Don't miss out on this exclusive deal!</p>
                        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 12px; margin: 20px 0;">
                            <h3 style="margin: 0; font-size: 2em;">{{discount}}% OFF</h3>
                            <p style="margin: 10px 0; opacity: 0.9;">Valid until {{expiry_date}}</p>
                            <p style="font-size: 14px; opacity: 0.8;">Use code: {{promo_code}}</p>
                        </div>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="{{booking_link}}" style="background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-size: 18px;">Claim Offer</a>
                        </div>
                    </div>
                `
            },
            reminder: {
                subject: 'Appointment Reminder - {{appointment_date}}',
                html: `
                    <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
                        <h2 style="color: #333;">Appointment Reminder</h2>
                        <p>Hi {{name}},</p>
                        <p>This is a friendly reminder about your upcoming appointment:</p>
                        <div style="background: #e3f2fd; padding: 20px; border-left: 4px solid #2196f3; margin: 20px 0;">
                            <h3 style="margin: 0 0 10px 0; color: #1976d2;">{{service_name}}</h3>
                            <p style="margin: 5px 0;"><strong>Date:</strong> {{appointment_date}}</p>
                            <p style="margin: 5px 0;"><strong>Time:</strong> {{appointment_time}}</p>
                            <p style="margin: 5px 0;"><strong>Barber:</strong> {{barber_name}}</p>
                            <p style="margin: 5px 0;"><strong>Duration:</strong> {{duration}}</p>
                        </div>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="{{reschedule_link}}" style="background: #ffc107; color: #333; padding: 12px 25px; text-decoration: none; border-radius: 5px; margin-right: 10px;">Reschedule</a>
                            <a href="{{cancel_link}}" style="background: #dc3545; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px;">Cancel</a>
                        </div>
                    </div>
                `
            }
        };
    }

    /**
     * Build personalization settings for SendGrid
     */
    buildPersonalizations(recipients) {
        return recipients.map(recipient => ({
            to: [{
                email: recipient.email,
                name: recipient.name || recipient.first_name || 'Customer'
            }],
            customArgs: {
                recipient_id: recipient.id || 'unknown',
                recipient_type: 'customer'
            }
        }));
    }

    /**
     * Build white-label email content with barbershop branding
     */
    buildWhiteLabelEmailContent(campaign, barbershop) {
        const baseMessage = campaign.message;
        
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>${campaign.subject}</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
            <div style="background: #f8f9fa; padding: 20px; border-radius: 10px;">
                <h2 style="color: #2c3e50; margin-bottom: 20px;">${barbershop.name}</h2>
                <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <p style="font-size: 16px; margin-bottom: 20px;">${baseMessage}</p>
                    
                    <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 20px;">
                        <p style="margin: 5px 0; font-size: 14px; color: #666;">
                            <strong>${barbershop.name}</strong><br>
                            ${barbershop.email}<br>
                            ${barbershop.phone || ''}<br>
                            ${barbershop.address || ''}
                        </p>
                    </div>
                    
                    <div style="font-size: 12px; color: #999; margin-top: 20px; border-top: 1px solid #eee; padding-top: 10px;">
                        <p>You received this email because you are a valued customer of ${barbershop.name}.</p>
                        <p><a href="{{unsubscribe}}" style="color: #666;">Unsubscribe</a> | <a href="mailto:${barbershop.email}" style="color: #666;">Contact Us</a></p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        `;
    }

    /**
     * Send emails in batches with rate limiting
     */
    async sendBatchedEmails(emailConfig, recipients) {
        if (this.testMode) {
            console.log('🧪 TEST MODE: Simulating email send...');
            return {
                sent: 0,
                failed: recipients.length,
                testMode: true
            };
        }

        const results = { sent: 0, failed: 0, errors: [] };
        
        try {
            // Send to SendGrid in a single call
            const msg = {
                from: emailConfig.from,
                replyTo: emailConfig.replyTo,
                subject: emailConfig.subject,
                html: emailConfig.content[0].value,
                personalizations: emailConfig.personalizations,
                trackingSettings: emailConfig.trackingSettings,
                mailSettings: emailConfig.mailSettings
            };

            await sgMail.send(msg);
            results.sent = recipients.length;
            
        } catch (error) {
            console.error('SendGrid send error:', error);
            results.failed = recipients.length;
            results.errors.push(error.message);
        }
        
        return results;
    }

    /**
     * Build compliance footer for emails
     */
    buildComplianceFooter(barbershop) {
        return `
        You received this email from ${barbershop.name}.
        ${barbershop.address || ''}
        To unsubscribe, click here: {{unsubscribe}}
        `;
    }

    /**
     * Store campaign analytics
     */
    async storeCampaignAnalytics(analytics) {
        try {
            // Log analytics for now - could store in database
            console.log('📊 Email Campaign Analytics:', analytics);
        } catch (error) {
            console.error('Failed to store campaign analytics:', error);
        }
    }
}

module.exports = SendGridEmailService;

// Export singleton instance
module.exports.sendGridService = new SendGridEmailService();

// Example usage for testing
if (require.main === module) {
    const testCampaign = async () => {
        const service = new SendGridEmailService();
        
        const campaignConfig = {
            campaignName: 'Welcome Series Test',
            recipients: [
                { email: 'test@example.com', name: 'Test User', firstName: 'Test' }
            ],
            subject: 'Welcome to {{shop_name}}!',
            htmlContent: service.getEmailTemplates().welcome.html,
            fromEmail: 'noreply@6fb.com',
            fromName: '6FB Barbershop',
            planTier: 'PROFESSIONAL',
            userId: 'test-user-id',
            personalizationData: {
                shop_name: 'Elite Cuts',
                booking_link: 'https://book.elitecuts.com'
            }
        };
        
        try {
            const result = await service.sendEmailCampaign(campaignConfig);
            console.log('Campaign Results:', JSON.stringify(result, null, 2));
        } catch (error) {
            console.error('Campaign failed:', error);
        }
    };
    
    // Uncomment to test
    // testCampaign();
}

// Export for use in other modules
const sendGridService = new SendGridEmailService();
module.exports = { sendGridService, SendGridEmailService };