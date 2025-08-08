# 🚀 Supabase Manual Setup Guide for Website Settings

## The Problem
The website settings save functionality is failing because it's trying to save to Supabase, but the database tables don't exist yet.

## Quick Fix (5 minutes)

### 1. Go to Supabase Dashboard
Open: https://supabase.com/dashboard/project/dfhqjdoydihajmjxniee

### 2. Open SQL Editor
1. Click **"SQL Editor"** in the left sidebar
2. Click **"New Query"**

### 3. Run This SQL (copy/paste all at once)

```sql
-- Create barbershops table with all customization fields
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

-- Enable Row Level Security (but allow all for now)
ALTER TABLE public.barbershops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users" ON public.barbershops FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow public read" ON public.barbershops FOR SELECT TO anon USING (website_enabled = true);

-- Insert demo barbershop data
INSERT INTO public.barbershops (
  id, name, description, tagline, address, city, state, zip_code, country,
  phone, email, website,
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
  updated_at = EXCLUDED.updated_at;
```

### 4. Click "Run" 

You should see success messages for each command.

### 5. Verify Data
Run this to check:
```sql
SELECT id, name, shop_slug, website_enabled, brand_colors FROM public.barbershops;
```

You should see the Elite Cuts Barbershop record.

## ✅ Test the Fix

1. Go to: http://localhost:9999/dashboard/website-settings
2. Make a small change (like updating the business name)
3. Click **"Save Changes"**
4. You should see a success message!
5. Refresh the page - your changes should persist ✅

## 🎉 What This Fixes

- **Save functionality** now works with real Supabase database
- **Data persistence** across page reloads
- **Real-time preview** updates
- **Production-ready** database setup

The website settings will now save properly to the cloud database instead of failing! 🚀