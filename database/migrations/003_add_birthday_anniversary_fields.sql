-- Migration: Add birthday and anniversary fields to customers table
-- Version: 003
-- Created: 2025-08-21

BEGIN;

-- Add birthday and anniversary fields to customers table
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS birthday DATE,
ADD COLUMN IF NOT EXISTS anniversary_date DATE, -- First visit anniversary
ADD COLUMN IF NOT EXISTS birthday_reminders_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS anniversary_reminders_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS last_birthday_campaign_sent DATE,
ADD COLUMN IF NOT EXISTS last_anniversary_campaign_sent DATE;

-- Create indexes for efficient birthday/anniversary queries
CREATE INDEX IF NOT EXISTS idx_customers_birthday ON customers(barbershop_id, birthday) WHERE birthday IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_anniversary ON customers(barbershop_id, anniversary_date) WHERE anniversary_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_birthday_reminders ON customers(barbershop_id, birthday_reminders_enabled, birthday) WHERE birthday_reminders_enabled = TRUE;
CREATE INDEX IF NOT EXISTS idx_customers_anniversary_reminders ON customers(barbershop_id, anniversary_reminders_enabled, anniversary_date) WHERE anniversary_reminders_enabled = TRUE;

-- Create birthday_campaigns table to track birthday marketing campaigns
CREATE TABLE IF NOT EXISTS birthday_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbershop_id VARCHAR(255) NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  
  -- Campaign details
  campaign_type VARCHAR(50) NOT NULL CHECK (campaign_type IN ('birthday', 'anniversary')),
  message_type VARCHAR(20) NOT NULL CHECK (message_type IN ('sms', 'email', 'both')),
  message_content TEXT NOT NULL,
  discount_percentage INTEGER DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  
  -- Scheduling and delivery
  scheduled_for DATE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  delivery_status VARCHAR(20) DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'failed', 'cancelled')),
  
  -- Campaign effectiveness tracking
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  redeemed_at TIMESTAMP WITH TIME ZONE,
  booking_made BOOLEAN DEFAULT FALSE,
  booking_id UUID, -- Reference to appointments table
  
  -- Response tracking
  sms_response_received BOOLEAN DEFAULT FALSE,
  sms_response_content TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for birthday_campaigns
