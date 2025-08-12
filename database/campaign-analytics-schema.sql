-- Campaign Analytics Schema for SendGrid Email Service
-- Marketing campaign tracking and analytics tables

-- Campaign Analytics Table
CREATE TABLE IF NOT EXISTS campaign_analytics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    campaign_id TEXT NOT NULL UNIQUE,
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
    platform_markup DECIMAL(10,4) DEFAULT 0,
    total_charged DECIMAL(10,4) DEFAULT 0,
    profit_margin DECIMAL(10,4) DEFAULT 0,
    
    -- Performance metrics (calculated)
    open_rate DECIMAL(5,4) DEFAULT 0,
    click_rate DECIMAL(5,4) DEFAULT 0,
    conversion_rate DECIMAL(5,4) DEFAULT 0,
    unsubscribe_rate DECIMAL(5,4) DEFAULT 0,
    delivery_rate DECIMAL(5,4) DEFAULT 0,
    bounce_rate DECIMAL(5,4) DEFAULT 0,
    
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

-- Email Recipients Tracking Table
CREATE TABLE IF NOT EXISTS email_recipients (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    campaign_id TEXT NOT NULL REFERENCES campaign_analytics(campaign_id) ON DELETE CASCADE,
    email_address TEXT NOT NULL,
    recipient_name TEXT,
    personalization_data JSONB DEFAULT '{}'::jsonb,
    
    -- Delivery status
    status TEXT DEFAULT 'pending', -- pending, sent, delivered, bounced, failed, opened, clicked
    sendgrid_message_id TEXT,
    error_message TEXT,
    
    -- Engagement tracking
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    unsubscribed_at TIMESTAMPTZ,
    bounced_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    
    -- Timestamps
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email Templates Table
CREATE TABLE IF NOT EXISTS email_templates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    template_name TEXT NOT NULL,
    template_type TEXT NOT NULL, -- welcome, promotion, reminder, newsletter, transactional
    subject_line TEXT NOT NULL,
    html_content TEXT NOT NULL,
    text_content TEXT,
    
    -- Template configuration
    merge_tags JSONB DEFAULT '[]'::jsonb, -- Array of available merge tags
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    
    -- Usage tracking
    times_used INTEGER DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customer Segments Table
CREATE TABLE IF NOT EXISTS customer_segments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    segment_name TEXT NOT NULL,
    description TEXT,
    
    -- Segment criteria (JSON filter rules)
    criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Segment stats
    customer_count INTEGER DEFAULT 0,
    last_calculated_at TIMESTAMPTZ,
    
    -- Configuration
    is_active BOOLEAN DEFAULT true,
    auto_update BOOLEAN DEFAULT true, -- Automatically recalculate segment
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email Unsubscribes Table
CREATE TABLE IF NOT EXISTS email_unsubscribes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email_address TEXT NOT NULL UNIQUE,
    user_id UUID REFERENCES auth.users(id),
    campaign_id TEXT,
    
    -- Unsubscribe details
    unsubscribe_reason TEXT,
    unsubscribe_source TEXT, -- campaign, global, manual
    ip_address INET,
    user_agent TEXT,
    
    -- Timestamps
    unsubscribed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_campaign_analytics_user_id ON campaign_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_campaign_analytics_campaign_id ON campaign_analytics(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_analytics_sent_at ON campaign_analytics(sent_at);
CREATE INDEX IF NOT EXISTS idx_campaign_analytics_plan_tier ON campaign_analytics(plan_tier);

CREATE INDEX IF NOT EXISTS idx_email_recipients_campaign_id ON email_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_recipients_email ON email_recipients(email_address);
CREATE INDEX IF NOT EXISTS idx_email_recipients_status ON email_recipients(status);
CREATE INDEX IF NOT EXISTS idx_email_recipients_sent_at ON email_recipients(sent_at);

CREATE INDEX IF NOT EXISTS idx_email_templates_user_id ON email_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_type ON email_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_email_templates_active ON email_templates(is_active);

CREATE INDEX IF NOT EXISTS idx_customer_segments_user_id ON customer_segments(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_segments_active ON customer_segments(is_active);

CREATE INDEX IF NOT EXISTS idx_email_unsubscribes_email ON email_unsubscribes(email_address);
CREATE INDEX IF NOT EXISTS idx_email_unsubscribes_user_id ON email_unsubscribes(user_id);

-- Row Level Security (RLS) Policies

-- Campaign Analytics RLS
ALTER TABLE campaign_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own campaigns" ON campaign_analytics
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own campaigns" ON campaign_analytics
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own campaigns" ON campaign_analytics
    FOR UPDATE USING (auth.uid() = user_id);

-- Email Recipients RLS
ALTER TABLE email_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own campaign recipients" ON email_recipients
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM campaign_analytics 
            WHERE campaign_analytics.campaign_id = email_recipients.campaign_id 
            AND campaign_analytics.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own campaign recipients" ON email_recipients
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM campaign_analytics 
            WHERE campaign_analytics.campaign_id = email_recipients.campaign_id 
            AND campaign_analytics.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own campaign recipients" ON email_recipients
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM campaign_analytics 
            WHERE campaign_analytics.campaign_id = email_recipients.campaign_id 
            AND campaign_analytics.user_id = auth.uid()
        )
    );

-- Email Templates RLS
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own templates" ON email_templates
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own templates" ON email_templates
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates" ON email_templates
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates" ON email_templates
    FOR DELETE USING (auth.uid() = user_id);

-- Customer Segments RLS
ALTER TABLE customer_segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own segments" ON customer_segments
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own segments" ON customer_segments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own segments" ON customer_segments
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own segments" ON customer_segments
    FOR DELETE USING (auth.uid() = user_id);

-- Email Unsubscribes RLS (global but trackable)
ALTER TABLE email_unsubscribes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert unsubscribes" ON email_unsubscribes
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view related unsubscribes" ON email_unsubscribes
    FOR SELECT USING (
        user_id IS NULL OR auth.uid() = user_id
    );

-- Database Functions

-- Function to increment campaign metrics (for webhook processing)
CREATE OR REPLACE FUNCTION increment_campaign_metric(
    campaign_id TEXT,
    metric_field TEXT
) RETURNS void AS $$
BEGIN
    -- Dynamically update the specified metric field
    EXECUTE format('UPDATE campaign_analytics SET %I = %I + 1, updated_at = NOW() WHERE campaign_id = $1', metric_field, metric_field)
    USING campaign_id;
    
    -- Recalculate performance metrics
    PERFORM update_campaign_performance_metrics(campaign_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update calculated performance metrics
CREATE OR REPLACE FUNCTION update_campaign_performance_metrics(
    campaign_id_param TEXT
) RETURNS void AS $$
DECLARE
    campaign_row RECORD;
BEGIN
    -- Get current campaign data
    SELECT * INTO campaign_row 
    FROM campaign_analytics 
    WHERE campaign_id = campaign_id_param;
    
    -- Calculate performance rates
    IF campaign_row.emails_sent > 0 THEN
        UPDATE campaign_analytics SET
            open_rate = CASE 
                WHEN emails_sent > 0 THEN (emails_opened::DECIMAL / emails_sent::DECIMAL)
                ELSE 0 
            END,
            click_rate = CASE 
                WHEN emails_sent > 0 THEN (emails_clicked::DECIMAL / emails_sent::DECIMAL)
                ELSE 0 
            END,
            delivery_rate = CASE 
                WHEN emails_sent > 0 THEN (emails_delivered::DECIMAL / emails_sent::DECIMAL)
                ELSE 0 
            END,
            bounce_rate = CASE 
                WHEN emails_sent > 0 THEN (emails_bounced::DECIMAL / emails_sent::DECIMAL)
                ELSE 0 
            END,
            unsubscribe_rate = CASE 
                WHEN emails_sent > 0 THEN (unsubscribes::DECIMAL / emails_sent::DECIMAL)
                ELSE 0 
            END,
            updated_at = NOW()
        WHERE campaign_id = campaign_id_param;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to execute raw SQL (for schema initialization)
CREATE OR REPLACE FUNCTION exec_sql(query TEXT) RETURNS void AS $$
BEGIN
    EXECUTE query;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update template usage statistics
CREATE OR REPLACE FUNCTION update_template_usage()
RETURNS TRIGGER AS $$
BEGIN
    -- Update template usage count when campaign is created with template
    IF NEW.template_id IS NOT NULL THEN
        UPDATE email_templates 
        SET times_used = times_used + 1,
            last_used_at = NOW(),
            updated_at = NOW()
        WHERE id::TEXT = NEW.template_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_template_usage
    AFTER INSERT ON campaign_analytics
    FOR EACH ROW
    EXECUTE FUNCTION update_template_usage();

-- Trigger to automatically update campaign performance metrics
CREATE OR REPLACE FUNCTION auto_update_campaign_metrics()
RETURNS TRIGGER AS $$
BEGIN
    -- Update performance metrics when email metrics change
    IF OLD.emails_opened != NEW.emails_opened OR 
       OLD.emails_clicked != NEW.emails_clicked OR 
       OLD.emails_bounced != NEW.emails_bounced OR 
       OLD.emails_delivered != NEW.emails_delivered OR 
       OLD.unsubscribes != NEW.unsubscribes THEN
        
        PERFORM update_campaign_performance_metrics(NEW.campaign_id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_update_campaign_metrics
    AFTER UPDATE ON campaign_analytics
    FOR EACH ROW
    EXECUTE FUNCTION auto_update_campaign_metrics();

-- Insert default email templates
INSERT INTO email_templates (id, user_id, template_name, template_type, subject_line, html_content, text_content, merge_tags, is_default) VALUES
(
    uuid_generate_v4(),
    (SELECT id FROM auth.users LIMIT 1), -- Default to first user for system templates
    'Welcome Email',
    'welcome',
    'Welcome to {{shop_name}}!',
    '<div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;"><h2 style="color: #333;">Welcome to {{shop_name}}, {{name}}!</h2><p>We''re excited to have you as a new customer!</p><div style="background: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 8px;"><h3>What''s Next?</h3><ul><li>Book your first appointment</li><li>Explore our services</li><li>Join our loyalty program</li></ul></div><div style="text-align: center; margin: 30px 0;"><a href="{{booking_link}}" style="background: #007cba; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px;">Book Now</a></div></div>',
    'Welcome to {{shop_name}}, {{name}}! We''re excited to have you as a new customer! Book your first appointment: {{booking_link}}',
    '["name", "shop_name", "booking_link"]'::jsonb,
    true
),
(
    uuid_generate_v4(),
    (SELECT id FROM auth.users LIMIT 1),
    'Promotional Offer',
    'promotion',
    '🎉 Special Offer: {{discount}}% Off at {{shop_name}}',
    '<div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;"><h2 style="color: #d63384;">🎉 Limited Time Offer!</h2><p>Hi {{name}},</p><p>Don''t miss out on this exclusive deal!</p><div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 12px; margin: 20px 0;"><h3 style="margin: 0; font-size: 2em;">{{discount}}% OFF</h3><p style="margin: 10px 0; opacity: 0.9;">Valid until {{expiry_date}}</p><p style="font-size: 14px; opacity: 0.8;">Use code: {{promo_code}}</p></div><div style="text-align: center; margin: 30px 0;"><a href="{{booking_link}}" style="background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-size: 18px;">Claim Offer</a></div></div>',
    'Limited Time Offer! Hi {{name}}, get {{discount}}% OFF at {{shop_name}}. Valid until {{expiry_date}}. Use code: {{promo_code}}. Book now: {{booking_link}}',
    '["name", "shop_name", "discount", "expiry_date", "promo_code", "booking_link"]'::jsonb,
    true
) ON CONFLICT DO NOTHING;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Comments for documentation
COMMENT ON TABLE campaign_analytics IS 'Stores email marketing campaign analytics and performance metrics';
COMMENT ON TABLE email_recipients IS 'Tracks individual email recipient status and engagement';
COMMENT ON TABLE email_templates IS 'Stores reusable email templates with merge tag support';
COMMENT ON TABLE customer_segments IS 'Defines customer segmentation criteria for targeted campaigns';
COMMENT ON TABLE email_unsubscribes IS 'Global email unsubscribe list for compliance';

COMMENT ON FUNCTION increment_campaign_metric(TEXT, TEXT) IS 'Increments campaign metrics from webhook events';
COMMENT ON FUNCTION update_campaign_performance_metrics(TEXT) IS 'Recalculates derived performance metrics for a campaign';
COMMENT ON FUNCTION exec_sql(TEXT) IS 'Utility function for executing dynamic SQL queries';