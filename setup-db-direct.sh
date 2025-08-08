#!/bin/bash

# Create data directory if it doesn't exist
mkdir -p data

# Database file path
DB_PATH="data/agent_system.db"

echo "🚀 Setting up SQLite database at: $DB_PATH"

# Check if sqlite3 is available
if ! command -v sqlite3 &> /dev/null; then
    echo "❌ sqlite3 command not found. Please install SQLite3."
    echo "📋 On macOS: brew install sqlite3"
    echo "📋 On Ubuntu: sudo apt-get install sqlite3"
    exit 1
fi

# SQL to create tables and insert demo data
cat <<EOF | sqlite3 "$DB_PATH"
-- Users table (using existing schema)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  shop_name TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT 1
);

-- Barbershops table with all customization fields
CREATE TABLE IF NOT EXISTS barbershops (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT DEFAULT 'US',
  phone TEXT,
  email TEXT,
  website TEXT,
  owner_id INTEGER REFERENCES users(id),
  
  -- Customization fields
  tagline TEXT,
  logo_url TEXT,
  cover_image_url TEXT,
  hero_title TEXT,
  hero_subtitle TEXT,
  about_text TEXT,
  website_enabled INTEGER DEFAULT 1,
  shop_slug TEXT UNIQUE,
  custom_domain TEXT,
  custom_css TEXT,
  brand_colors TEXT DEFAULT '{"primary": "#3B82F6", "secondary": "#1E40AF", "accent": "#10B981", "text": "#1F2937", "background": "#FFFFFF"}',
  custom_fonts TEXT DEFAULT '{"heading": "Inter", "body": "Inter"}',
  theme_preset TEXT DEFAULT 'default',
  social_links TEXT DEFAULT '{}',
  seo_title TEXT,
  seo_description TEXT,
  seo_keywords TEXT,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Business hours table
CREATE TABLE IF NOT EXISTS business_hours (
  id TEXT PRIMARY KEY,
  barbershop_id TEXT REFERENCES barbershops(id),
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
  is_open INTEGER DEFAULT 1,
  open_time TEXT,
  close_time TEXT,
  break_start_time TEXT,
  break_end_time TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(barbershop_id, day_of_week)
);

-- Website sections table
CREATE TABLE IF NOT EXISTS website_sections (
  id TEXT PRIMARY KEY,
  barbershop_id TEXT REFERENCES barbershops(id),
  section_type TEXT NOT NULL,
  title TEXT,
  content TEXT,
  is_enabled INTEGER DEFAULT 1,
  display_order INTEGER DEFAULT 0,
  metadata TEXT DEFAULT '{}',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Team members table
CREATE TABLE IF NOT EXISTS team_members (
  id TEXT PRIMARY KEY,
  barbershop_id TEXT REFERENCES barbershops(id),
  name TEXT NOT NULL,
  title TEXT,
  bio TEXT,
  specialties TEXT,
  years_experience INTEGER,
  display_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Customer testimonials table
CREATE TABLE IF NOT EXISTS customer_testimonials (
  id TEXT PRIMARY KEY,
  barbershop_id TEXT REFERENCES barbershops(id),
  customer_name TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  testimonial_text TEXT NOT NULL,
  service_type TEXT,
  date_received DATE DEFAULT CURRENT_DATE,
  is_featured INTEGER DEFAULT 1,
  is_approved INTEGER DEFAULT 1,
  display_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert demo user (using existing schema)
INSERT OR REPLACE INTO users (email, password_hash, shop_name, created_at, is_active)
VALUES ('demo@barbershop.com', 'demo-password-hash', 'Elite Cuts Barbershop', datetime('now'), 1);

-- Insert demo barbershop
INSERT OR REPLACE INTO barbershops (
  id, name, description, tagline, address, city, state, zip_code, country,
  phone, email, website, owner_id,
  logo_url, cover_image_url, hero_title, hero_subtitle, about_text,
  website_enabled, shop_slug, custom_domain, custom_css,
  brand_colors, custom_fonts, theme_preset, social_links,
  seo_title, seo_description, seo_keywords,
  created_at, updated_at
) VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
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
  1,
  null,
  null,
  'Welcome to Elite Cuts Barbershop',
  'Experience professional barbering with master craftsmen',
  'Professional barbering services with attention to detail and customer satisfaction.',
  1,
  'elite-cuts-barbershop',
  null,
  null,
  '{"primary": "#3B82F6", "secondary": "#1E40AF", "accent": "#10B981", "text": "#1F2937", "background": "#FFFFFF"}',
  '{"heading": "Inter", "body": "Inter"}',
  'default',
  '{"instagram": "https://instagram.com/elitecuts", "facebook": "https://facebook.com/elitecuts", "twitter": "https://twitter.com/elitecuts", "google_business": "https://goo.gl/maps/example"}',
  'Elite Cuts Barbershop | Professional Haircuts in Downtown',
  'Experience premium barbering at Elite Cuts. Professional haircuts, modern fades, beard grooming & styling. Book online today!',
  'barbershop, haircuts, fade, beard trim, grooming, downtown',
  datetime('now'),
  datetime('now')
);

-- Insert business hours
INSERT OR REPLACE INTO business_hours (id, barbershop_id, day_of_week, is_open, open_time, close_time, break_start_time, break_end_time, notes)
VALUES 
  ('bh-0', '550e8400-e29b-41d4-a716-446655440000', 0, 0, null, null, null, null, 'Closed'),
  ('bh-1', '550e8400-e29b-41d4-a716-446655440000', 1, 1, '09:00', '19:00', '12:00', '13:00', null),
  ('bh-2', '550e8400-e29b-41d4-a716-446655440000', 2, 1, '09:00', '19:00', '12:00', '13:00', null),
  ('bh-3', '550e8400-e29b-41d4-a716-446655440000', 3, 1, '09:00', '19:00', '12:00', '13:00', null),
  ('bh-4', '550e8400-e29b-41d4-a716-446655440000', 4, 1, '09:00', '19:00', '12:00', '13:00', null),
  ('bh-5', '550e8400-e29b-41d4-a716-446655440000', 5, 1, '09:00', '19:00', '12:00', '13:00', null),
  ('bh-6', '550e8400-e29b-41d4-a716-446655440000', 6, 1, '10:00', '18:00', '12:00', '13:00', null);
EOF

# Verify the data was inserted
echo "✅ Database setup completed!"
echo "📊 Verifying barbershop data..."

sqlite3 "$DB_PATH" "SELECT id, name, shop_slug, website_enabled FROM barbershops WHERE id = '550e8400-e29b-41d4-a716-446655440000';"

echo "🎉 Demo barbershop created successfully!"
echo "🌐 You can now test the website settings at: http://localhost:9999/dashboard/website-settings"