-- Complete Settings Deduplication Schema Migration
-- Execute this in Supabase Dashboard > SQL Editor

-- 1. Create user_organization_memberships table
CREATE TABLE IF NOT EXISTS user_organization_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
    permissions JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, organization_id)
);

-- Enable RLS for user_organization_memberships
ALTER TABLE user_organization_memberships ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_organization_memberships
CREATE POLICY "Users can view their memberships" ON user_organization_memberships
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Organization owners can manage memberships" ON user_organization_memberships
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM user_organization_memberships 
            WHERE user_id = auth.uid() AND role = 'owner'
        )
    );

-- 2. Create settings_hierarchy table
CREATE TABLE IF NOT EXISTS settings_hierarchy (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    context_type TEXT NOT NULL CHECK (context_type IN ('system', 'organization', 'user')),
    context_id UUID, -- NULL for system, org_id for organization, user_id for user
    category TEXT NOT NULL,
    setting_key TEXT NOT NULL,
    setting_value JSONB NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id),
    UNIQUE(context_type, context_id, category, setting_key)
);

-- Enable RLS for settings_hierarchy
ALTER TABLE settings_hierarchy ENABLE ROW LEVEL SECURITY;

-- RLS policies for settings_hierarchy
CREATE POLICY "Users can view system settings" ON settings_hierarchy
    FOR SELECT USING (context_type = 'system');

