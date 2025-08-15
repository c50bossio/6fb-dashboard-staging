#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase configuration!');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

console.log('🚀 Fixing barbershop schema for calendar API...');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function addMissingColumns() {
  console.log('📋 Adding missing columns to barbershops table...');
  
  const columnsToAdd = [
    'logo_url TEXT',
    'cover_image_url TEXT', 
    'brand_colors JSONB DEFAULT \'{"primary": "#3B82F6", "secondary": "#1E40AF", "accent": "#10B981", "text": "#1F2937", "background": "#FFFFFF"}\'',
    'custom_css TEXT',
    'tagline TEXT',
    'hero_title TEXT',
    'hero_subtitle TEXT',
    'about_text TEXT',
    'social_links JSONB DEFAULT \'{}\'',
    'custom_domain TEXT',
    'shop_slug TEXT',
    'theme_preset TEXT DEFAULT \'default\'',
    'seo_title TEXT',
    'seo_description TEXT',
    'seo_keywords TEXT',
    'website_enabled BOOLEAN DEFAULT TRUE',
    'custom_fonts JSONB DEFAULT \'{"heading": "Inter", "body": "Inter"}\''
  ];
  
  for (const column of columnsToAdd) {
    try {
      console.log(`Adding column: ${column.split(' ')[0]}...`);
      
      const { data, error } = await supabase.rpc('exec', {
        sql: `ALTER TABLE barbershops ADD COLUMN IF NOT EXISTS ${column};`
      });
      
      if (error) {
        console.log(`⚠️ Column might already exist or different approach needed for: ${column.split(' ')[0]}`);
        console.log(`Error: ${error.message}`);
      } else {
        console.log(`✅ Successfully added: ${column.split(' ')[0]}`);
      }
    } catch (err) {
      console.log(`⚠️ Error adding column ${column.split(' ')[0]}:`, err.message);
    }
  }
}

async function createRelatedTables() {
  console.log('📋 Creating related tables...');
  
  const tables = [
    {
      name: 'business_hours',
      sql: `
        CREATE TABLE IF NOT EXISTS business_hours (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
          day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
          is_open BOOLEAN DEFAULT TRUE,
          open_time TIME,
          close_time TIME,
          break_start_time TIME,
          break_end_time TIME,
          notes TEXT,
          UNIQUE(barbershop_id, day_of_week)
        );
      `
    },
    {
      name: 'services',
      sql: `
        CREATE TABLE IF NOT EXISTS services (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          description TEXT,
          price DECIMAL(10,2) NOT NULL,
          duration INTEGER NOT NULL DEFAULT 30,
          category TEXT DEFAULT 'General',
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    },
    {
      name: 'team_members',
      sql: `
        CREATE TABLE IF NOT EXISTS team_members (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
          user_id UUID REFERENCES users(id) ON DELETE SET NULL,
          name TEXT NOT NULL,
          title TEXT,
          bio TEXT,
          specialties TEXT[],
          profile_image_url TEXT,
          years_experience INTEGER,
          display_order INTEGER DEFAULT 0,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    },
    {
      name: 'customer_testimonials', 
      sql: `
        CREATE TABLE IF NOT EXISTS customer_testimonials (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
          customer_name TEXT NOT NULL,
          customer_image_url TEXT,
          rating INTEGER CHECK (rating >= 1 AND rating <= 5),
          testimonial_text TEXT NOT NULL,
          service_type TEXT,
          date_received DATE DEFAULT CURRENT_DATE,
          is_featured BOOLEAN DEFAULT FALSE,
          is_approved BOOLEAN DEFAULT FALSE,
          display_order INTEGER DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    },
    {
      name: 'website_sections',
      sql: `
        CREATE TABLE IF NOT EXISTS website_sections (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
          section_type TEXT NOT NULL,
          title TEXT,
          content JSONB NOT NULL DEFAULT '{}',
          is_enabled BOOLEAN DEFAULT TRUE,
          display_order INTEGER DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    },
    {
      name: 'barbershop_gallery',
      sql: `
        CREATE TABLE IF NOT EXISTS barbershop_gallery (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
          image_url TEXT NOT NULL,
          thumbnail_url TEXT,
          caption TEXT,
          alt_text TEXT,
          category TEXT DEFAULT 'general',
          display_order INTEGER DEFAULT 0,
          is_featured BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    }
  ];
  
  for (const table of tables) {
    try {
      console.log(`Creating table: ${table.name}...`);
      
      const { data, error } = await supabase.rpc('exec', {
        sql: table.sql
      });
      
      if (error) {
        console.log(`⚠️ Error creating table ${table.name}:`, error.message);
      } else {
        console.log(`✅ Successfully created table: ${table.name}`);
      }
    } catch (err) {
      console.log(`⚠️ Error creating table ${table.name}:`, err.message);
    }
  }
}

async function testConnection() {
  console.log('🔍 Testing Supabase connection...');
  
  try {
    const { data, error } = await supabase
      .from('barbershops')
      .select('id, name')
      .limit(1);
    
    if (error) {
      console.error('❌ Connection test failed:', error.message);
      return false;
    }
    
    console.log('✅ Supabase connection successful');
    console.log('📊 Found barbershops:', data?.length || 0);
    return true;
  } catch (err) {
    console.error('❌ Connection error:', err.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting barbershop schema fix...\n');
  
  const connected = await testConnection();
  if (!connected) {
    console.error('❌ Cannot connect to database. Exiting...');
    process.exit(1);
  }
  
  await addMissingColumns();
  
  await createRelatedTables();
  
  console.log('\n🔍 Testing fixed schema...');
  try {
    const { data, error } = await supabase
      .from('barbershops')
      .select('id, name, shop_slug, brand_colors, website_enabled')
      .limit(1);
    
    if (error) {
      console.error('❌ Schema test failed:', error.message);
    } else {
      console.log('✅ Schema test passed');
      if (data && data.length > 0) {
        const shop = data[0];
        console.log('📋 Sample barbershop:', {
          id: shop.id,
          name: shop.name,
          shop_slug: shop.shop_slug,
          has_brand_colors: !!shop.brand_colors,
          website_enabled: shop.website_enabled
        });
      }
    }
  } catch (err) {
    console.error('❌ Schema test error:', err.message);
  }
  
  console.log('\n🎉 Schema fix completed!');
  console.log('✅ Calendar API endpoints should now work properly');
  console.log('🔗 Test the calendar at: http://localhost:9999/dashboard/calendar');
}

main().catch(console.error);