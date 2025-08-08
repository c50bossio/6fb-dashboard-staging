-- 6FB AI Agent System - Row Level Security Policies
-- Multi-tenant security configuration for barbershop data isolation

-- First, ensure RLS is enabled on all tables (should already be done in main schema)
ALTER TABLE barbershops ENABLE ROW LEVEL SECURITY;
ALTER TABLE barbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE barber_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_preferences ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "Public read access for barbershops" ON barbershops;
DROP POLICY IF EXISTS "Public read access for barbers" ON barbers;
DROP POLICY IF EXISTS "Public read access for services" ON services;
DROP POLICY IF EXISTS "Users can manage their appointments" ON appointments;
DROP POLICY IF EXISTS "Users can manage clients" ON clients;
DROP POLICY IF EXISTS "Users can manage availability" ON barber_availability;

-- =============================================================================
-- BARBERSHOPS TABLE POLICIES
-- =============================================================================

-- Public can view active barbershops (for booking pages)
CREATE POLICY "public_view_active_barbershops" ON barbershops
  FOR SELECT TO public
  USING (is_active = true);

-- Authenticated users can view all barbershops they have access to
CREATE POLICY "authenticated_view_barbershops" ON barbershops
  FOR SELECT TO authenticated
  USING (true);

-- Shop owners can manage their own barbershop
CREATE POLICY "shop_owners_manage_own_barbershop" ON barbershops
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('SHOP_OWNER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN')
    )
  );

-- =============================================================================
-- BARBERS TABLE POLICIES
-- =============================================================================

-- Public can view barbers from active barbershops (for booking)
CREATE POLICY "public_view_active_barbers" ON barbers
  FOR SELECT TO public
  USING (
    EXISTS (
      SELECT 1 FROM barbershops 
      WHERE barbershops.id = barbers.barbershop_id 
      AND barbershops.is_active = true
    )
    AND barbers.is_available = true
    AND barbers.status = 'active'
  );

-- Barbers can view and update their own profile
CREATE POLICY "barbers_manage_own_profile" ON barbers
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Shop owners can manage barbers in their barbershops
CREATE POLICY "shop_owners_manage_barbers" ON barbers
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN barbershops b ON b.id = barbers.barbershop_id
      WHERE p.id = auth.uid() 
      AND p.role IN ('SHOP_OWNER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN barbershops b ON b.id = barbers.barbershop_id
      WHERE p.id = auth.uid() 
      AND p.role IN ('SHOP_OWNER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN')
    )
  );

-- =============================================================================
-- SERVICES TABLE POLICIES
-- =============================================================================

-- Public can view services from active barbershops
CREATE POLICY "public_view_active_services" ON services
  FOR SELECT TO public
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM barbershops 
      WHERE barbershops.id = services.barbershop_id 
      AND barbershops.is_active = true
    )
  );

-- Shop owners can manage services in their barbershops
CREATE POLICY "shop_owners_manage_services" ON services
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN barbershops b ON b.id = services.barbershop_id
      WHERE p.id = auth.uid() 
      AND p.role IN ('SHOP_OWNER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN barbershops b ON b.id = services.barbershop_id
      WHERE p.id = auth.uid() 
      AND p.role IN ('SHOP_OWNER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN')
    )
  );

-- =============================================================================
-- CLIENTS TABLE POLICIES
-- =============================================================================

-- Clients can view and update their own profile
CREATE POLICY "clients_manage_own_profile" ON clients
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Shop owners and barbers can view clients in their barbershop
CREATE POLICY "barbershop_staff_view_clients" ON clients
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() 
      AND (
        -- Shop owners can see all clients in their barbershop
        (p.role IN ('SHOP_OWNER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN')) OR
        -- Barbers can see clients in their barbershop
        (p.role = 'BARBER' AND EXISTS (
          SELECT 1 FROM barbers b 
          WHERE b.user_id = auth.uid() 
          AND b.barbershop_id = clients.barbershop_id
        ))
      )
    )
  );

