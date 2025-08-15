#!/usr/bin/env node

import { config } from 'dotenv';

config({ path: '.env.local' });

const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const PROJECT_ID = 'dfhqjdoydihajmjxniee';

console.log('🚀 Final attempt with fresh environment...');
console.log('🔑 Access Token:', SUPABASE_ACCESS_TOKEN ? `${SUPABASE_ACCESS_TOKEN.substring(0, 10)}...` : 'MISSING');

if (!SUPABASE_ACCESS_TOKEN) {
  console.error('❌ SUPABASE_ACCESS_TOKEN not found in environment');
  process.exit(1);
}

async function executeSQL() {
  const sql = `
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

ALTER TABLE public.barbershops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users" ON public.barbershops FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow public read" ON public.barbershops FOR SELECT TO anon USING (website_enabled = true);

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

  console.log('📋 Executing SQL via Management API...');

  try {
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

    console.log('📊 Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ Error response:', errorText);
      return false;
    }

    const result = await response.json();
    console.log('✅ SQL executed successfully!');
    console.log('📋 Result:', result);
    return true;

  } catch (error) {
    console.error('💥 Request error:', error.message);
    return false;
  }
}

async function verifyDatabase() {
  console.log('🔍 Verifying database setup...');
  
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/barbershops?id=eq.550e8400-e29b-41d4-a716-446655440000&select=id,name,shop_slug`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': SUPABASE_SERVICE_ROLE_KEY
      }
    });

    if (response.ok) {
      const data = await response.json();
      if (data.length > 0) {
        console.log('✅ Verification successful!');
        console.log('🏪 Found barbershop:', data[0].name);
        return true;
      }
    }

    console.log('⚠️ Verification failed - no data found');
    return false;

  } catch (error) {
    console.error('💥 Verification error:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting final automated setup attempt...\n');

  const sqlSuccess = await executeSQL();

  if (sqlSuccess) {
    console.log('\n🔍 Verifying the setup...');
    const verifySuccess = await verifyDatabase();

    if (verifySuccess) {
      console.log('\n🎉 SUCCESS! Database is ready!');
      console.log('🔗 Test at: http://localhost:9999/dashboard/website-settings');
      console.log('💾 Save functionality should work now!');
      
      console.log('\n🎯 Next steps:');
      console.log('1. Go to website settings');
      console.log('2. Make a change');
      console.log('3. Click "Save Changes"');
      console.log('4. You should see "Settings saved successfully!"');
    } else {
      console.log('\n⚠️ Setup completed but verification failed');
      console.log('The table was created but may need a moment to be available');
    }
  } else {
    console.log('\n❌ Automated setup failed');
    console.log('📋 Please run the SQL manually in Supabase dashboard');
  }
}

main().catch(console.error);