-- Supabase Database Setup for 6FB AI Agent System
-- This script creates all necessary tables for the barbershop management system

-- Enable Row Level Security by default
ALTER database postgres SET "app.jwt_secret" TO 'your-jwt-secret-here';

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'CLIENT' CHECK (role IN ('CLIENT', 'BARBER', 'SHOP_OWNER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN')),
  shop_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Barbershops table with comprehensive customization fields
CREATE TABLE IF NOT EXISTS public.barbershops (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  tagline TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT DEFAULT 'US',
  phone TEXT,
  email TEXT,
  website TEXT,
  owner_id UUID REFERENCES public.users(id),
  
  -- Website customization fields
  logo_url TEXT,
  cover_image_url TEXT,
  hero_title TEXT,
  hero_subtitle TEXT,
  about_text TEXT,
  website_enabled BOOLEAN DEFAULT true,
  shop_slug TEXT UNIQUE,
  custom_domain TEXT,
  custom_css TEXT,
  
  -- Branding and theme
  brand_colors JSONB DEFAULT '{"primary": "#3B82F6", "secondary": "#1E40AF", "accent": "#10B981", "text": "#1F2937", "background": "#FFFFFF"}',
  custom_fonts JSONB DEFAULT '{"heading": "Inter", "body": "Inter"}',
  theme_preset TEXT DEFAULT 'default',
  social_links JSONB DEFAULT '{}',
  
  -- SEO
  seo_title TEXT,
  seo_description TEXT,
  seo_keywords TEXT,
  
  -- Booking settings
  booking_enabled BOOLEAN DEFAULT true,
  online_booking_enabled BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Business hours table
CREATE TABLE IF NOT EXISTS public.business_hours (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE,
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
  is_open BOOLEAN DEFAULT true,
  open_time TIME,
  close_time TIME,
  break_start_time TIME,
  break_end_time TIME,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(barbershop_id, day_of_week)
);

-- Website sections table
CREATE TABLE IF NOT EXISTS public.website_sections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE,
  section_type TEXT NOT NULL,
  title TEXT,
  content TEXT,
  is_enabled BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Team members table
CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  title TEXT,
  bio TEXT,
  specialties TEXT,
  years_experience INTEGER,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customer testimonials table
CREATE TABLE IF NOT EXISTS public.customer_testimonials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  testimonial_text TEXT NOT NULL,
  service_type TEXT,
  date_received DATE DEFAULT CURRENT_DATE,
  is_featured BOOLEAN DEFAULT true,
  is_approved BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barbershops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_testimonials ENABLE ROW LEVEL SECURITY;

-- RLS Policies for development (allow all operations)
-- In production, these should be more restrictive
CREATE POLICY "Allow all for authenticated users" ON public.users FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON public.barbershops FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON public.business_hours FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON public.website_sections FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON public.team_members FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON public.customer_testimonials FOR ALL TO authenticated USING (true);

-- Also allow public access for website display
CREATE POLICY "Allow public read" ON public.barbershops FOR SELECT TO anon USING (website_enabled = true);
CREATE POLICY "Allow public read" ON public.business_hours FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public read" ON public.website_sections FOR SELECT TO anon USING (is_enabled = true);
CREATE POLICY "Allow public read" ON public.team_members FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "Allow public read" ON public.customer_testimonials FOR SELECT TO anon USING (is_approved = true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_barbershops_owner_id ON public.barbershops(owner_id);
CREATE INDEX IF NOT EXISTS idx_barbershops_shop_slug ON public.barbershops(shop_slug);
CREATE INDEX IF NOT EXISTS idx_business_hours_barbershop_id ON public.business_hours(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_website_sections_barbershop_id ON public.website_sections(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_team_members_barbershop_id ON public.team_members(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_customer_testimonials_barbershop_id ON public.customer_testimonials(barbershop_id);

-- Insert demo data
-- First create a demo user (this will be linked to the actual auth user)
INSERT INTO public.users (id, email, full_name, role, created_at, updated_at)
VALUES (
  '550e8400-e29b-41d4-a716-446655440001'::UUID,
  'demo@barbershop.com',
  'Demo User',
  'SHOP_OWNER',
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  updated_at = EXCLUDED.updated_at;

-- Insert demo barbershop with complete customization data
INSERT INTO public.barbershops (
  id, name, description, tagline, address, city, state, zip_code, country,
  phone, email, website, owner_id,
  logo_url, cover_image_url, hero_title, hero_subtitle, about_text,
  website_enabled, shop_slug, custom_domain, custom_css,
  brand_colors, custom_fonts, theme_preset, social_links,
  seo_title, seo_description, seo_keywords,
  booking_enabled, online_booking_enabled,
  created_at, updated_at
) VALUES (
  '550e8400-e29b-41d4-a716-446655440000'::UUID,
  'Elite Cuts Barbershop',
  'Professional barbering services with attention to detail and customer satisfaction.',
  'Premium Cuts, Professional Service',
  '123 Main Street',
  'New York',
  'NY',
  '10001',
  'US',
  '(555) 123-4567',
  'info@barbershop.com',
  'https://elitecuts.example.com',
  '550e8400-e29b-41d4-a716-446655440001'::UUID,
  null,
  null,
  'Welcome to Elite Cuts Barbershop',
  'Experience professional barbering with master craftsmen',
  'Professional barbering services with attention to detail and customer satisfaction.',
  true,
  'elite-cuts-barbershop',
  null,
  null,
  '{"primary": "#3B82F6", "secondary": "#1E40AF", "accent": "#10B981", "text": "#1F2937", "background": "#FFFFFF"}'::JSONB,
  '{"heading": "Inter", "body": "Inter"}'::JSONB,
  'default',
  '{"instagram": "https://instagram.com/elitecuts", "facebook": "https://facebook.com/elitecuts", "twitter": "https://twitter.com/elitecuts", "google_business": "https://goo.gl/maps/example"}'::JSONB,
  'Elite Cuts Barbershop | Professional Haircuts in Downtown',
  'Experience premium barbering at Elite Cuts. Professional haircuts, modern fades, beard grooming & styling. Book online today!',
  'barbershop, haircuts, fade, beard trim, grooming, downtown',
  true,
  true,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  tagline = EXCLUDED.tagline,
  address = EXCLUDED.address,
  city = EXCLUDED.city,
  state = EXCLUDED.state,
  zip_code = EXCLUDED.zip_code,
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  website = EXCLUDED.website,
  hero_title = EXCLUDED.hero_title,
  hero_subtitle = EXCLUDED.hero_subtitle,
  about_text = EXCLUDED.about_text,
  website_enabled = EXCLUDED.website_enabled,
  shop_slug = EXCLUDED.shop_slug,
  brand_colors = EXCLUDED.brand_colors,
  custom_fonts = EXCLUDED.custom_fonts,
  theme_preset = EXCLUDED.theme_preset,
  social_links = EXCLUDED.social_links,
  seo_title = EXCLUDED.seo_title,
  seo_description = EXCLUDED.seo_description,
  seo_keywords = EXCLUDED.seo_keywords,
  updated_at = EXCLUDED.updated_at;

-- Insert business hours for the demo barbershop
INSERT INTO public.business_hours (barbershop_id, day_of_week, is_open, open_time, close_time, break_start_time, break_end_time, notes)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440000'::UUID, 0, false, null, null, null, null, 'Closed'),
  ('550e8400-e29b-41d4-a716-446655440000'::UUID, 1, true, '09:00', '19:00', '12:00', '13:00', null),
  ('550e8400-e29b-41d4-a716-446655440000'::UUID, 2, true, '09:00', '19:00', '12:00', '13:00', null),
  ('550e8400-e29b-41d4-a716-446655440000'::UUID, 3, true, '09:00', '19:00', '12:00', '13:00', null),
  ('550e8400-e29b-41d4-a716-446655440000'::UUID, 4, true, '09:00', '19:00', '12:00', '13:00', null),
  ('550e8400-e29b-41d4-a716-446655440000'::UUID, 5, true, '09:00', '19:00', '12:00', '13:00', null),
  ('550e8400-e29b-41d4-a716-446655440000'::UUID, 6, true, '10:00', '18:00', '12:00', '13:00', null)
ON CONFLICT (barbershop_id, day_of_week) DO UPDATE SET
  is_open = EXCLUDED.is_open,
  open_time = EXCLUDED.open_time,
  close_time = EXCLUDED.close_time,
  break_start_time = EXCLUDED.break_start_time,
  break_end_time = EXCLUDED.break_end_time,
  notes = EXCLUDED.notes;

-- Insert demo team members
INSERT INTO public.team_members (barbershop_id, name, title, bio, specialties, years_experience, display_order, is_active)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440000'::UUID, 'Mike Johnson', 'Master Barber', 'Over 15 years of experience in classic and modern cuts.', 'Fades, Beard Styling, Classic Cuts', 15, 1, true),
  ('550e8400-e29b-41d4-a716-446655440000'::UUID, 'Sarah Davis', 'Senior Stylist', 'Specializes in modern styles and creative cuts.', 'Modern Cuts, Hair Styling, Color', 8, 2, true)
ON CONFLICT DO NOTHING;

-- Insert demo testimonials
INSERT INTO public.customer_testimonials (barbershop_id, customer_name, rating, testimonial_text, service_type, date_received, is_featured, is_approved, display_order)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440000'::UUID, 'John Smith', 5, 'Best haircut I''ve ever had! Mike really knows what he''s doing.', 'Haircut & Beard Trim', '2024-01-15', true, true, 1),
  ('550e8400-e29b-41d4-a716-446655440000'::UUID, 'David Wilson', 5, 'Great atmosphere and excellent service. Highly recommended!', 'Fade Cut', '2024-01-20', true, true, 2)
ON CONFLICT DO NOTHING;

-- Update the owner_id reference in barbershops to link to users
UPDATE public.barbershops 
SET owner_id = (SELECT id FROM public.users WHERE email = 'demo@barbershop.com' LIMIT 1)
WHERE id = '550e8400-e29b-41d4-a716-446655440000'::UUID;