-- 🚀 COPY THIS SQL AND RUN IN SUPABASE DASHBOARD
-- Go to: https://supabase.com/dashboard/project/dfhqjdoydihajmjxniee
-- Click: SQL Editor → New Query
-- Paste this entire code and click RUN

-- Create the barbershops table with all website customization fields
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
  owner_id UUID,
  
  -- Website customization fields (THIS IS WHAT WAS MISSING!)
  logo_url TEXT,
  cover_image_url TEXT,
  hero_title TEXT,
  hero_subtitle TEXT,
  about_text TEXT,
  website_enabled BOOLEAN DEFAULT true,
  shop_slug TEXT UNIQUE,
  custom_domain TEXT,
  custom_css TEXT,
  
  -- Branding and theme fields
  brand_colors JSONB DEFAULT '{"primary": "#3B82F6", "secondary": "#1E40AF", "accent": "#10B981", "text": "#1F2937", "background": "#FFFFFF"}',
  custom_fonts JSONB DEFAULT '{"heading": "Inter", "body": "Inter"}',
  theme_preset TEXT DEFAULT 'default',
  social_links JSONB DEFAULT '{}',
  
  -- SEO fields
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

-- Set up security (Row Level Security)
ALTER TABLE public.barbershops ENABLE ROW LEVEL SECURITY;

-- Create policies to allow access
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.barbershops;
CREATE POLICY "Allow all for authenticated users" ON public.barbershops 
  FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow public read" ON public.barbershops;  
CREATE POLICY "Allow public read" ON public.barbershops 
  FOR SELECT TO anon USING (website_enabled = true);

-- Insert the demo barbershop data (THIS WILL MAKE EVERYTHING WORK!)
INSERT INTO public.barbershops (
  id, 
  name, 
  description, 
  tagline, 
  address, 
  city, 
  state, 
  zip_code, 
  country,
  phone, 
  email, 
  website,
  hero_title, 
  hero_subtitle, 
  about_text,
  website_enabled, 
  shop_slug,
  brand_colors, 
  custom_fonts, 
  theme_preset, 
  social_links,
  seo_title, 
  seo_description, 
  seo_keywords,
  booking_enabled, 
  online_booking_enabled
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
  'Welcome to Elite Cuts Barbershop',
  'Experience professional barbering with master craftsmen',
  'Professional barbering services with attention to detail and customer satisfaction.',
  true,
  'elite-cuts-barbershop',
  '{"primary": "#3B82F6", "secondary": "#1E40AF", "accent": "#10B981", "text": "#1F2937", "background": "#FFFFFF"}'::JSONB,
  '{"heading": "Inter", "body": "Inter"}'::JSONB,
  'default',
  '{"instagram": "https://instagram.com/elitecuts", "facebook": "https://facebook.com/elitecuts", "twitter": "https://twitter.com/elitecuts", "google_business": "https://goo.gl/maps/example"}'::JSONB,
  'Elite Cuts Barbershop | Professional Haircuts in Downtown',
  'Experience premium barbering at Elite Cuts. Professional haircuts, modern fades, beard grooming & styling. Book online today!',
  'barbershop, haircuts, fade, beard trim, grooming, downtown',
  true,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  tagline = EXCLUDED.tagline,
  hero_title = EXCLUDED.hero_title,
  hero_subtitle = EXCLUDED.hero_subtitle,
  about_text = EXCLUDED.about_text,
  updated_at = NOW();

-- Verify the data was inserted correctly
SELECT 
  id, 
  name, 
  shop_slug, 
  website_enabled, 
  brand_colors,
  theme_preset,
  hero_title
FROM public.barbershops 
WHERE id = '550e8400-e29b-41d4-a716-446655440000'::UUID;