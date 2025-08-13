-- Website Customization Hierarchy Schema
-- Supports enterprise > barbershop > barber website hierarchy

-- ==========================================
-- ENTERPRISE WEBSITES
-- ==========================================

-- Enterprise-level website customization
CREATE TABLE IF NOT EXISTS enterprise_websites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Domain & URL Configuration
  custom_domain VARCHAR(255),
  subdomain VARCHAR(100), -- e.g., 'elite' for elite.6fb.com
  slug VARCHAR(100) UNIQUE, -- URL path identifier
  
  -- Branding
  name VARCHAR(255) NOT NULL,
  tagline VARCHAR(255),
  description TEXT,
  logo_url TEXT,
  favicon_url TEXT,
  cover_image_url TEXT,
  
  -- Color Scheme
  primary_color VARCHAR(7) DEFAULT '#3B82F6',
  secondary_color VARCHAR(7) DEFAULT '#1E40AF',
  accent_color VARCHAR(7) DEFAULT '#10B981',
  text_color VARCHAR(7) DEFAULT '#1F2937',
  background_color VARCHAR(7) DEFAULT '#FFFFFF',
  
  -- Typography
  heading_font VARCHAR(100) DEFAULT 'Inter',
  body_font VARCHAR(100) DEFAULT 'Inter',
  
  -- Content
  hero_title TEXT,
  hero_subtitle TEXT,
  about_content TEXT,
  mission_statement TEXT,
  
  -- Features & Settings
  show_location_map BOOLEAN DEFAULT true,
  show_location_directory BOOLEAN DEFAULT true,
  enable_online_booking BOOLEAN DEFAULT true,
  enable_shop_comparison BOOLEAN DEFAULT false,
  
  -- Social Media
  instagram_url TEXT,
  facebook_url TEXT,
  twitter_url TEXT,
  youtube_url TEXT,
  tiktok_url TEXT,
  
  -- SEO
  seo_title VARCHAR(255),
  seo_description TEXT,
  seo_keywords TEXT,
  google_analytics_id VARCHAR(50),
  
  -- Status
  is_published BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- BARBERSHOP WEBSITES
-- ==========================================