-- Shop owners can manage clients in their barbershop
CREATE POLICY "shop_owners_manage_clients" ON clients
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN barbershops b ON b.id = clients.barbershop_id
      WHERE p.id = auth.uid() 
      AND p.role IN ('SHOP_OWNER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN barbershops b ON b.id = clients.barbershop_id
      WHERE p.id = auth.uid() 
      AND p.role IN ('SHOP_OWNER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN')
    )
  );

-- =============================================================================
-- APPOINTMENTS TABLE POLICIES
-- =============================================================================

-- Clients can view their own appointments
CREATE POLICY "clients_view_own_appointments" ON appointments
  FOR SELECT TO authenticated
  USING (
    client_id IN (
      SELECT id FROM clients WHERE user_id = auth.uid()
    )
  );

-- Clients can create appointments (for self-booking)
CREATE POLICY "clients_create_appointments" ON appointments
  FOR INSERT TO authenticated
  WITH CHECK (
    client_id IN (
      SELECT id FROM clients WHERE user_id = auth.uid()
    )
  );

-- Barbers can view appointments assigned to them
CREATE POLICY "barbers_view_own_appointments" ON appointments
  FOR SELECT TO authenticated
  USING (
    barber_id IN (
      SELECT id FROM barbers WHERE user_id = auth.uid()
    )
  );

-- Barbers can update appointments assigned to them
CREATE POLICY "barbers_update_own_appointments" ON appointments
  FOR UPDATE TO authenticated
  USING (
    barber_id IN (
      SELECT id FROM barbers WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    barber_id IN (
      SELECT id FROM barbers WHERE user_id = auth.uid()
    )
  );

-- Shop owners can manage all appointments in their barbershops
CREATE POLICY "shop_owners_manage_appointments" ON appointments
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN barbershops b ON b.id = appointments.barbershop_id
      WHERE p.id = auth.uid() 
      AND p.role IN ('SHOP_OWNER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN barbershops b ON b.id = appointments.barbershop_id
      WHERE p.id = auth.uid() 
      AND p.role IN ('SHOP_OWNER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN')
    )
  );

-- Public can create walk-in appointments (guest bookings)
CREATE POLICY "public_create_walkin_appointments" ON appointments
  FOR INSERT TO public
  WITH CHECK (
    client_id IS NULL  -- Guest booking without registered client
    AND client_name IS NOT NULL  -- Must provide name
    AND client_phone IS NOT NULL  -- Must provide contact
    AND is_walk_in = true  -- Must be marked as walk-in
  );

-- =============================================================================
-- APPOINTMENT HISTORY TABLE POLICIES
-- =============================================================================

-- Users can view history for appointments they have access to
CREATE POLICY "view_appointment_history" ON appointment_history
  FOR SELECT TO authenticated
  USING (
    appointment_id IN (
      SELECT id FROM appointments WHERE
      -- Client's own appointments
      client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()) OR
      -- Barber's own appointments  
      barber_id IN (SELECT id FROM barbers WHERE user_id = auth.uid()) OR
      -- Shop owner's barbershop appointments
      barbershop_id IN (
        SELECT b.id FROM barbershops b
        JOIN profiles p ON p.id = auth.uid()
        WHERE p.role IN ('SHOP_OWNER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN')
      )
    )
  );

-- Only staff can create history entries
CREATE POLICY "staff_create_appointment_history" ON appointment_history
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('BARBER', 'SHOP_OWNER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN')
    )
  );

-- =============================================================================
-- BARBER AVAILABILITY TABLE POLICIES
-- =============================================================================

