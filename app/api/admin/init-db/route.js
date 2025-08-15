import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
export const runtime = 'edge'

export async function POST(request) {
  try {
    const supabase = createClient()

    const alterTableQueries = [
      'ALTER TABLE barbershops ADD COLUMN IF NOT EXISTS logo_url TEXT',
      'ALTER TABLE barbershops ADD COLUMN IF NOT EXISTS cover_image_url TEXT',
      'ALTER TABLE barbershops ADD COLUMN IF NOT EXISTS brand_colors JSONB DEFAULT \'{"primary": "#3B82F6", "secondary": "#1E40AF", "accent": "#10B981", "text": "#1F2937", "background": "#FFFFFF"}\' ',
      'ALTER TABLE barbershops ADD COLUMN IF NOT EXISTS custom_css TEXT',
      'ALTER TABLE barbershops ADD COLUMN IF NOT EXISTS tagline TEXT',
      'ALTER TABLE barbershops ADD COLUMN IF NOT EXISTS hero_title TEXT',
      'ALTER TABLE barbershops ADD COLUMN IF NOT EXISTS hero_subtitle TEXT',
      'ALTER TABLE barbershops ADD COLUMN IF NOT EXISTS about_text TEXT',
      'ALTER TABLE barbershops ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT \'{}\'',
      'ALTER TABLE barbershops ADD COLUMN IF NOT EXISTS custom_domain VARCHAR(255)',
      'ALTER TABLE barbershops ADD COLUMN IF NOT EXISTS shop_slug VARCHAR(100)',
      'ALTER TABLE barbershops ADD COLUMN IF NOT EXISTS theme_preset VARCHAR(50) DEFAULT \'default\'',
      'ALTER TABLE barbershops ADD COLUMN IF NOT EXISTS seo_title TEXT',
      'ALTER TABLE barbershops ADD COLUMN IF NOT EXISTS seo_description TEXT',
      'ALTER TABLE barbershops ADD COLUMN IF NOT EXISTS seo_keywords TEXT',
      'ALTER TABLE barbershops ADD COLUMN IF NOT EXISTS website_enabled BOOLEAN DEFAULT TRUE',
      'ALTER TABLE barbershops ADD COLUMN IF NOT EXISTS custom_fonts JSONB DEFAULT \'{"heading": "Inter", "body": "Inter"}\'',
    ]

    console.log('Applying customization schema to barbershops table...')
    
    for (const query of alterTableQueries) {
      const { error } = await supabase.rpc('exec_sql', { sql: query })
      if (error && !error.message.includes('already exists')) {
        console.error('Error executing query:', query, error)
      }
    }

    const createTableQueries = [
      `CREATE TABLE IF NOT EXISTS business_hours (
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
      )`,
      
      `CREATE TABLE IF NOT EXISTS team_members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        title VARCHAR(255),
        bio TEXT,
        specialties TEXT,
        years_experience INTEGER,
        display_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,
      
      `CREATE TABLE IF NOT EXISTS customer_testimonials (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
        customer_name VARCHAR(255) NOT NULL,
        rating INTEGER CHECK (rating >= 1 AND rating <= 5),
        testimonial_text TEXT NOT NULL,
        service_type VARCHAR(100),
        date_received DATE DEFAULT CURRENT_DATE,
        is_featured BOOLEAN DEFAULT TRUE,
        is_approved BOOLEAN DEFAULT TRUE,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`
    ]

    for (const query of createTableQueries) {
      const { error } = await supabase.rpc('exec_sql', { sql: query })
      if (error && !error.message.includes('already exists')) {
        console.error('Error creating table:', error)
      }
    }

    console.log('Database initialization completed!')

    return NextResponse.json({
      success: true,
      message: 'Database initialized successfully with customization schema'
    })

  } catch (error) {
    console.error('Error in POST /api/admin/init-db:', error)
    return NextResponse.json(
      { error: 'Failed to initialize database: ' + error.message },
      { status: 500 }
    )
  }
}