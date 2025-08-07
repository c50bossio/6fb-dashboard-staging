-- Enhanced Appointment System Schema for 6FB AI Agent System
-- Builds upon existing complete-schema.sql with appointment-specific enhancements

-- ==========================================
-- APPOINTMENT SYSTEM ENHANCEMENTS
-- ==========================================

-- Add customers table for non-registered users
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  notes TEXT,
  
  -- Customer preferences
  preferred_barber_id UUID REFERENCES users(id) ON DELETE SET NULL,
  communication_preferences JSONB DEFAULT '{"sms": true, "email": true}',
  
  -- Customer history
  first_visit DATE,
  last_visit DATE,
  total_visits INTEGER DEFAULT 0,
  total_spent DECIMAL(10,2) DEFAULT 0,
  
  -- Marketing preferences
  marketing_consent BOOLEAN DEFAULT FALSE,
  referral_source VARCHAR(100),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure at least email or phone is provided
  CONSTRAINT customers_contact_check CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

-- Enhanced appointments table (updating existing structure)
-- Note: This builds on the existing appointments table from complete-schema.sql

-- Add additional columns to appointments table if they don't exist
DO $$ 
BEGIN
  -- Add customer reference for walk-in customers
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='appointments' AND column_name='customer_id') THEN
    ALTER TABLE appointments ADD COLUMN customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;
  END IF;
  
  -- Add booking source tracking
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='appointments' AND column_name='booking_source') THEN
    ALTER TABLE appointments ADD COLUMN booking_source VARCHAR(50) DEFAULT 'online'; -- online, phone, walk_in
  END IF;
  
  -- Add recurrence support
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='appointments' AND column_name='recurrence_rule') THEN
    ALTER TABLE appointments ADD COLUMN recurrence_rule TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='appointments' AND column_name='parent_appointment_id') THEN
    ALTER TABLE appointments ADD COLUMN parent_appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE;
  END IF;
  
  -- Add reminder tracking
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='appointments' AND column_name='reminder_sent_at') THEN
    ALTER TABLE appointments ADD COLUMN reminder_sent_at TIMESTAMP WITH TIME ZONE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='appointments' AND column_name='confirmation_sent_at') THEN
    ALTER TABLE appointments ADD COLUMN confirmation_sent_at TIMESTAMP WITH TIME ZONE;
  END IF;
  
  -- Add buffer time support
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='appointments' AND column_name='buffer_before_minutes') THEN
    ALTER TABLE appointments ADD COLUMN buffer_before_minutes INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='appointments' AND column_name='buffer_after_minutes') THEN
    ALTER TABLE appointments ADD COLUMN buffer_after_minutes INTEGER DEFAULT 15;
  END IF;
  
  -- Add walk-in support
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='appointments' AND column_name='is_walk_in') THEN
    ALTER TABLE appointments ADD COLUMN is_walk_in BOOLEAN DEFAULT FALSE;
  END IF;
  
  -- Add priority support
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='appointments' AND column_name='priority') THEN
    ALTER TABLE appointments ADD COLUMN priority INTEGER DEFAULT 0; -- 0=normal, 1=high, 2=urgent
  END IF;
END $$;

-- Barber availability table
CREATE TABLE IF NOT EXISTS barber_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barber_id UUID REFERENCES users(id) ON DELETE CASCADE,
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  
  -- Availability schedule
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 6=Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  
  -- Break times within the day
  break_times JSONB DEFAULT '[]', -- Array of {start: "12:00", end: "13:00"}
  
  -- Availability status
  is_available BOOLEAN DEFAULT TRUE,
  max_concurrent_bookings INTEGER DEFAULT 1,
  
  -- Override for specific dates
  specific_date DATE, -- If set, this rule applies only to this date
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure end time is after start time
  CONSTRAINT availability_time_check CHECK (end_time > start_time),
  
  -- Unique constraint to prevent overlapping schedules
  UNIQUE(barber_id, day_of_week, specific_date, start_time, end_time)
);

-- Appointment reminders and notifications
CREATE TABLE IF NOT EXISTS appointment_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
  
  -- Notification details
  notification_type VARCHAR(50) NOT NULL, -- reminder, confirmation, cancellation, rescheduled
  channel VARCHAR(20) NOT NULL, -- sms, email, push
  recipient_contact VARCHAR(255) NOT NULL, -- phone number or email
  
  -- Content
  subject VARCHAR(255),
  message TEXT NOT NULL,
  
  -- Status tracking
  status VARCHAR(20) DEFAULT 'pending', -- pending, sent, failed, delivered
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  
  -- External service tracking
  external_id VARCHAR(255), -- SMS/email service ID
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Service add-ons and packages
CREATE TABLE IF NOT EXISTS service_addons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_id UUID REFERENCES services(id) ON DELETE CASCADE,
  
  -- Add-on details
  name VARCHAR(255) NOT NULL,
  description TEXT,
  duration_minutes INTEGER DEFAULT 0,
  price DECIMAL(8,2) NOT NULL,
  
  -- Availability
  is_active BOOLEAN DEFAULT TRUE,
  requires_additional_time BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Appointment add-ons (many-to-many)
