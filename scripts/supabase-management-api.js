#!/usr/bin/env node

import 'dotenv/config';

const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const PROJECT_ID = 'dfhqjdoydihajmjxniee'; // From the URL

console.log('🚀 Attempting to use Supabase Management API...');
console.log('🔑 Access Token:', SUPABASE_ACCESS_TOKEN ? 'Found' : 'Missing');

async function executeViaMgmtAPI() {
  const sql = `
-- Create barbershops table
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
  logo_url TEXT,
  cover_image_url TEXT,
  hero_title TEXT,
  hero_subtitle TEXT,
  about_text TEXT,
  website_enabled BOOLEAN DEFAULT true,
  shop_slug TEXT UNIQUE,
  custom_domain TEXT,
  custom_css TEXT,
  brand_colors JSONB DEFAULT '{"primary": "#3B82F6", "secondary": "#1E40AF", "accent": "#10B981", "text": "#1F2937", "background": "#FFFFFF"}',
  custom_fonts JSONB DEFAULT '{"heading": "Inter", "body": "Inter"}',
  theme_preset TEXT DEFAULT 'default',
  social_links JSONB DEFAULT '{}',
  seo_title TEXT,
  seo_description TEXT,
  seo_keywords TEXT,
  booking_enabled BOOLEAN DEFAULT true,
  online_booking_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS and create policies
ALTER TABLE public.barbershops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users" ON public.barbershops FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow public read" ON public.barbershops FOR SELECT TO anon USING (website_enabled = true);

-- Insert demo data
INSERT INTO public.barbershops (
  id, name, description, tagline, address, city, state, zip_code, country,
  phone, email, website, hero_title, hero_subtitle, about_text,
  website_enabled, shop_slug, brand_colors, custom_fonts, theme_preset, social_links,
  seo_title, seo_description, seo_keywords, booking_enabled, online_booking_enabled
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
  '{"instagram": "https://instagram.com/elitecuts", "facebook": "https://facebook.com/elitecuts"}'::JSONB,
  'Elite Cuts Barbershop | Professional Haircuts',
  'Experience premium barbering at Elite Cuts.',
  'barbershop, haircuts, fade, beard trim, grooming, downtown',
  true,
  true
) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW();
  `;

  try {
    console.log('📋 Trying Management API...');
    
    const response = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_ID}/database/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: sql
      })
    });

    if (!response.ok) {
      console.log('❌ Management API failed:', response.status, response.statusText);
      const errorText = await response.text();
      console.log('Error details:', errorText);
      return false;
    }

    const result = await response.json();
    console.log('✅ Management API success:', result);
    return true;

  } catch (error) {
    console.error('💥 Management API error:', error.message);
    return false;
  }
}

async function tryDirectInsert() {
  console.log('📋 Trying direct data insert via REST API...');
  
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  const demoData = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Elite Cuts Barbershop',
    description: 'Professional barbering services with attention to detail and customer satisfaction.',
    tagline: 'Premium Cuts, Professional Service',
    address: '123 Main Street',
    city: 'New York',
    state: 'NY',
    zip_code: '10001',
    country: 'US',
    phone: '(555) 123-4567',
    email: 'info@barbershop.com',
    website: 'https://elitecuts.example.com',
    hero_title: 'Welcome to Elite Cuts Barbershop',
    hero_subtitle: 'Experience professional barbering with master craftsmen',
    about_text: 'Professional barbering services with attention to detail and customer satisfaction.',
    website_enabled: true,
    shop_slug: 'elite-cuts-barbershop',
    brand_colors: {
      primary: '#3B82F6',
      secondary: '#1E40AF',
      accent: '#10B981',
      text: '#1F2937',
      background: '#FFFFFF'
    },
    custom_fonts: {
      heading: 'Inter',
      body: 'Inter'
    },
    theme_preset: 'default',
    social_links: {
      instagram: 'https://instagram.com/elitecuts',
      facebook: 'https://facebook.com/elitecuts'
    },
    seo_title: 'Elite Cuts Barbershop | Professional Haircuts',
    seo_description: 'Experience premium barbering at Elite Cuts.',
    booking_enabled: true,
    online_booking_enabled: true
  };

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/barbershops`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(demoData)
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Direct insert success:', result[0]?.name);
      return true;
    } else {
      console.log('❌ Direct insert failed:', response.status);
      const errorText = await response.text();
      if (errorText.includes('does not exist')) {
        console.log('⚠️ Table does not exist - need to create it first');
      }
      return false;
    }

  } catch (error) {
    console.error('💥 Direct insert error:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Attempting automated Supabase setup...\n');

  let success = await executeViaMgmtAPI();
  
  if (!success) {
    console.log('\n📋 Trying direct insert approach...');
    success = await tryDirectInsert();
  }

  if (success) {
    console.log('\n🎉 SUCCESS! Database setup completed automatically!');
    console.log('🔗 Test: http://localhost:9999/dashboard/website-settings');
    console.log('💾 Save functionality should now work!');
  } else {
    console.log('\n❌ Automated setup failed');
    console.log('📋 Manual setup required:');
    console.log('1. Go to: https://supabase.com/dashboard/project/dfhqjdoydihajmjxniee');
    console.log('2. SQL Editor → New Query');
    console.log('3. Copy/paste from: EXECUTE_THIS_SQL.sql');
    console.log('4. Click Run');
  }
}

main().catch(console.error);