-- Individual barbershop website customization
CREATE TABLE IF NOT EXISTS barbershop_websites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  enterprise_website_id UUID REFERENCES enterprise_websites(id) ON DELETE SET NULL,
  
  -- URL Configuration
  custom_domain VARCHAR(255),
  subdomain VARCHAR(100),
  slug VARCHAR(100) UNIQUE, -- URL path like 'downtown-cuts'
  
  -- Branding (can override enterprise branding)
  name VARCHAR(255) NOT NULL,
  tagline VARCHAR(255),
  description TEXT,
  logo_url TEXT,
  favicon_url TEXT,
  cover_image_url TEXT,
  
  -- Color Scheme (inherits from enterprise if not set)
  primary_color VARCHAR(7),
  secondary_color VARCHAR(7),
  accent_color VARCHAR(7),
  text_color VARCHAR(7),
  background_color VARCHAR(7),
  inherit_enterprise_branding BOOLEAN DEFAULT true,
  
  -- Typography
  heading_font VARCHAR(100),
  body_font VARCHAR(100),
  
  -- Homepage Content
  hero_title TEXT,
  hero_subtitle TEXT,
  hero_cta_text VARCHAR(100) DEFAULT 'Book Now',
  hero_cta_url TEXT,
  
  -- About Section
  about_title VARCHAR(255) DEFAULT 'About Us',
  about_content TEXT,
  founding_year INTEGER,
  
  -- Services Section
  services_title VARCHAR(255) DEFAULT 'Our Services',
  services_description TEXT,
  featured_services UUID[], -- Array of service IDs to feature
  
  -- Team Section
  team_title VARCHAR(255) DEFAULT 'Meet Our Barbers',
  team_description TEXT,
  show_barber_pages BOOLEAN DEFAULT true,
  barber_page_template VARCHAR(50) DEFAULT 'card', -- 'card', 'profile', 'minimal'
  
  -- Gallery
  gallery_title VARCHAR(255) DEFAULT 'Our Work',
  gallery_images JSONB DEFAULT '[]', -- Array of {url, caption, barber_id}
  
  -- Testimonials
  testimonials_title VARCHAR(255) DEFAULT 'What Our Clients Say',
  show_google_reviews BOOLEAN DEFAULT true,
  featured_testimonials JSONB DEFAULT '[]',
  
  -- Contact Section
  contact_title VARCHAR(255) DEFAULT 'Contact Us',
  contact_description TEXT,
  show_contact_form BOOLEAN DEFAULT true,
  contact_email VARCHAR(255),
  
  -- Business Info
  phone VARCHAR(20),
  email VARCHAR(255),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(50),
  zip_code VARCHAR(10),
  
  -- Business Hours (JSON format)
  business_hours JSONB DEFAULT '{
    "monday": {"open": "09:00", "close": "18:00"},
    "tuesday": {"open": "09:00", "close": "18:00"},
    "wednesday": {"open": "09:00", "close": "18:00"},
    "thursday": {"open": "09:00", "close": "18:00"},
    "friday": {"open": "09:00", "close": "18:00"},
    "saturday": {"open": "09:00", "close": "16:00"},
    "sunday": {"closed": true}
  }',
  
  -- Social Media
  instagram_url TEXT,
  facebook_url TEXT,
  twitter_url TEXT,
  youtube_url TEXT,
  tiktok_url TEXT,
  google_business_url TEXT,
  
  -- Booking Settings
  enable_online_booking BOOLEAN DEFAULT true,
  booking_widget_position VARCHAR(20) DEFAULT 'bottom-right', -- 'bottom-right', 'bottom-left', 'top-banner'
  booking_rules TEXT,
  require_deposit BOOLEAN DEFAULT false,
  deposit_amount DECIMAL(8,2),
  cancellation_policy TEXT,
  
  -- SEO
  seo_title VARCHAR(255),
  seo_description TEXT,
  seo_keywords TEXT,
  google_analytics_id VARCHAR(50),
  facebook_pixel_id VARCHAR(50),
  
  -- Theme & Layout
  theme_template VARCHAR(50) DEFAULT 'modern', -- 'modern', 'classic', 'minimal', 'bold'
  layout_style VARCHAR(50) DEFAULT 'single-page', -- 'single-page', 'multi-page'
  
  -- Features
  show_pricing BOOLEAN DEFAULT true,
  show_portfolio BOOLEAN DEFAULT true,
  show_team BOOLEAN DEFAULT true,
  show_testimonials BOOLEAN DEFAULT true,
  enable_blog BOOLEAN DEFAULT false,
  enable_shop BOOLEAN DEFAULT false,
  
  -- Status
  is_published BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  maintenance_mode BOOLEAN DEFAULT false,
  maintenance_message TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- BARBER PAGE CUSTOMIZATION
-- ==========================================

-- Enhanced barber customization for individual pages
CREATE TABLE IF NOT EXISTS barber_page_customization (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  barbershop_website_id UUID REFERENCES barbershop_websites(id) ON DELETE CASCADE,
  
  -- URL & SEO
  slug VARCHAR(100), -- 'john-doe' for /shop/barbers/john-doe
  page_title VARCHAR(200),
  meta_description TEXT,
  
  -- Override shop branding (if allowed)
  can_override_branding BOOLEAN DEFAULT false,
  custom_primary_color VARCHAR(7),
  custom_accent_color VARCHAR(7),
  
  -- Hero Section
  hero_image_url TEXT,
  hero_title VARCHAR(255),
  hero_subtitle TEXT,
  show_booking_button BOOLEAN DEFAULT true,
  
  -- Professional Info Display
  display_name VARCHAR(255),
  title VARCHAR(100), -- 'Master Barber', 'Senior Stylist'
  bio TEXT,
  years_experience INTEGER,
  
  -- Specialties & Skills
  specialties TEXT[],
  certifications TEXT[],
  languages_spoken TEXT[],
  awards JSONB DEFAULT '[]', -- Array of {title, year, description}
  
  -- Portfolio Settings
  show_portfolio BOOLEAN DEFAULT true,
  portfolio_layout VARCHAR(20) DEFAULT 'grid', -- 'grid', 'carousel', 'masonry'
  portfolio_images JSONB DEFAULT '[]',
  before_after_images JSONB DEFAULT '[]',
  
  -- Services Display
  show_services BOOLEAN DEFAULT true,
  featured_services UUID[], -- Service IDs to highlight
  service_display_style VARCHAR(20) DEFAULT 'list', -- 'list', 'cards', 'table'
  
  -- Availability Display
  show_availability BOOLEAN DEFAULT true,
  availability_display_type VARCHAR(20) DEFAULT 'calendar', -- 'calendar', 'next-available', 'weekly'
  
  -- Social & Contact
  show_contact_info BOOLEAN DEFAULT false,
  personal_phone VARCHAR(20),
  personal_email VARCHAR(255),
  instagram_handle VARCHAR(100),
  tiktok_handle VARCHAR(100),
  youtube_url TEXT,
  
  -- Reviews & Testimonials
  show_reviews BOOLEAN DEFAULT true,
  featured_reviews JSONB DEFAULT '[]',
  
  -- Custom Sections
  custom_sections JSONB DEFAULT '[]', -- Array of {title, content, order}
  
  -- Shop Owner Controls
  page_approved BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  approval_notes TEXT,
  
  -- Status
  is_published BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, barbershop_id)
);

