#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase configuration!');
  process.exit(1);
}

console.log('🚀 Creating demo barbershop for calendar API...');

// Create Supabase client with service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createDemoBarbershop() {
  try {
    // Check if demo barbershop already exists
    const { data: existing } = await supabase
      .from('barbershops')
      .select('id, name, shop_slug')
      .eq('shop_slug', 'demo-barbershop')
      .maybeSingle();

    if (existing) {
      console.log('✅ Demo barbershop already exists:', existing.name);
      console.log('📋 ID:', existing.id);
      return existing.id;
    }

    console.log('📋 Creating new demo barbershop...');

    // Create demo user first (owner of the barbershop) 
    let ownerId;
    try {
      const { data: user, error: userError } = await supabase
        .from('users')
        .insert({
          email: 'demo@barbershop.com',
          name: 'Demo Shop Owner',
          role: 'SHOP_OWNER'
        })
        .select()
        .single();

      if (userError && userError.code !== '23505') { // Not a duplicate key error
        console.error('Error creating demo user:', userError);
      }
      
      ownerId = user?.id;
    } catch (err) {
      console.log('⚠️ User might already exist, continuing...');
      // Get existing user
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', 'demo@barbershop.com')
        .single();
      
      ownerId = existingUser?.id;
    }

    // Create demo barbershop with all required fields
    const barbershopData = {
      name: 'Demo Barbershop',
      tagline: 'Premium Cuts, Professional Service, Demo Experience',
      description: 'Experience our demo barbershop with premium services and professional barbers.',
      phone: '(555) 123-4567',
      email: 'demo@barbershop.com',
      address: '123 Demo Street',
      city: 'Demo City',
      state: 'CA',
      owner_id: ownerId,
      shop_slug: 'demo-barbershop',
      website_enabled: true,
      booking_enabled: true,
      online_booking_enabled: true,
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
      hero_title: 'Welcome to Demo Barbershop',
      hero_subtitle: 'Premium Cuts, Professional Service, Demo Experience',
      about_text: 'This is a demo barbershop showcasing our booking system capabilities.',
      social_links: {
        instagram: 'https://instagram.com/demo-barbershop',
        facebook: 'https://facebook.com/demo-barbershop',
        google: 'https://g.page/demo-barbershop'
      },
      seo_title: 'Demo Barbershop | Professional Haircuts & Grooming',
      seo_description: 'Experience premium barbering at Demo Barbershop. Professional haircuts and grooming services. Book online today!',
      seo_keywords: 'barbershop, haircuts, demo, professional barber, grooming',
      avg_rating: 4.8,
      total_clients: 150,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: barbershop, error: shopError } = await supabase
      .from('barbershops')
      .insert(barbershopData)
      .select()
      .single();

    if (shopError) {
      console.error('❌ Error creating demo barbershop:', shopError);
      return null;
    }

    console.log('✅ Demo barbershop created successfully!');
    console.log('📋 ID:', barbershop.id);
    console.log('📋 Name:', barbershop.name);
    console.log('📋 Slug:', barbershop.shop_slug);

    // Create demo business hours
    const businessHours = [
      { day_of_week: 1, is_open: true, open_time: '09:00', close_time: '18:00' }, // Monday
      { day_of_week: 2, is_open: true, open_time: '09:00', close_time: '18:00' }, // Tuesday
      { day_of_week: 3, is_open: true, open_time: '09:00', close_time: '18:00' }, // Wednesday
      { day_of_week: 4, is_open: true, open_time: '09:00', close_time: '18:00' }, // Thursday
      { day_of_week: 5, is_open: true, open_time: '09:00', close_time: '19:00' }, // Friday
      { day_of_week: 6, is_open: true, open_time: '09:00', close_time: '17:00' }, // Saturday
      { day_of_week: 0, is_open: false, open_time: null, close_time: null }       // Sunday
    ];

    const hoursToInsert = businessHours.map(hour => ({
      barbershop_id: barbershop.id,
      ...hour
    }));

    const { error: hoursError } = await supabase
      .from('business_hours')
      .insert(hoursToInsert);

    if (hoursError) {
      console.log('⚠️ Warning: Could not create business hours:', hoursError.message);
    } else {
      console.log('✅ Business hours created');
    }

    // Create demo services
    const services = [
      {
        barbershop_id: barbershop.id,
        name: 'Classic Haircut',
        description: 'Professional precision cut with wash and style',
        price: 35.00,
        duration: 30,
        is_active: true,
        category: 'Haircut',
        created_at: new Date().toISOString()
      },
      {
        barbershop_id: barbershop.id,
        name: 'Modern Fade',
        description: 'Contemporary fade with seamless blending',
        price: 45.00,
        duration: 45,
        is_active: true,
        category: 'Haircut',
        created_at: new Date().toISOString()
      },
      {
        barbershop_id: barbershop.id,
        name: 'Beard Trim',
        description: 'Expert beard grooming and styling',
        price: 25.00,
        duration: 20,
        is_active: true,
        category: 'Grooming',
        created_at: new Date().toISOString()
      }
    ];

    const { error: servicesError } = await supabase
      .from('services')
      .insert(services);

    if (servicesError) {
      console.log('⚠️ Warning: Could not create services:', servicesError.message);
    } else {
      console.log('✅ Demo services created');
    }

    return barbershop.id;

  } catch (error) {
    console.error('💥 Failed to create demo barbershop:', error);
    return null;
  }
}

async function main() {
  console.log('🚀 Starting demo barbershop creation...\n');
  
  const barbershopId = await createDemoBarbershop();
  
  if (barbershopId) {
    console.log('\n🎉 Demo barbershop setup completed!');
    console.log('✅ Calendar API endpoints should now work');
    console.log('📋 Barbershop ID:', barbershopId);
    console.log('📋 Slug: demo-barbershop');
    console.log('\n🔗 Test URLs:');
    console.log('- Calendar: http://localhost:9999/dashboard/calendar');
    console.log('- API Demo Setup: http://localhost:9999/api/demo/setup');
    console.log(`- API Customization: http://localhost:9999/api/customization/${barbershopId}/settings`);
  } else {
    console.log('\n❌ Failed to create demo barbershop');
    console.log('Please check the logs above for details');
  }
}

main().catch(console.error);