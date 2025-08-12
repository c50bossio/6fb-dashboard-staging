-- Barber Permissions Schema Extension
-- Adds role-based permission system for barber service management

-- ==========================================
-- BARBER PERMISSION MANAGEMENT
-- ==========================================

-- Barber permissions table for granular access control
CREATE TABLE IF NOT EXISTS barber_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
  barber_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  granted_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL, -- Shop/Enterprise owner who granted
  
  -- Service Management Permissions
  can_create_services BOOLEAN DEFAULT false,
  can_modify_services BOOLEAN DEFAULT false,
  can_delete_services BOOLEAN DEFAULT false,
  can_set_pricing BOOLEAN DEFAULT false,
  pricing_variance_percent INTEGER DEFAULT 0 CHECK (pricing_variance_percent >= 0 AND pricing_variance_percent <= 100),
  can_set_service_duration BOOLEAN DEFAULT false,
  duration_variance_percent INTEGER DEFAULT 0 CHECK (duration_variance_percent >= 0 AND duration_variance_percent <= 50),
  
  -- Schedule Management Permissions  
  can_set_hours BOOLEAN DEFAULT false,
  can_set_availability BOOLEAN DEFAULT false,
  can_manage_breaks BOOLEAN DEFAULT false,
  can_set_time_off BOOLEAN DEFAULT false,
  
  -- Client Management Permissions
  can_view_all_clients BOOLEAN DEFAULT false, -- vs just their own clients
  can_manage_client_notes BOOLEAN DEFAULT false,
  can_view_client_history BOOLEAN DEFAULT false,
  
  -- Business Analytics Permissions
  can_view_personal_analytics BOOLEAN DEFAULT true, -- Own performance metrics
  can_view_shop_analytics BOOLEAN DEFAULT false, -- Shop-wide metrics
  can_view_financial_reports BOOLEAN DEFAULT false,
  
  -- Booking Management Permissions
  can_modify_booking_rules BOOLEAN DEFAULT false,
  can_set_deposit_requirements BOOLEAN DEFAULT false,
  can_manage_cancellation_policy BOOLEAN DEFAULT false,
  
  -- Marketing & Promotion Permissions
  can_create_promotions BOOLEAN DEFAULT false,
  can_modify_service_descriptions BOOLEAN DEFAULT false,
  can_upload_portfolio_images BOOLEAN DEFAULT false,
  
  -- Payment & Financial Permissions
  can_process_payments BOOLEAN DEFAULT false,
  can_issue_refunds BOOLEAN DEFAULT false,
  can_view_commission_details BOOLEAN DEFAULT true,
  
  -- Permission Metadata
  permission_level VARCHAR(20) DEFAULT 'basic' CHECK (permission_level IN ('basic', 'intermediate', 'advanced', 'full')),
  custom_permissions JSONB DEFAULT '{}', -- For future extensibility
  
  -- Status and Audit
  is_active BOOLEAN DEFAULT true,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE, -- Optional expiration
  last_used_at TIMESTAMP WITH TIME ZONE,
  notes TEXT, -- Why these permissions were granted
  
  -- Constraints
  UNIQUE(barbershop_id, barber_id),
  
  -- Ensure only shop owners can grant permissions
  CONSTRAINT valid_grantor CHECK (
    granted_by IN (
      SELECT id FROM users WHERE role IN ('SHOP_OWNER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN')
    )
  )
);

