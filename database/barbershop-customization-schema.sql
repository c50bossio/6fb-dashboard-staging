-- Barbershop Customization Schema
-- Adds website customization and branding capabilities to the existing barbershops table

-- First, add customization columns to the existing barbershops table
ALTER TABLE barbershops ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE barbershops ADD COLUMN IF NOT EXISTS cover_image_url TEXT;
ALTER TABLE barbershops ADD COLUMN IF NOT EXISTS brand_colors JSONB DEFAULT '{"primary": "#3B82F6", "secondary": "#1E40AF", "accent": "#10B981", "text": "#1F2937", "background": "#FFFFFF"}';
ALTER TABLE barbershops ADD COLUMN IF NOT EXISTS custom_css TEXT;
ALTER TABLE barbershops ADD COLUMN IF NOT EXISTS tagline TEXT;
ALTER TABLE barbershops ADD COLUMN IF NOT EXISTS hero_title TEXT;
ALTER TABLE barbershops ADD COLUMN IF NOT EXISTS hero_subtitle TEXT;
ALTER TABLE barbershops ADD COLUMN IF NOT EXISTS about_text TEXT;
ALTER TABLE barbershops ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}';
ALTER TABLE barbershops ADD COLUMN IF NOT EXISTS custom_domain VARCHAR(255);
ALTER TABLE barbershops ADD COLUMN IF NOT EXISTS shop_slug VARCHAR(100) UNIQUE;
ALTER TABLE barbershops ADD COLUMN IF NOT EXISTS theme_preset VARCHAR(50) DEFAULT 'default';
ALTER TABLE barbershops ADD COLUMN IF NOT EXISTS seo_title TEXT;
ALTER TABLE barbershops ADD COLUMN IF NOT EXISTS seo_description TEXT;
ALTER TABLE barbershops ADD COLUMN IF NOT EXISTS seo_keywords TEXT;
ALTER TABLE barbershops ADD COLUMN IF NOT EXISTS website_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE barbershops ADD COLUMN IF NOT EXISTS custom_fonts JSONB DEFAULT '{"heading": "Inter", "body": "Inter"}';

-- Website sections table for customizable content sections
CREATE TABLE IF NOT EXISTS website_sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  section_type VARCHAR(50) NOT NULL, -- 'hero', 'services', 'about', 'testimonials', 'gallery', 'contact'
  title TEXT,
  content JSONB NOT NULL DEFAULT '{}',
  is_enabled BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Custom pages for additional content (privacy, terms, blog posts, etc.)
CREATE TABLE IF NOT EXISTS custom_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  slug VARCHAR(100) NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  meta_title TEXT,
  meta_description TEXT,
  is_published BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(barbershop_id, slug)
);

