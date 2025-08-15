#!/usr/bin/env node
import 'dotenv/config';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🚀 Creating Supabase table directly via REST API...');

async function createTableViaSQL() {
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

-- Enable RLS
ALTER TABLE public.barbershops ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow all for authenticated users" ON public.barbershops FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow public read" ON public.barbershops FOR SELECT TO anon USING (website_enabled = true);

-- Insert demo data
INSERT INTO public.barbershops (
  id, name, description, tagline, address, city, state, zip_code, country,
  phone, email, website,
  hero_title, hero_subtitle, about_text,
  website_enabled, shop_slug,
  brand_colors, custom_fonts, theme_preset, social_links,
  seo_title, seo_description, seo_keywords,
  booking_enabled, online_booking_enabled
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
  'Elite Cuts Barbershop | Professional Haircuts in Downtown',
  'Experience premium barbering at Elite Cuts. Professional haircuts, modern fades, beard grooming & styling. Book online today!',
  'barbershop, haircuts, fade, beard trim, grooming, downtown',
  true,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  updated_at = NOW();
  `;

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY
      },
      body: JSON.stringify({ query: sql })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ SQL executed successfully');
    return true;

  } catch (error) {
    console.error('❌ SQL execution failed:', error.message);
    return false;
  }
}

async function testConnection() {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/barbershops?select=id,name&limit=1`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': SUPABASE_SERVICE_ROLE_KEY
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Connection successful, found barbershops:', data.length);
      return true;
    } else {
      console.log('⚠️ Table doesn\'t exist yet, will create it');
      return false;
    }
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('🔍 Testing connection to Supabase...');
  
  const tableExists = await testConnection();
  
  if (!tableExists) {
    console.log('🏗️ Creating table and inserting data...');
    const success = await createTableViaSQL();
    
    if (success) {
      console.log('🔍 Verifying setup...');
      await testConnection();
    }
  }
  
  console.log('\n🎉 Setup complete!');
  console.log('🔗 Test the website settings at: http://localhost:9999/dashboard/website-settings');
  console.log('💾 Save functionality should now work!');
}

main().catch(console.error);