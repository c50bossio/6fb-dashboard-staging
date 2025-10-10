-- 6FB AI Agent System - Complete Schema Migration (Without pgvector)
-- This script aligns the database with the expected API structure
-- Run this in Supabase SQL Editor

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- ENUMS
-- =============================================================================

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM (
      'CLIENT',
      'BARBER', 
      'SHOP_OWNER',
      'ENTERPRISE_OWNER',
      'SUPER_ADMIN'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE appointment_status AS ENUM (
      'PENDING',
      'CONFIRMED',
      'COMPLETED', 
      'CANCELLED',
      'NO_SHOW'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM (
      'PENDING',
      'COMPLETED',
      'FAILED',
      'REFUNDED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =============================================================================
-- CORE TABLES
-- =============================================================================

-- Barbershops table
CREATE TABLE IF NOT EXISTS barbershops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(50),
  zip_code VARCHAR(10),
  country VARCHAR(50) DEFAULT 'US',
  phone VARCHAR(20),
  email VARCHAR(255),
  website VARCHAR(255),
  
  -- Business hours (JSON format)
  business_hours JSONB DEFAULT '{}',
  
  -- Owner information (will link to profiles table)
  owner_id UUID,
  
  -- Settings
  booking_enabled BOOLEAN DEFAULT TRUE,
  online_booking_enabled BOOLEAN DEFAULT TRUE,
  ai_agent_enabled BOOLEAN DEFAULT TRUE,
  
  -- Website settings
  website_enabled BOOLEAN DEFAULT TRUE,
  shop_slug VARCHAR(100) UNIQUE,
  logo_url TEXT,
  cover_image_url TEXT,
  hero_title VARCHAR(255),
  hero_subtitle TEXT,
  about_text TEXT,
  brand_colors JSONB DEFAULT '{}',
  custom_fonts JSONB DEFAULT '{}',
  theme_preset VARCHAR(50) DEFAULT 'default',
  custom_css TEXT,
  social_links JSONB DEFAULT '{}',
  
  -- SEO
  seo_title VARCHAR(255),
  seo_description TEXT,
  seo_keywords VARCHAR(500),
  custom_domain VARCHAR(255),
  
  -- Analytics
  monthly_revenue DECIMAL(10,2) DEFAULT 0,
  total_clients INTEGER DEFAULT 0,
  avg_rating DECIMAL(3,2) DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Barbershop staff relationships
CREATE TABLE IF NOT EXISTS barbershop_staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  user_id UUID, -- Will reference profiles
  role TEXT DEFAULT 'BARBER',
  commission_rate DECIMAL(5,4) DEFAULT 0.20,
  is_active BOOLEAN DEFAULT TRUE,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(barbershop_id, user_id)
);

-- =============================================================================
-- FIX EXISTING TABLES
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
  -- Add category column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'services' AND column_name = 'category') THEN
    ALTER TABLE services ADD COLUMN category VARCHAR(100);
  END IF;
  
  -- Add is_active column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'services' AND column_name = 'is_active') THEN
    ALTER TABLE services ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
  END IF;
  
  -- Add description column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'services' AND column_name = 'description') THEN
    ALTER TABLE services ADD COLUMN description TEXT;
  END IF;
END $$;

-- Fix appointments table - add scheduled_at column (consolidate date/time)
DO $$
BEGIN
  -- Add scheduled_at column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'appointments' AND column_name = 'scheduled_at') THEN
    ALTER TABLE appointments ADD COLUMN scheduled_at TIMESTAMP WITH TIME ZONE;
    
    -- Migrate existing data from date/time to scheduled_at
    UPDATE appointments 
    SET scheduled_at = (date::text || ' ' || time::text)::timestamp with time zone 
    WHERE date IS NOT NULL AND time IS NOT NULL;
  END IF;
  
  -- Add other missing columns to appointments
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
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'appointments' AND column_name = 'google_calendar_event_id') THEN
    ALTER TABLE appointments ADD COLUMN google_calendar_event_id VARCHAR(255);
  END IF;
  
  -- Fix column references (customer_id -> client_id)
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'appointments' AND column_name = 'customer_id')
  AND NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'appointments' AND column_name = 'client_id') THEN
    ALTER TABLE appointments RENAME COLUMN customer_id TO client_id;
  END IF;
END $$;

-- =============================================================================
-- SUPPORTING TABLES
-- =============================================================================

-- Business hours table
CREATE TABLE IF NOT EXISTS business_hours (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  is_open BOOLEAN DEFAULT TRUE,
  open_time TIME,
  close_time TIME,
  break_start_time TIME,
  break_end_time TIME,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(barbershop_id, day_of_week)
);

-- Website sections table
CREATE TABLE IF NOT EXISTS website_sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  section_type VARCHAR(50) NOT NULL,
  title VARCHAR(255),
  content JSONB DEFAULT '{}',
  is_enabled BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(barbershop_id, section_type)
);

-- Barbershop gallery
CREATE TABLE IF NOT EXISTS barbershop_gallery (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  caption VARCHAR(255),
  alt_text VARCHAR(255),
  category VARCHAR(50),
  is_featured BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Team members
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  user_id UUID, -- References profiles
  name VARCHAR(255) NOT NULL,
  title VARCHAR(100),
  bio TEXT,
  specialties TEXT[],
  profile_image_url TEXT,
  years_experience INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customer testimonials
CREATE TABLE IF NOT EXISTS customer_testimonials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  customer_name VARCHAR(255) NOT NULL,
  customer_image_url TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  testimonial_text TEXT NOT NULL,
  service_type VARCHAR(100),
  date_received DATE DEFAULT CURRENT_DATE,
  is_approved BOOLEAN DEFAULT FALSE,
  is_featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
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

-- Barbershop staff indexes
CREATE INDEX IF NOT EXISTS idx_barbershop_staff_barbershop_id ON barbershop_staff(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_barbershop_staff_user_id ON barbershop_staff(user_id);
CREATE INDEX IF NOT EXISTS idx_barbershop_staff_is_active ON barbershop_staff(is_active);

-- Barbershops indexes
CREATE INDEX IF NOT EXISTS idx_barbershops_owner_id ON barbershops(owner_id);
CREATE INDEX IF NOT EXISTS idx_barbershops_shop_slug ON barbershops(shop_slug);

-- Success message
SELECT 'Database schema migration completed successfully!' as status;