-- Gallery management for barbershops
CREATE TABLE IF NOT EXISTS barbershop_gallery (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  caption TEXT,
  alt_text TEXT,
  category VARCHAR(50) DEFAULT 'general', -- 'before_after', 'shop', 'team', 'work', 'general'
  display_order INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Team member profiles for staff showcase
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Optional link to user account
  name VARCHAR(255) NOT NULL,
  title VARCHAR(255),
  bio TEXT,
  specialties TEXT[],
  profile_image_url TEXT,
  years_experience INTEGER,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customer testimonials for social proof
CREATE TABLE IF NOT EXISTS customer_testimonials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  customer_name VARCHAR(255) NOT NULL,
  customer_image_url TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  testimonial_text TEXT NOT NULL,
  service_type VARCHAR(100),
  date_received DATE DEFAULT CURRENT_DATE,
  is_featured BOOLEAN DEFAULT FALSE,
  is_approved BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Website theme templates
CREATE TABLE IF NOT EXISTS website_themes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(255) NOT NULL,
  description TEXT,
  preview_image_url TEXT,
  category VARCHAR(50), -- 'classic', 'modern', 'vintage', 'minimal', 'premium'
  color_scheme JSONB NOT NULL,
  layout_config JSONB NOT NULL DEFAULT '{}',
  css_template TEXT,
  is_premium BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Business hours in structured format (replaces existing business_hours JSONB)
CREATE TABLE IF NOT EXISTS business_hours (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0 = Sunday, 6 = Saturday
  is_open BOOLEAN DEFAULT TRUE,
  open_time TIME,
  close_time TIME,
  break_start_time TIME,
  break_end_time TIME,
  notes TEXT,
  
  UNIQUE(barbershop_id, day_of_week)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_website_sections_barbershop ON website_sections(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_website_sections_type ON website_sections(section_type);
CREATE INDEX IF NOT EXISTS idx_custom_pages_barbershop ON custom_pages(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_custom_pages_slug ON custom_pages(barbershop_id, slug);
CREATE INDEX IF NOT EXISTS idx_barbershop_gallery_shop ON barbershop_gallery(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_barbershop_gallery_category ON barbershop_gallery(category);
CREATE INDEX IF NOT EXISTS idx_team_members_barbershop ON team_members(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_testimonials_barbershop ON customer_testimonials(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_testimonials_approved ON customer_testimonials(is_approved);
CREATE INDEX IF NOT EXISTS idx_business_hours_barbershop ON business_hours(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_barbershops_slug ON barbershops(shop_slug);

-- Add unique constraint for shop_slug
CREATE UNIQUE INDEX IF NOT EXISTS idx_barbershops_slug_unique ON barbershops(shop_slug) WHERE shop_slug IS NOT NULL;

-- RLS (Row Level Security) policies for multi-tenant access
ALTER TABLE website_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE barbershop_gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_hours ENABLE ROW LEVEL SECURITY;

-- Policies for website_sections
CREATE POLICY "website_sections_policy" ON website_sections FOR ALL USING (true);

-- Policies for custom_pages
CREATE POLICY "custom_pages_policy" ON custom_pages FOR ALL USING (true);

-- Policies for barbershop_gallery
CREATE POLICY "barbershop_gallery_policy" ON barbershop_gallery FOR ALL USING (true);

-- Policies for team_members
CREATE POLICY "team_members_policy" ON team_members FOR ALL USING (true);

-- Policies for customer_testimonials
CREATE POLICY "customer_testimonials_policy" ON customer_testimonials FOR ALL USING (true);

-- Policies for business_hours
CREATE POLICY "business_hours_policy" ON business_hours FOR ALL USING (true);

-- Update triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_website_sections_updated_at BEFORE UPDATE ON website_sections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_custom_pages_updated_at BEFORE UPDATE ON custom_pages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_barbershop_gallery_updated_at BEFORE UPDATE ON barbershop_gallery FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_team_members_updated_at BEFORE UPDATE ON team_members FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customer_testimonials_updated_at BEFORE UPDATE ON customer_testimonials FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default theme templates
INSERT INTO website_themes (name, display_name, description, category, color_scheme, layout_config, is_premium) VALUES
('default', 'Default', 'Clean and professional default theme', 'modern', 
 '{"primary": "#3B82F6", "secondary": "#1E40AF", "accent": "#10B981", "text": "#1F2937", "background": "#FFFFFF"}', 
 '{"header_style": "classic", "section_order": ["hero", "services", "about", "testimonials", "contact"]}', false),
 
('classic', 'Classic Barbershop', 'Traditional barbershop styling with warm colors', 'classic',
 '{"primary": "#8B4513", "secondary": "#654321", "accent": "#DAA520", "text": "#2C1810", "background": "#FFF8DC"}',
 '{"header_style": "vintage", "section_order": ["hero", "about", "services", "team", "testimonials", "contact"]}', false),
 
('modern', 'Modern Minimal', 'Clean, minimalist design with bold typography', 'minimal',
 '{"primary": "#000000", "secondary": "#4A5568", "accent": "#ED8936", "text": "#2D3748", "background": "#FFFFFF"}',
 '{"header_style": "minimal", "section_order": ["hero", "services", "gallery", "contact"]}', false),
 
('premium', 'Premium Luxury', 'Elegant design for high-end barbershops', 'premium',
 '{"primary": "#1A202C", "secondary": "#2D3748", "accent": "#D69E2E", "text": "#1A202C", "background": "#F7FAFC"}',
 '{"header_style": "elegant", "section_order": ["hero", "services", "team", "gallery", "testimonials", "about", "contact"]}', true);

-- Insert default business hours (Monday-Saturday, 9AM-6PM)
-- This will be populated when a barbershop is created

-- Sample data for testing (optional - remove for production)
-- This creates a sample barbershop with customization data
DO $$
DECLARE
    sample_user_id UUID;
    sample_shop_id UUID;
BEGIN
    -- Create a sample user (shop owner)
    INSERT INTO users (email, name, role) 
    VALUES ('sample@barbershop.com', 'Sample Owner', 'SHOP_OWNER') 
    RETURNING id INTO sample_user_id;
    
    -- Create a sample barbershop with customization
    INSERT INTO barbershops (
        name, description, address, city, state, phone, email, owner_id,
        logo_url, tagline, hero_title, hero_subtitle, about_text, shop_slug,
        brand_colors, theme_preset, seo_title, seo_description
    ) VALUES (
        'Elite Cuts Barbershop',
        'Premium barbering services in downtown',
        '123 Main Street',
        'Downtown',
        'CA',
        '(555) 123-4567',
        'book@elitecuts.com',
        sample_user_id,
        '/uploads/logos/elite-cuts-logo.png',
        'Where Style Meets Precision',
        'Premium Cuts for the Modern Gentleman',
        'Experience the finest barbering services with our master craftsmen',
        'At Elite Cuts, we blend traditional barbering techniques with contemporary style to deliver an unparalleled grooming experience.',
        'elite-cuts',
        '{"primary": "#1A365D", "secondary": "#2C5282", "accent": "#D69E2E", "text": "#1A202C", "background": "#F7FAFC"}',
        'premium',
        'Elite Cuts Barbershop | Premium Grooming Services',
        'Experience premium barbering at Elite Cuts. Professional haircuts, beard grooming, and classic shaves in downtown.'
    ) RETURNING id INTO sample_shop_id;
    
    -- Insert default business hours
    INSERT INTO business_hours (barbershop_id, day_of_week, is_open, open_time, close_time) VALUES
    (sample_shop_id, 1, true, '09:00', '18:00'), -- Monday
    (sample_shop_id, 2, true, '09:00', '18:00'), -- Tuesday
    (sample_shop_id, 3, true, '09:00', '18:00'), -- Wednesday
    (sample_shop_id, 4, true, '09:00', '18:00'), -- Thursday
    (sample_shop_id, 5, true, '09:00', '19:00'), -- Friday
    (sample_shop_id, 6, true, '09:00', '17:00'), -- Saturday
    (sample_shop_id, 0, false, NULL, NULL);      -- Sunday (closed)
    
    -- Insert sample website sections
    INSERT INTO website_sections (barbershop_id, section_type, title, content, display_order) VALUES
    (sample_shop_id, 'hero', 'Hero Section', '{"title": "Premium Cuts for the Modern Gentleman", "subtitle": "Experience the finest barbering services with our master craftsmen", "cta_text": "Book Appointment", "background_image": "/uploads/hero/elite-cuts-hero.jpg"}', 1),
    (sample_shop_id, 'services', 'Our Services', '{"title": "Professional Services", "description": "From classic cuts to modern styles, we deliver excellence in every service"}', 2),
    (sample_shop_id, 'about', 'About Us', '{"title": "Our Story", "content": "At Elite Cuts, we blend traditional barbering techniques with contemporary style to deliver an unparalleled grooming experience."}', 3);
    
END $$;

-- Grant necessary permissions (adjust based on your RLS setup)
-- These policies allow full access for development - tighten for production
GRANT ALL ON website_sections TO authenticated;
GRANT ALL ON custom_pages TO authenticated;
GRANT ALL ON barbershop_gallery TO authenticated;
GRANT ALL ON team_members TO authenticated;
GRANT ALL ON customer_testimonials TO authenticated;
GRANT ALL ON business_hours TO authenticated;
GRANT ALL ON website_themes TO authenticated;

-- Comments for documentation
COMMENT ON TABLE website_sections IS 'Customizable content sections for barbershop websites';
COMMENT ON TABLE custom_pages IS 'Additional pages like privacy policy, terms of service, blog posts';
COMMENT ON TABLE barbershop_gallery IS 'Image gallery for showcasing work and shop environment';
COMMENT ON TABLE team_members IS 'Staff profiles and information';
COMMENT ON TABLE customer_testimonials IS 'Customer reviews and testimonials';
COMMENT ON TABLE business_hours IS 'Structured business hours with break times';
COMMENT ON TABLE website_themes IS 'Pre-built theme templates for barbershop websites';

-- Success message
SELECT 'Barbershop customization schema created successfully!' as message;