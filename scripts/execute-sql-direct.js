#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import 'dotenv/config';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function executeSQL() {

  try {
    const createTableSQL = `
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
    `;

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
      owner_id: null,
      logo_url: null,
      cover_image_url: null,
      hero_title: 'Welcome to Elite Cuts Barbershop',
      hero_subtitle: 'Experience professional barbering with master craftsmen',
      about_text: 'Professional barbering services with attention to detail and customer satisfaction.',
      website_enabled: true,
      shop_slug: 'elite-cuts-barbershop',
      custom_domain: null,
      custom_css: null,
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
        facebook: 'https://facebook.com/elitecuts',
        twitter: 'https://twitter.com/elitecuts',
        google_business: 'https://goo.gl/maps/example'
      },
      seo_title: 'Elite Cuts Barbershop | Professional Haircuts in Downtown',
      seo_description: 'Experience premium barbering at Elite Cuts. Professional haircuts, modern fades, beard grooming & styling. Book online today!',
      seo_keywords: 'barbershop, haircuts, fade, beard trim, grooming, downtown',
      booking_enabled: true,
      online_booking_enabled: true
    };

    const { data, error } = await supabase
      .from('barbershops')
      .upsert(demoData, { onConflict: 'id' })
      .select();

    if (error) {
      if (error.message.includes('relation "public.barbershops" does not exist')) {

        return false;
      } else {
        console.error('❌ Database error:', error.message);
        return false;
      }
    }

    return true;

  } catch (error) {
    console.error('💥 Execution failed:', error.message);
    return false;
  }
}

async function verifySetup() {

  try {
    const { data, error } = await supabase
      .from('barbershops')
      .select('id, name, shop_slug, website_enabled, brand_colors, theme_preset')
      .eq('id', '550e8400-e29b-41d4-a716-446655440000');

    if (error) {
      console.error('❌ Verification failed:', error.message);
      return false;
    }

    if (data && data.length > 0) {
      const shop = data[0];

      return true;
    } else {
      
      return false;
    }

  } catch (error) {
    console.error('💥 Verification error:', error.message);
    return false;
  }
}

async function testSaveAPI() {

  try {
    const response = await fetch('http://localhost:9999/api/demo/simple-setup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();
    
    if (response.ok) {
      
      return true;
    } else {
      
      return false;
    }

  } catch (error) {
    
    return false;
  }
}

async function main() {

  const setupSuccess = await executeSQL();
  
  if (setupSuccess) {

    const verifySuccess = await verifySetup();
    
    if (verifySuccess) {
      
      await testSaveAPI();

    }
  }
}

main().catch(console.error);