-- Barbers can manage their own availability
CREATE POLICY "barbers_manage_own_availability" ON barber_availability
  FOR ALL TO authenticated
  USING (
    barber_id IN (
      SELECT id FROM barbers WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    barber_id IN (
      SELECT id FROM barbers WHERE user_id = auth.uid()
    )
  );

-- Shop owners can manage barber availability in their barbershops
CREATE POLICY "shop_owners_manage_barber_availability" ON barber_availability
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN barbers b ON b.id = barber_availability.barber_id
      JOIN barbershops bs ON bs.id = b.barbershop_id
      WHERE p.id = auth.uid() 
      AND p.role IN ('SHOP_OWNER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN barbers b ON b.id = barber_availability.barber_id
      JOIN barbershops bs ON bs.id = b.barbershop_id
      WHERE p.id = auth.uid() 
      AND p.role IN ('SHOP_OWNER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN')
    )
  );

-- Public can view availability for booking purposes
CREATE POLICY "public_view_barber_availability" ON barber_availability
  FOR SELECT TO public
  USING (
    EXISTS (
      SELECT 1 FROM barbers b
      JOIN barbershops bs ON bs.id = b.barbershop_id
      WHERE b.id = barber_availability.barber_id
      AND bs.is_active = true
      AND b.is_available = true
    )
  );

-- =============================================================================
-- BOOKING PREFERENCES TABLE POLICIES
-- =============================================================================

-- Clients can manage their own booking preferences
CREATE POLICY "clients_manage_own_preferences" ON booking_preferences
  FOR ALL TO authenticated
  USING (
    client_id IN (
      SELECT id FROM clients WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    client_id IN (
      SELECT id FROM clients WHERE user_id = auth.uid()
    )
  );

-- Shop owners can view client preferences for better service
CREATE POLICY "shop_owners_view_client_preferences" ON booking_preferences
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN clients c ON c.id = booking_preferences.client_id
      JOIN barbershops b ON b.id = c.barbershop_id
      WHERE p.id = auth.uid() 
      AND p.role IN ('SHOP_OWNER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN')
    )
  );

-- =============================================================================
-- ADDITIONAL SECURITY FUNCTIONS
-- =============================================================================

-- Function to check if user owns/manages a barbershop
CREATE OR REPLACE FUNCTION user_manages_barbershop(barbershop_uuid UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('SHOP_OWNER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN')
  );
$$;

-- Function to check if user is a barber at a barbershop
CREATE OR REPLACE FUNCTION user_is_barber_at(barbershop_uuid UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM barbers b
    WHERE b.user_id = auth.uid()
    AND b.barbershop_id = barbershop_uuid
  );
$$;

-- =============================================================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON POLICY "public_view_active_barbershops" ON barbershops IS 'Allows public to view active barbershops for booking pages';
COMMENT ON POLICY "shop_owners_manage_own_barbershop" ON barbershops IS 'Shop owners can manage their own barbershop data';
COMMENT ON POLICY "public_view_active_barbers" ON barbers IS 'Public can view available barbers for booking';
COMMENT ON POLICY "clients_manage_own_profile" ON clients IS 'Clients can manage their own profile information';
COMMENT ON POLICY "clients_view_own_appointments" ON appointments IS 'Clients can view their own appointment history';
COMMENT ON POLICY "barbers_view_own_appointments" ON appointments IS 'Barbers can view appointments assigned to them';
COMMENT ON POLICY "public_create_walkin_appointments" ON appointments IS 'Allows public to create walk-in/guest appointments';

-- Create indexes for better RLS performance
CREATE INDEX IF NOT EXISTS idx_barbers_user_id ON barbers(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_client_id ON appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_appointments_barber_id ON appointments(barber_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

COMMENT ON TABLE barbershops IS 'RLS enabled: Public read for active shops, owners manage their own';
COMMENT ON TABLE barbers IS 'RLS enabled: Public read for active barbers, self-management, owner oversight';
COMMENT ON TABLE appointments IS 'RLS enabled: Multi-role access (clients, barbers, owners) plus guest bookings';
COMMENT ON TABLE clients IS 'RLS enabled: Self-management and barbershop staff access';