CREATE INDEX IF NOT EXISTS idx_birthday_campaigns_barbershop ON birthday_campaigns(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_birthday_campaigns_customer ON birthday_campaigns(customer_id);
CREATE INDEX IF NOT EXISTS idx_birthday_campaigns_scheduled ON birthday_campaigns(barbershop_id, scheduled_for, delivery_status);
CREATE INDEX IF NOT EXISTS idx_birthday_campaigns_type ON birthday_campaigns(barbershop_id, campaign_type, delivery_status);

-- Create birthday_templates table for reusable message templates
CREATE TABLE IF NOT EXISTS birthday_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbershop_id VARCHAR(255) NOT NULL,
  
  -- Template details
  template_name VARCHAR(100) NOT NULL,
  template_type VARCHAR(50) NOT NULL CHECK (template_type IN ('birthday', 'anniversary')),
  message_type VARCHAR(20) NOT NULL CHECK (message_type IN ('sms', 'email', 'both')),
  
  -- Template content
  subject_line VARCHAR(200), -- For email templates
  message_content TEXT NOT NULL,
  
  -- Discount configuration
  includes_discount BOOLEAN DEFAULT FALSE,
  discount_type VARCHAR(20) CHECK (discount_type IN ('percentage', 'fixed_amount', 'free_service')),
  discount_value DECIMAL(10,2) DEFAULT 0,
  discount_description VARCHAR(200),
  discount_expiry_days INTEGER DEFAULT 30,
  
  -- Template settings
  is_active BOOLEAN DEFAULT TRUE,
  is_default BOOLEAN DEFAULT FALSE,
  
  -- Usage tracking
  times_used INTEGER DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for birthday_templates
CREATE INDEX IF NOT EXISTS idx_birthday_templates_barbershop ON birthday_templates(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_birthday_templates_type ON birthday_templates(barbershop_id, template_type, is_active);
CREATE INDEX IF NOT EXISTS idx_birthday_templates_default ON birthday_templates(barbershop_id, template_type, is_default) WHERE is_default = TRUE;

-- Create function to automatically set anniversary_date on first appointment
CREATE OR REPLACE FUNCTION set_customer_anniversary()
RETURNS TRIGGER AS $$
BEGIN
  -- Only set anniversary date if it's not already set and this is the customer's first appointment
  IF NEW.customer_id IS NOT NULL THEN
    UPDATE customers 
    SET anniversary_date = COALESCE(anniversary_date, DATE(NEW.scheduled_at))
    WHERE id = NEW.customer_id 
    AND anniversary_date IS NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to set anniversary date
DROP TRIGGER IF EXISTS trigger_set_customer_anniversary ON appointments;
CREATE TRIGGER trigger_set_customer_anniversary
  AFTER INSERT ON appointments
  FOR EACH ROW EXECUTE FUNCTION set_customer_anniversary();

-- Create function to get upcoming birthdays/anniversaries
CREATE OR REPLACE FUNCTION get_upcoming_birthdays(
  p_barbershop_id VARCHAR(255),
  p_days_ahead INTEGER DEFAULT 30,
  p_campaign_type VARCHAR(50) DEFAULT 'birthday'
)
RETURNS TABLE (
  customer_id UUID,
  customer_name VARCHAR(255),
  customer_phone VARCHAR(20),
  customer_email VARCHAR(255),
  event_date DATE,
  days_until_event INTEGER,
  last_campaign_sent DATE,
  total_visits INTEGER,
  last_visit_at TIMESTAMP WITH TIME ZONE,
  vip_status BOOLEAN
) AS $$
BEGIN
  IF p_campaign_type = 'birthday' THEN
    RETURN QUERY
    SELECT 
      c.id,
      c.name,
      c.phone,
      c.email,
      -- Calculate this year's birthday
      CASE 
        WHEN EXTRACT(DOY FROM c.birthday) >= EXTRACT(DOY FROM CURRENT_DATE) THEN
          DATE(DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '1 day' * (EXTRACT(DOY FROM c.birthday) - 1))
        ELSE
          DATE(DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '1 year' + INTERVAL '1 day' * (EXTRACT(DOY FROM c.birthday) - 1))
      END as event_date,
      -- Days until birthday
      CASE 
        WHEN EXTRACT(DOY FROM c.birthday) >= EXTRACT(DOY FROM CURRENT_DATE) THEN
          EXTRACT(DOY FROM c.birthday)::INTEGER - EXTRACT(DOY FROM CURRENT_DATE)::INTEGER
        ELSE
          (365 - EXTRACT(DOY FROM CURRENT_DATE)::INTEGER) + EXTRACT(DOY FROM c.birthday)::INTEGER
      END as days_until_event,
      c.last_birthday_campaign_sent,
      c.total_visits,
      c.last_visit_at,
      c.vip_status
    FROM customers c
    WHERE c.barbershop_id = p_barbershop_id
    AND c.is_active = TRUE
    AND c.birthday IS NOT NULL
    AND c.birthday_reminders_enabled = TRUE
    AND (
      CASE 
        WHEN EXTRACT(DOY FROM c.birthday) >= EXTRACT(DOY FROM CURRENT_DATE) THEN
          EXTRACT(DOY FROM c.birthday)::INTEGER - EXTRACT(DOY FROM CURRENT_DATE)::INTEGER
        ELSE
          (365 - EXTRACT(DOY FROM CURRENT_DATE)::INTEGER) + EXTRACT(DOY FROM c.birthday)::INTEGER
      END
    ) <= p_days_ahead
    ORDER BY days_until_event ASC, c.name ASC;
    
  ELSE -- anniversary
    RETURN QUERY
    SELECT 
      c.id,
      c.name,
      c.phone,
      c.email,
      -- Calculate this year's anniversary
      CASE 
        WHEN EXTRACT(DOY FROM c.anniversary_date) >= EXTRACT(DOY FROM CURRENT_DATE) THEN
          DATE(DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '1 day' * (EXTRACT(DOY FROM c.anniversary_date) - 1))
        ELSE
          DATE(DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '1 year' + INTERVAL '1 day' * (EXTRACT(DOY FROM c.anniversary_date) - 1))
      END as event_date,
      -- Days until anniversary
      CASE 
        WHEN EXTRACT(DOY FROM c.anniversary_date) >= EXTRACT(DOY FROM CURRENT_DATE) THEN
          EXTRACT(DOY FROM c.anniversary_date)::INTEGER - EXTRACT(DOY FROM CURRENT_DATE)::INTEGER
        ELSE
          (365 - EXTRACT(DOY FROM CURRENT_DATE)::INTEGER) + EXTRACT(DOY FROM c.anniversary_date)::INTEGER
      END as days_until_event,
      c.last_anniversary_campaign_sent,
      c.total_visits,
      c.last_visit_at,
      c.vip_status
    FROM customers c
    WHERE c.barbershop_id = p_barbershop_id
    AND c.is_active = TRUE
    AND c.anniversary_date IS NOT NULL
    AND c.anniversary_reminders_enabled = TRUE
    AND (
      CASE 
        WHEN EXTRACT(DOY FROM c.anniversary_date) >= EXTRACT(DOY FROM CURRENT_DATE) THEN
          EXTRACT(DOY FROM c.anniversary_date)::INTEGER - EXTRACT(DOY FROM CURRENT_DATE)::INTEGER
        ELSE
          (365 - EXTRACT(DOY FROM CURRENT_DATE)::INTEGER) + EXTRACT(DOY FROM c.anniversary_date)::INTEGER
      END
    ) <= p_days_ahead
    ORDER BY days_until_event ASC, c.name ASC;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Insert default birthday/anniversary templates
INSERT INTO birthday_templates (barbershop_id, template_name, template_type, message_type, subject_line, message_content, includes_discount, discount_type, discount_value, discount_description, is_default)
VALUES 
-- Default birthday SMS template
('default', 'Birthday SMS - Default', 'birthday', 'sms', NULL, 'Happy Birthday {{customer_name}}! 🎉 Celebrate with us and get {{discount_description}}. Book your special day appointment today! Valid for {{discount_expiry_days}} days.', TRUE, 'percentage', 15, '15% off your next service', TRUE),

-- Default birthday email template  
('default', 'Birthday Email - Default', 'birthday', 'email', 'Happy Birthday from {{shop_name}}! 🎂', 'Dear {{customer_name}},

Happy Birthday! 🎉

We hope your special day is filled with joy and happiness. To help you celebrate, we''re offering you {{discount_description}} on your next visit!

{{discount_details}}

Book your birthday appointment today and let us help you look and feel your best on your special day.

With birthday wishes,
The {{shop_name}} Team

Book Now: {{booking_link}}', TRUE, 'percentage', 15, '15% off your next service', TRUE),

-- Default anniversary SMS template
('default', 'Anniversary SMS - Default', 'anniversary', 'sms', NULL, 'Happy Anniversary {{customer_name}}! 🎊 It''s been {{years_as_customer}} year(s) since your first visit. Celebrate with {{discount_description}}! Book today!', TRUE, 'percentage', 20, '20% off your next service', TRUE),

-- Default anniversary email template
('default', 'Anniversary Email - Default', 'anniversary', 'email', 'Celebrating {{years_as_customer}} Year(s) Together!', 'Dear {{customer_name}},

Happy Anniversary! 🎊

Can you believe it''s been {{years_as_customer}} year(s) since your first visit to {{shop_name}}? Time flies when you''re having great hair days!

We''re so grateful for your loyalty and trust in us. To celebrate this milestone, we''re offering you {{discount_description}}.

{{discount_details}}

Thank you for being such an amazing customer. Here''s to many more years of great looks together!

With appreciation,
The {{shop_name}} Team

Book Now: {{booking_link}}', TRUE, 'percentage', 20, '20% off your next service', TRUE);

-- Create updated_at trigger for new tables
CREATE TRIGGER trigger_birthday_campaigns_updated_at
    BEFORE UPDATE ON birthday_campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_birthday_templates_updated_at
    BEFORE UPDATE ON birthday_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;