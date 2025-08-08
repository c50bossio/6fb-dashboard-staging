#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🚀 Setting up Supabase database...');

// Create admin client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function insertDemoData() {
  console.log('📋 Inserting demo barbershop data...');
  
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
  
  const { data, error } = await supabase
    .from('barbershops')
    .upsert(demoData)
    .select();
  
  if (error) {
    console.error('❌ Insert failed:', error.message);
    return false;
  }
  
  console.log('✅ Demo data inserted:', data[0]?.name);
  return true;
}

async function main() {
  try {
    const success = await insertDemoData();
    if (success) {
      console.log('🎉 Setup complete! Test at: http://localhost:9999/dashboard/website-settings');
    }
  } catch (error) {
    console.error('💥 Error:', error.message);
  }
}

main();