-- Permission templates for common setups
CREATE TABLE IF NOT EXISTS permission_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  template_level VARCHAR(20) NOT NULL CHECK (template_level IN ('basic', 'intermediate', 'advanced', 'full')),
  
  -- Template permissions (mirrors barber_permissions structure)
  can_create_services BOOLEAN DEFAULT false,
  can_modify_services BOOLEAN DEFAULT false,
  can_delete_services BOOLEAN DEFAULT false,
  can_set_pricing BOOLEAN DEFAULT false,
  pricing_variance_percent INTEGER DEFAULT 0,
  can_set_service_duration BOOLEAN DEFAULT false,
  duration_variance_percent INTEGER DEFAULT 0,
  can_set_hours BOOLEAN DEFAULT false,
  can_set_availability BOOLEAN DEFAULT false,
  can_manage_breaks BOOLEAN DEFAULT false,
  can_set_time_off BOOLEAN DEFAULT false,
  can_view_all_clients BOOLEAN DEFAULT false,
  can_manage_client_notes BOOLEAN DEFAULT false,
  can_view_client_history BOOLEAN DEFAULT false,
  can_view_personal_analytics BOOLEAN DEFAULT true,
  can_view_shop_analytics BOOLEAN DEFAULT false,
  can_view_financial_reports BOOLEAN DEFAULT false,
  can_modify_booking_rules BOOLEAN DEFAULT false,
  can_set_deposit_requirements BOOLEAN DEFAULT false,
  can_manage_cancellation_policy BOOLEAN DEFAULT false,
  can_create_promotions BOOLEAN DEFAULT false,
  can_modify_service_descriptions BOOLEAN DEFAULT false,
  can_upload_portfolio_images BOOLEAN DEFAULT false,
  can_process_payments BOOLEAN DEFAULT false,
  can_issue_refunds BOOLEAN DEFAULT false,
  can_view_commission_details BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_system_template BOOLEAN DEFAULT false -- System vs custom templates
);

-- Insert default permission templates
INSERT INTO permission_templates (name, description, template_level, 
  can_modify_services, can_set_pricing, pricing_variance_percent, 
  can_set_availability, can_manage_client_notes, can_view_personal_analytics, 
  can_modify_service_descriptions, is_system_template) VALUES

('Basic Barber', 'Minimal permissions for new or part-time barbers', 'basic',
  false, false, 0, true, false, true, false, true),

('Experienced Barber', 'Standard permissions for established barbers', 'intermediate', 
  true, true, 10, true, true, true, true, true),

('Senior Barber', 'Extended permissions for senior team members', 'advanced',
  true, true, 20, true, true, true, true, true),

('Barber Manager', 'Full autonomy for barber managers and booth renters', 'full',
  true, true, 50, true, true, true, true, true);