CREATE TABLE IF NOT EXISTS appointment_addons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
  addon_id UUID REFERENCES service_addons(id) ON DELETE CASCADE,
  
  -- Pricing at time of booking (for historical accuracy)
  price_at_booking DECIMAL(8,2) NOT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(appointment_id, addon_id)
);

-- Wait list for busy time slots
CREATE TABLE IF NOT EXISTS appointment_waitlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  client_id UUID REFERENCES users(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  barber_id UUID REFERENCES users(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id) ON DELETE CASCADE,
  
  -- Preferred time slots
  preferred_date DATE NOT NULL,
  preferred_time_start TIME,
  preferred_time_end TIME,
  flexible_timing BOOLEAN DEFAULT FALSE,
  
  -- Contact information (for non-registered customers)
  contact_name VARCHAR(255) NOT NULL,
  contact_phone VARCHAR(20),
  contact_email VARCHAR(255),
  
  -- Status
  status VARCHAR(20) DEFAULT 'active', -- active, notified, booked, expired
  
  -- Notification preferences
  notify_via_sms BOOLEAN DEFAULT TRUE,
  notify_via_email BOOLEAN DEFAULT TRUE,
  
  -- Expiration
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  notified_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure at least one contact method
  CONSTRAINT waitlist_contact_check CHECK (contact_phone IS NOT NULL OR contact_email IS NOT NULL)
);

-- ==========================================
-- INDEXES FOR PERFORMANCE
-- ==========================================

-- Customer indexes
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_preferred_barber ON customers(preferred_barber_id);

-- Enhanced appointment indexes
CREATE INDEX IF NOT EXISTS idx_appointments_customer ON appointments(customer_id);
CREATE INDEX IF NOT EXISTS idx_appointments_booking_source ON appointments(booking_source);
CREATE INDEX IF NOT EXISTS idx_appointments_parent ON appointments(parent_appointment_id);
CREATE INDEX IF NOT EXISTS idx_appointments_is_walk_in ON appointments(is_walk_in);
CREATE INDEX IF NOT EXISTS idx_appointments_priority ON appointments(priority);

-- Availability indexes
CREATE INDEX IF NOT EXISTS idx_barber_availability_barber ON barber_availability(barber_id);
CREATE INDEX IF NOT EXISTS idx_barber_availability_barbershop ON barber_availability(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_barber_availability_day ON barber_availability(day_of_week);
CREATE INDEX IF NOT EXISTS idx_barber_availability_date ON barber_availability(specific_date);

-- Notification indexes
CREATE INDEX IF NOT EXISTS idx_appointment_notifications_appointment ON appointment_notifications(appointment_id);
CREATE INDEX IF NOT EXISTS idx_appointment_notifications_status ON appointment_notifications(status);
CREATE INDEX IF NOT EXISTS idx_appointment_notifications_scheduled ON appointment_notifications(scheduled_for);

-- Add-on indexes
CREATE INDEX IF NOT EXISTS idx_service_addons_service ON service_addons(service_id);
CREATE INDEX IF NOT EXISTS idx_appointment_addons_appointment ON appointment_addons(appointment_id);

-- Waitlist indexes
CREATE INDEX IF NOT EXISTS idx_waitlist_barbershop ON appointment_waitlist(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_barber ON appointment_waitlist(barber_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_status ON appointment_waitlist(status);
CREATE INDEX IF NOT EXISTS idx_waitlist_expires ON appointment_waitlist(expires_at);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE barber_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_waitlist ENABLE ROW LEVEL SECURITY;

-- Customers RLS Policies
CREATE POLICY "Users can view customers from their barbershop" ON customers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM appointments a
      JOIN barbershop_staff bs ON bs.barbershop_id = a.barbershop_id
      WHERE a.customer_id = customers.id
      AND bs.user_id = auth.uid()
      AND bs.is_active = true
    )
  );

CREATE POLICY "Staff can insert customers" ON customers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM barbershop_staff bs
      WHERE bs.user_id = auth.uid()
      AND bs.is_active = true
    )
  );

CREATE POLICY "Staff can update customers from their barbershop" ON customers
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM appointments a
      JOIN barbershop_staff bs ON bs.barbershop_id = a.barbershop_id
      WHERE a.customer_id = customers.id
      AND bs.user_id = auth.uid()
      AND bs.is_active = true
    )
  );

-- Appointments RLS Policies (enhance existing)
DROP POLICY IF EXISTS "Users can view their own appointments" ON appointments;
DROP POLICY IF EXISTS "Staff can view barbershop appointments" ON appointments;
DROP POLICY IF EXISTS "Staff can manage appointments" ON appointments;

