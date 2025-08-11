-- Migration: Add customers table for enhanced customer management
-- Version: 002
-- Created: 2025-01-10

BEGIN;

-- Create customers table for comprehensive customer management
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbershop_id VARCHAR(255) NOT NULL, -- Reference to barbershop (can be string ID for demo)
  
  -- Basic contact information
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(255),
  
  -- Customer preferences and history
  preferences JSONB DEFAULT '{}', -- Service preferences, notes, allergies, etc.
  notes TEXT, -- Staff notes about customer
  total_visits INTEGER DEFAULT 0,
  total_spent DECIMAL(10,2) DEFAULT 0,
  last_visit_at TIMESTAMP WITH TIME ZONE,
  
  -- Notification preferences
  notification_preferences JSONB DEFAULT '{"sms": true, "email": true, "reminders": true, "confirmations": true}',
  
  -- Customer status and engagement
  is_active BOOLEAN DEFAULT TRUE,
  vip_status BOOLEAN DEFAULT FALSE,
  referral_code VARCHAR(20), -- For referral programs
  referred_by_customer_id UUID REFERENCES customers(id),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT customers_email_phone_check CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

-- Create indexes for fast searching
CREATE INDEX IF NOT EXISTS idx_customers_barbershop_id ON customers(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_customers_active ON customers(barbershop_id, is_active);
CREATE INDEX IF NOT EXISTS idx_customers_last_visit ON customers(barbershop_id, last_visit_at);

-- Add customer_id column to appointments table (keeping existing fields for backward compatibility)
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id);

-- Create index for customer appointments relationship
CREATE INDEX IF NOT EXISTS idx_appointments_customer_id ON appointments(customer_id);

-- Create trigger to update customer stats when appointments change
CREATE OR REPLACE FUNCTION update_customer_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.customer_id IS NOT NULL THEN
    -- New appointment created
    UPDATE customers 
    SET 
      total_visits = total_visits + 1,
      last_visit_at = GREATEST(last_visit_at, NEW.scheduled_at),
      updated_at = NOW()
    WHERE id = NEW.customer_id;
    
  ELSIF TG_OP = 'UPDATE' AND NEW.customer_id IS NOT NULL THEN
    -- Appointment updated - recalculate stats
    UPDATE customers 
    SET 
      last_visit_at = (
        SELECT MAX(scheduled_at) 
        FROM appointments 
        WHERE customer_id = NEW.customer_id
      ),
      total_visits = (
        SELECT COUNT(*) 
        FROM appointments 
        WHERE customer_id = NEW.customer_id
      ),
      updated_at = NOW()
    WHERE id = NEW.customer_id;
    
  ELSIF TG_OP = 'DELETE' AND OLD.customer_id IS NOT NULL THEN
    -- Appointment deleted - recalculate stats
    UPDATE customers 
    SET 
      last_visit_at = (
        SELECT MAX(scheduled_at) 
        FROM appointments 
        WHERE customer_id = OLD.customer_id
      ),
      total_visits = GREATEST(0, total_visits - 1),
      updated_at = NOW()
    WHERE id = OLD.customer_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_customer_stats ON appointments;
CREATE TRIGGER trigger_update_customer_stats
  AFTER INSERT OR UPDATE OR DELETE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_customer_stats();

-- Create updated_at trigger for customers table
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_customers_updated_at ON customers;
CREATE TRIGGER trigger_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;