-- Permission audit log for tracking changes
CREATE TABLE IF NOT EXISTS permission_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barber_permission_id UUID REFERENCES barber_permissions(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- What changed
  action VARCHAR(50) NOT NULL, -- 'granted', 'revoked', 'modified', 'expired'
  permission_field VARCHAR(100), -- Which specific permission changed
  old_value TEXT,
  new_value TEXT,
  
  -- Context
  reason TEXT,
  ip_address INET,
  user_agent TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- ENHANCED BARBER SERVICES WITH PERMISSIONS
-- ==========================================

-- Add permission validation to existing barber_services table
ALTER TABLE barber_services ADD COLUMN IF NOT EXISTS 
  permission_validated BOOLEAN DEFAULT false,
  created_with_permission UUID REFERENCES barber_permissions(id),
  last_permission_check TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ==========================================
-- PERMISSION CHECKING FUNCTIONS
-- ==========================================

-- Function to check if barber has specific permission
CREATE OR REPLACE FUNCTION check_barber_permission(
  p_barber_id UUID,
  p_barbershop_id UUID,
  p_permission_name TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  permission_value BOOLEAN := false;
BEGIN
  -- Get permission value dynamically
  EXECUTE format('SELECT %I FROM barber_permissions WHERE barber_id = $1 AND barbershop_id = $2 AND is_active = true', 
                 p_permission_name)
  INTO permission_value
  USING p_barber_id, p_barbershop_id;
  
  RETURN COALESCE(permission_value, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate service pricing within allowed variance
CREATE OR REPLACE FUNCTION validate_service_pricing(
  p_barber_id UUID,
  p_barbershop_id UUID,
  p_base_price DECIMAL,
  p_proposed_price DECIMAL
) RETURNS BOOLEAN AS $$
DECLARE
  allowed_variance INTEGER := 0;
  max_price DECIMAL;
  min_price DECIMAL;
BEGIN
  -- Get allowed pricing variance
  SELECT pricing_variance_percent 
  INTO allowed_variance
  FROM barber_permissions 
  WHERE barber_id = p_barber_id 
    AND barbershop_id = p_barbershop_id 
    AND is_active = true;
  
  -- If no permission found, variance is 0
  allowed_variance := COALESCE(allowed_variance, 0);
  
  -- Calculate price range
  max_price := p_base_price * (1 + allowed_variance::DECIMAL / 100);
  min_price := p_base_price * (1 - allowed_variance::DECIMAL / 100);
  
  -- Check if proposed price is within range
  RETURN p_proposed_price BETWEEN min_price AND max_price;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- INDEXES FOR PERFORMANCE
-- ==========================================

-- Barber permissions indexes
CREATE INDEX IF NOT EXISTS idx_barber_permissions_barber ON barber_permissions(barber_id);
CREATE INDEX IF NOT EXISTS idx_barber_permissions_shop ON barber_permissions(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_barber_permissions_active ON barber_permissions(is_active);
CREATE INDEX IF NOT EXISTS idx_barber_permissions_level ON barber_permissions(permission_level);
CREATE INDEX IF NOT EXISTS idx_barber_permissions_granted_by ON barber_permissions(granted_by);

-- Permission templates indexes
CREATE INDEX IF NOT EXISTS idx_permission_templates_level ON permission_templates(template_level);
CREATE INDEX IF NOT EXISTS idx_permission_templates_system ON permission_templates(is_system_template);

-- Audit log indexes
CREATE INDEX IF NOT EXISTS idx_permission_audit_permission ON permission_audit_log(barber_permission_id);
CREATE INDEX IF NOT EXISTS idx_permission_audit_changed_by ON permission_audit_log(changed_by);
CREATE INDEX IF NOT EXISTS idx_permission_audit_action ON permission_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_permission_audit_date ON permission_audit_log(created_at);

-- Enhanced barber services indexes
CREATE INDEX IF NOT EXISTS idx_barber_services_permission ON barber_services(created_with_permission);
CREATE INDEX IF NOT EXISTS idx_barber_services_validated ON barber_services(permission_validated);

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================

-- Enable RLS on permission tables
ALTER TABLE barber_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE permission_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE permission_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for barber_permissions
CREATE POLICY "Barbers can view their own permissions" ON barber_permissions
  FOR SELECT USING (barber_id = auth.uid());

CREATE POLICY "Shop owners can manage permissions in their shops" ON barber_permissions
  FOR ALL USING (
    barbershop_id IN (
      SELECT id FROM barbershops WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Enterprise owners can manage permissions in their organization" ON barber_permissions
  FOR ALL USING (
    barbershop_id IN (
      SELECT b.id FROM barbershops b
      JOIN organizations o ON b.organization_id = o.id
      WHERE o.owner_id = auth.uid()
    )
  );

-- RLS Policies for permission_templates
CREATE POLICY "Everyone can view system templates" ON permission_templates
  FOR SELECT USING (is_system_template = true);

CREATE POLICY "Shop owners can manage custom templates" ON permission_templates
  FOR ALL USING (
    is_system_template = false AND 
    EXISTS (
      SELECT 1 FROM barbershops WHERE owner_id = auth.uid()
    )
  );

-- RLS Policies for audit log
CREATE POLICY "Users can view audit logs for their permissions" ON permission_audit_log
  FOR SELECT USING (
    barber_permission_id IN (
      SELECT id FROM barber_permissions WHERE barber_id = auth.uid()
    )
    OR changed_by = auth.uid()
  );

COMMENT ON TABLE barber_permissions IS 'Granular permission system allowing shop owners to delegate specific authorities to barbers';
COMMENT ON TABLE permission_templates IS 'Pre-defined permission sets for common barber roles and experience levels';
COMMENT ON TABLE permission_audit_log IS 'Audit trail for all permission changes and usage tracking';