CREATE POLICY "Users can view organization settings" ON settings_hierarchy
    FOR SELECT USING (
        context_type = 'organization' AND 
        context_id IN (
            SELECT organization_id FROM user_organization_memberships 
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Users can view their own settings" ON settings_hierarchy
    FOR SELECT USING (context_type = 'user' AND context_id = auth.uid());

CREATE POLICY "Users can modify their own settings" ON settings_hierarchy
    FOR ALL USING (context_type = 'user' AND context_id = auth.uid());

CREATE POLICY "Organization admins can manage org settings" ON settings_hierarchy
    FOR ALL USING (
        context_type = 'organization' AND
        context_id IN (
            SELECT organization_id FROM user_organization_memberships 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND is_active = true
        )
    );

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_org_memberships_user_id ON user_organization_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_user_org_memberships_org_id ON user_organization_memberships(organization_id);
CREATE INDEX IF NOT EXISTS idx_settings_hierarchy_context ON settings_hierarchy(context_type, context_id);
CREATE INDEX IF NOT EXISTS idx_settings_hierarchy_category ON settings_hierarchy(category);
CREATE INDEX IF NOT EXISTS idx_settings_hierarchy_key ON settings_hierarchy(setting_key);

-- 4. Insert default system settings
INSERT INTO settings_hierarchy (context_type, context_id, category, setting_key, setting_value, metadata) VALUES
-- Business Hours Defaults
('system', NULL, 'hours', 'default_hours', '{
    "monday": {"open": "09:00", "close": "18:00", "closed": false},
    "tuesday": {"open": "09:00", "close": "18:00", "closed": false},
    "wednesday": {"open": "09:00", "close": "18:00", "closed": false},
    "thursday": {"open": "09:00", "close": "18:00", "closed": false},
    "friday": {"open": "09:00", "close": "18:00", "closed": false},
    "saturday": {"open": "09:00", "close": "17:00", "closed": false},
    "sunday": {"open": "10:00", "close": "16:00", "closed": false}
}', '{"description": "Default business hours for new barbershops"}'),

-- Appointment Defaults
('system', NULL, 'appointments', 'default_duration', '30', '{"description": "Default appointment duration in minutes"}'),
('system', NULL, 'appointments', 'booking_buffer', '15', '{"description": "Default buffer time between appointments in minutes"}'),
('system', NULL, 'appointments', 'advance_booking_limit', '30', '{"description": "Maximum days customers can book in advance"}'),
('system', NULL, 'appointments', 'min_booking_notice', '2', '{"description": "Minimum hours notice required for bookings"}'),
('system', NULL, 'appointments', 'cancellation_policy', '"24 hours notice required for cancellations"', '{"description": "Default cancellation policy text"}'),

-- Notification Defaults
('system', NULL, 'notifications', 'email_enabled', 'true', '{"description": "Enable email notifications by default"}'),
('system', NULL, 'notifications', 'sms_enabled', 'false', '{"description": "SMS notifications disabled by default"}'),
('system', NULL, 'notifications', 'reminder_hours', '[24, 2]', '{"description": "Default reminder times in hours before appointment"}'),

-- Payment Defaults
('system', NULL, 'payments', 'currency', '"USD"', '{"description": "Default currency"}'),
('system', NULL, 'payments', 'tax_rate', '0.08', '{"description": "Default tax rate (8%)"}'),
('system', NULL, 'payments', 'payment_methods', '["card", "cash"]', '{"description": "Default accepted payment methods"}'),

-- Branding Defaults
('system', NULL, 'branding', 'primary_color', '"#3B82F6"', '{"description": "Default primary brand color"}'),
('system', NULL, 'branding', 'secondary_color', '"#64748B"', '{"description": "Default secondary brand color"}'),
('system', NULL, 'branding', 'font_family', '"Inter"', '{"description": "Default font family"}')

ON CONFLICT (context_type, context_id, category, setting_key) DO NOTHING;

-- 5. Create helper functions
CREATE OR REPLACE FUNCTION get_effective_setting(
    p_user_id UUID,
    p_category TEXT,
    p_setting_key TEXT
) RETURNS JSONB AS $$
DECLARE
    user_setting JSONB;
    org_setting JSONB;
    system_setting JSONB;
    user_org_id UUID;
BEGIN
    -- Get user's organization
    SELECT organization_id INTO user_org_id
    FROM user_organization_memberships
    WHERE user_id = p_user_id AND is_active = true
    LIMIT 1;
    
    -- Try user-level setting first
    SELECT setting_value INTO user_setting
    FROM settings_hierarchy
    WHERE context_type = 'user' 
      AND context_id = p_user_id
      AND category = p_category
      AND setting_key = p_setting_key;
      
    IF user_setting IS NOT NULL THEN
        RETURN user_setting;
    END IF;
    
    -- Try organization-level setting
    IF user_org_id IS NOT NULL THEN
        SELECT setting_value INTO org_setting
        FROM settings_hierarchy
        WHERE context_type = 'organization'
          AND context_id = user_org_id
          AND category = p_category
          AND setting_key = p_setting_key;
          
        IF org_setting IS NOT NULL THEN
            RETURN org_setting;
        END IF;
    END IF;
    
    -- Fallback to system default
    SELECT setting_value INTO system_setting
    FROM settings_hierarchy
    WHERE context_type = 'system'
      AND context_id IS NULL
      AND category = p_category
      AND setting_key = p_setting_key;
      
    RETURN system_setting;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create audit trigger for settings changes
CREATE OR REPLACE FUNCTION audit_settings_changes() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        NEW.updated_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER settings_hierarchy_audit
    BEFORE UPDATE ON settings_hierarchy
    FOR EACH ROW EXECUTE FUNCTION audit_settings_changes();

CREATE TRIGGER user_org_memberships_audit
    BEFORE UPDATE ON user_organization_memberships
    FOR EACH ROW EXECUTE FUNCTION audit_settings_changes();

-- 7. Create compatibility view for existing barbershops table
CREATE OR REPLACE VIEW barbershops_with_settings AS
SELECT 
    b.*,
    get_effective_setting(b.owner_id, 'hours', 'default_hours') as effective_business_hours,
    get_effective_setting(b.owner_id, 'appointments', 'default_duration') as effective_default_duration,
    get_effective_setting(b.owner_id, 'notifications', 'email_enabled') as effective_email_notifications,
    get_effective_setting(b.owner_id, 'payments', 'tax_rate') as effective_tax_rate,
    get_effective_setting(b.owner_id, 'branding', 'primary_color') as effective_primary_color
FROM barbershops b;

COMMENT ON VIEW barbershops_with_settings IS 'Compatibility view that merges barbershop data with effective settings from hierarchy';