CREATE POLICY "Clients can view their own appointments" ON appointments
  FOR SELECT USING (client_id = auth.uid());

CREATE POLICY "Staff can view barbershop appointments" ON appointments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM barbershop_staff bs
      WHERE bs.barbershop_id = appointments.barbershop_id
      AND bs.user_id = auth.uid()
      AND bs.is_active = true
    )
  );

CREATE POLICY "Staff can manage barbershop appointments" ON appointments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM barbershop_staff bs
      WHERE bs.barbershop_id = appointments.barbershop_id
      AND bs.user_id = auth.uid()
      AND bs.is_active = true
    )
  );

-- Barber Availability RLS Policies
CREATE POLICY "Staff can view barbershop availability" ON barber_availability
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM barbershop_staff bs
      WHERE bs.barbershop_id = barber_availability.barbershop_id
      AND bs.user_id = auth.uid()
      AND bs.is_active = true
    )
  );

CREATE POLICY "Barbers can manage their own availability" ON barber_availability
  FOR ALL USING (barber_id = auth.uid());

CREATE POLICY "Shop owners can manage staff availability" ON barber_availability
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM barbershop_staff bs
      WHERE bs.barbershop_id = barber_availability.barbershop_id
      AND bs.user_id = auth.uid()
      AND bs.role IN ('SHOP_OWNER', 'SUPER_ADMIN')
      AND bs.is_active = true
    )
  );

-- Service Add-ons RLS Policies
CREATE POLICY "Staff can view barbershop service addons" ON service_addons
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM services s
      JOIN barbershop_staff bs ON bs.barbershop_id = s.barbershop_id
      WHERE s.id = service_addons.service_id
      AND bs.user_id = auth.uid()
      AND bs.is_active = true
    )
  );

CREATE POLICY "Staff can manage barbershop service addons" ON service_addons
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM services s
      JOIN barbershop_staff bs ON bs.barbershop_id = s.barbershop_id
      WHERE s.id = service_addons.service_id
      AND bs.user_id = auth.uid()
      AND bs.is_active = true
    )
  );

-- ==========================================
-- TRIGGERS AND FUNCTIONS
-- ==========================================

-- Function to update customer stats after appointment completion
CREATE OR REPLACE FUNCTION update_customer_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update customer visit count and last visit date
  IF NEW.status = 'COMPLETED' AND (OLD.status IS NULL OR OLD.status != 'COMPLETED') THEN
    IF NEW.customer_id IS NOT NULL THEN
      UPDATE customers 
      SET 
        total_visits = total_visits + 1,
        last_visit = NEW.scheduled_at::date,
        total_spent = total_spent + NEW.total_amount,
        updated_at = NOW()
      WHERE id = NEW.customer_id;
      
      -- Set first visit if this is the first completed appointment
      UPDATE customers 
      SET first_visit = NEW.scheduled_at::date
      WHERE id = NEW.customer_id 
      AND first_visit IS NULL;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for customer stats
DROP TRIGGER IF EXISTS update_customer_stats_trigger ON appointments;
CREATE TRIGGER update_customer_stats_trigger
  AFTER UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_stats();

-- Function to check appointment conflicts
CREATE OR REPLACE FUNCTION check_appointment_conflicts()
RETURNS TRIGGER AS $$
BEGIN
  -- Check for time conflicts with existing appointments
  IF EXISTS (
    SELECT 1 FROM appointments
    WHERE barber_id = NEW.barber_id
    AND status IN ('PENDING', 'CONFIRMED')
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)
    AND (
      -- New appointment starts during existing appointment
      (NEW.scheduled_at >= scheduled_at AND NEW.scheduled_at < scheduled_at + INTERVAL '1 minute' * duration_minutes) OR
      -- New appointment ends during existing appointment
      (NEW.scheduled_at + INTERVAL '1 minute' * NEW.duration_minutes > scheduled_at AND NEW.scheduled_at + INTERVAL '1 minute' * NEW.duration_minutes <= scheduled_at + INTERVAL '1 minute' * duration_minutes) OR
      -- New appointment encompasses existing appointment
      (NEW.scheduled_at <= scheduled_at AND NEW.scheduled_at + INTERVAL '1 minute' * NEW.duration_minutes >= scheduled_at + INTERVAL '1 minute' * duration_minutes)
    )
  ) THEN
    RAISE EXCEPTION 'Appointment time conflicts with existing booking for this barber';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for conflict checking
DROP TRIGGER IF EXISTS check_appointment_conflicts_trigger ON appointments;
CREATE TRIGGER check_appointment_conflicts_trigger
  BEFORE INSERT OR UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION check_appointment_conflicts();

-- Add updated_at triggers for new tables
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_barber_availability_updated_at BEFORE UPDATE ON barber_availability FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_service_addons_updated_at BEFORE UPDATE ON service_addons FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- DEFAULT DATA
-- ==========================================

-- Insert default service categories and add-ons for demonstration
-- This will be populated by the application setup process