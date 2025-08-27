#!/usr/bin/env node

import 'dotenv/config';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function insertData() {

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

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Insert failed:', response.status, errorText);
      
      if (errorText.includes('relation "public.barbershops" does not exist')) {

      }
      
      return false;
    }

    const result = await response.json();

    return true;

  } catch (error) {
    console.error('💥 Error:', error.message);
    return false;
  }
}

async function testRead() {

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/barbershops?id=eq.550e8400-e29b-41d4-a716-446655440000&select=id,name,shop_slug,website_enabled`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': SUPABASE_SERVICE_ROLE_KEY
      }
    });

    if (!response.ok) {
      
      return false;
    }

    const data = await response.json();
    
    if (data.length > 0) {

      return true;
    } else {
      
      return false;
    }

  } catch (error) {
    console.error('💥 Read test error:', error.message);
    return false;
  }
}

async function main() {

  const canRead = await testRead();
  
  if (!canRead) {
    
    const insertSuccess = await insertData();
    
    if (insertSuccess) {
      
      const verifySuccess = await testRead();
      
      if (verifySuccess) {

      }
    }
  } else {

  }
}

main().catch(console.error);