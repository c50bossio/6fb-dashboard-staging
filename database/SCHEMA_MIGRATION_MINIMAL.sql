-- 6FB AI Agent System - Minimal Schema Migration
-- This script fixes only the critical issues identified in the analysis
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- FIX EXISTING APPOINTMENTS TABLE
-- =============================================================================

-- Add scheduled_at column if missing (consolidate date/time)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'appointments' AND column_name = 'scheduled_at') THEN
    ALTER TABLE appointments ADD COLUMN scheduled_at TIMESTAMP WITH TIME ZONE;
    
    -- Migrate existing data from date/time to scheduled_at
    UPDATE appointments 
    SET scheduled_at = (date::text || ' ' || time::text)::timestamp with time zone 
    WHERE date IS NOT NULL AND time IS NOT NULL AND scheduled_at IS NULL;
  END IF;
END $$;

-- Add missing columns to appointments
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'appointments' AND column_name = 'client_name') THEN
    ALTER TABLE appointments ADD COLUMN client_name VARCHAR(255);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'appointments' AND column_name = 'client_phone') THEN
    ALTER TABLE appointments ADD COLUMN client_phone VARCHAR(20);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'appointments' AND column_name = 'client_email') THEN
    ALTER TABLE appointments ADD COLUMN client_email VARCHAR(255);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'appointments' AND column_name = 'tip_amount') THEN
    ALTER TABLE appointments ADD COLUMN tip_amount DECIMAL(8,2) DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'appointments' AND column_name = 'total_amount') THEN
    ALTER TABLE appointments ADD COLUMN total_amount DECIMAL(8,2);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'appointments' AND column_name = 'service_price') THEN
    ALTER TABLE appointments ADD COLUMN service_price DECIMAL(8,2);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'appointments' AND column_name = 'client_notes') THEN
    ALTER TABLE appointments ADD COLUMN client_notes TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'appointments' AND column_name = 'barber_notes') THEN
    ALTER TABLE appointments ADD COLUMN barber_notes TEXT;
  END IF;
END $$;

-- Fix column references (customer_id -> client_id) if needed
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'appointments' AND column_name = 'customer_id')
  AND NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'appointments' AND column_name = 'client_id') THEN
    ALTER TABLE appointments RENAME COLUMN customer_id TO client_id;
  END IF;
END $$;

-- =============================================================================
-- CREATE BARBERSHOPS TABLE (MINIMAL VERSION)
-- =============================================================================

CREATE TABLE IF NOT EXISTS barbershops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(50),
  phone VARCHAR(20),
  email VARCHAR(255),
  owner_id UUID, -- References profiles table
  booking_enabled BOOLEAN DEFAULT TRUE,
  online_booking_enabled BOOLEAN DEFAULT TRUE,
  website_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- FIX SERVICES TABLE
-- =============================================================================

-- Add missing barbershop_id column to services if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'services' AND column_name = 'barbershop_id') THEN
    ALTER TABLE services ADD COLUMN barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add other missing columns to services
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'services' AND column_name = 'category') THEN
    ALTER TABLE services ADD COLUMN category VARCHAR(100);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'services' AND column_name = 'is_active') THEN
    ALTER TABLE services ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'services' AND column_name = 'description') THEN
    ALTER TABLE services ADD COLUMN description TEXT;
  END IF;
END $$;

-- =============================================================================
-- BASIC INDEXES FOR PERFORMANCE
-- =============================================================================

-- Appointments indexes
CREATE INDEX IF NOT EXISTS idx_appointments_barbershop_id ON appointments(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_appointments_barber_id ON appointments(barber_id);
CREATE INDEX IF NOT EXISTS idx_appointments_client_id ON appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled_at ON appointments(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

-- Services indexes
CREATE INDEX IF NOT EXISTS idx_services_barbershop_id ON services(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_services_is_active ON services(is_active);

-- Success message
SELECT 'Minimal database migration completed successfully!' as status;