-- ==========================================
-- WEBSITE SECTIONS & COMPONENTS
-- ==========================================

-- Reusable sections for websites
CREATE TABLE IF NOT EXISTS website_sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  website_id UUID, -- Can reference either enterprise or barbershop website
  website_type VARCHAR(20) CHECK (website_type IN ('enterprise', 'barbershop', 'barber')),
  
  -- Section Details
  section_type VARCHAR(50) NOT NULL, -- 'hero', 'services', 'team', 'gallery', 'testimonials', 'cta', 'custom'
  section_name VARCHAR(255),
  section_order INTEGER DEFAULT 0,
  
  -- Content
  title VARCHAR(255),
  subtitle TEXT,
  content TEXT,
  
  -- Configuration
  settings JSONB DEFAULT '{}', -- Section-specific settings
  styles JSONB DEFAULT '{}', -- Custom CSS overrides
  
  -- Media
  background_image_url TEXT,
  video_url TEXT,
  
  -- Status
  is_visible BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- WEBSITE ANALYTICS
-- ==========================================

-- Track website performance
CREATE TABLE IF NOT EXISTS website_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  website_id UUID,
  website_type VARCHAR(20) CHECK (website_type IN ('enterprise', 'barbershop', 'barber')),
  
  -- Metrics
  page_views INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,
  booking_conversions INTEGER DEFAULT 0,
  bounce_rate DECIMAL(5,4) DEFAULT 0,
  avg_session_duration INTEGER DEFAULT 0, -- in seconds
  
  -- Source tracking
  traffic_sources JSONB DEFAULT '{}', -- {direct: 100, organic: 50, social: 25}
  
  -- Date
  metric_date DATE NOT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(website_id, website_type, metric_date)
);

-- ==========================================
-- INDEXES
-- ==========================================

-- Enterprise websites
CREATE INDEX idx_enterprise_websites_org ON enterprise_websites(organization_id);
CREATE INDEX idx_enterprise_websites_slug ON enterprise_websites(slug);
CREATE INDEX idx_enterprise_websites_published ON enterprise_websites(is_published);

-- Barbershop websites
CREATE INDEX idx_barbershop_websites_shop ON barbershop_websites(barbershop_id);
CREATE INDEX idx_barbershop_websites_enterprise ON barbershop_websites(enterprise_website_id);
CREATE INDEX idx_barbershop_websites_slug ON barbershop_websites(slug);
CREATE INDEX idx_barbershop_websites_published ON barbershop_websites(is_published);

-- Barber pages
CREATE INDEX idx_barber_pages_user ON barber_page_customization(user_id);
CREATE INDEX idx_barber_pages_shop ON barber_page_customization(barbershop_id);
CREATE INDEX idx_barber_pages_website ON barber_page_customization(barbershop_website_id);
CREATE INDEX idx_barber_pages_approved ON barber_page_customization(page_approved);

-- Website sections
CREATE INDEX idx_website_sections_website ON website_sections(website_id, website_type);
CREATE INDEX idx_website_sections_order ON website_sections(section_order);

-- Analytics
CREATE INDEX idx_website_analytics_website ON website_analytics(website_id, website_type);
CREATE INDEX idx_website_analytics_date ON website_analytics(metric_date);