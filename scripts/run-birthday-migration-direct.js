#!/usr/bin/env node

/**
 * Run Birthday/Anniversary Database Migration - Direct SQL Execution
 * 
 * This script applies the birthday and anniversary features migration to Supabase using direct SQL execution
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: '.env.local' });

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Supabase environment variables not found');
  
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runMigration() {

  try {

    // Step 1: Add birthday and anniversary columns to customers table
    
    try {
      const { error } = await supabase.rpc('query', {
        query: `
          ALTER TABLE customers 
          ADD COLUMN IF NOT EXISTS birthday DATE,
          ADD COLUMN IF NOT EXISTS anniversary_date DATE,
          ADD COLUMN IF NOT EXISTS birthday_reminders_enabled BOOLEAN DEFAULT TRUE,
          ADD COLUMN IF NOT EXISTS anniversary_reminders_enabled BOOLEAN DEFAULT TRUE,
          ADD COLUMN IF NOT EXISTS last_birthday_campaign_sent DATE,
          ADD COLUMN IF NOT EXISTS last_anniversary_campaign_sent DATE;
        `
      });
      
      if (error && !error.message.includes('already exists')) {
        
      } else {
        
      }
    } catch (err) {
      
    }

    // Step 2: Create indexes
    
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_customers_birthday ON customers(barbershop_id, birthday) WHERE birthday IS NOT NULL',
      'CREATE INDEX IF NOT EXISTS idx_customers_anniversary ON customers(barbershop_id, anniversary_date) WHERE anniversary_date IS NOT NULL',
      'CREATE INDEX IF NOT EXISTS idx_customers_birthday_reminders ON customers(barbershop_id, birthday_reminders_enabled, birthday) WHERE birthday_reminders_enabled = TRUE',
      'CREATE INDEX IF NOT EXISTS idx_customers_anniversary_reminders ON customers(barbershop_id, anniversary_reminders_enabled, anniversary_date) WHERE anniversary_reminders_enabled = TRUE'
    ];

    for (const indexSql of indexes) {
      try {
        const { error } = await supabase.rpc('query', { query: indexSql });
        if (error && !error.message.includes('already exists')) {
          
        }
      } catch (err) {
        
      }
    }

    // Step 3: Create birthday_campaigns table
    
    try {
      const { error } = await supabase.rpc('query', {
        query: `
          CREATE TABLE IF NOT EXISTS birthday_campaigns (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            barbershop_id VARCHAR(255) NOT NULL,
            customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
            
            campaign_type VARCHAR(50) NOT NULL CHECK (campaign_type IN ('birthday', 'anniversary')),
            message_type VARCHAR(20) NOT NULL CHECK (message_type IN ('sms', 'email', 'both')),
            message_content TEXT NOT NULL,
            discount_percentage INTEGER DEFAULT 0,
            discount_amount DECIMAL(10,2) DEFAULT 0,
            
            scheduled_for DATE NOT NULL,
            sent_at TIMESTAMP WITH TIME ZONE,
            delivery_status VARCHAR(20) DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'failed', 'cancelled')),
            
            opened_at TIMESTAMP WITH TIME ZONE,
            clicked_at TIMESTAMP WITH TIME ZONE,
            redeemed_at TIMESTAMP WITH TIME ZONE,
            booking_made BOOLEAN DEFAULT FALSE,
            booking_id UUID,
            
            sms_response_received BOOLEAN DEFAULT FALSE,
            sms_response_content TEXT,
            
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `
      });
      
      if (error && !error.message.includes('already exists')) {
        
      } else {
        
      }
    } catch (err) {
      
    }

    // Step 4: Create birthday_templates table
    
    try {
      const { error } = await supabase.rpc('query', {
        query: `
          CREATE TABLE IF NOT EXISTS birthday_templates (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            barbershop_id VARCHAR(255) NOT NULL,
            
            template_name VARCHAR(100) NOT NULL,
            template_type VARCHAR(50) NOT NULL CHECK (template_type IN ('birthday', 'anniversary')),
            message_type VARCHAR(20) NOT NULL CHECK (message_type IN ('sms', 'email', 'both')),
            
            subject_line VARCHAR(200),
            message_content TEXT NOT NULL,
            
            includes_discount BOOLEAN DEFAULT FALSE,
            discount_type VARCHAR(20) CHECK (discount_type IN ('percentage', 'fixed_amount', 'free_service')),
            discount_value DECIMAL(10,2) DEFAULT 0,
            discount_description VARCHAR(200),
            discount_expiry_days INTEGER DEFAULT 30,
            
            is_active BOOLEAN DEFAULT TRUE,
            is_default BOOLEAN DEFAULT FALSE,
            
            times_used INTEGER DEFAULT 0,
            last_used_at TIMESTAMP WITH TIME ZONE,
            
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `
      });
      
      if (error && !error.message.includes('already exists')) {
        
      } else {
        
      }
    } catch (err) {
      
    }

    // Step 5: Create campaign table indexes
    
    const campaignIndexes = [
      'CREATE INDEX IF NOT EXISTS idx_birthday_campaigns_barbershop ON birthday_campaigns(barbershop_id)',
      'CREATE INDEX IF NOT EXISTS idx_birthday_campaigns_customer ON birthday_campaigns(customer_id)',
      'CREATE INDEX IF NOT EXISTS idx_birthday_campaigns_scheduled ON birthday_campaigns(barbershop_id, scheduled_for, delivery_status)',
      'CREATE INDEX IF NOT EXISTS idx_birthday_campaigns_type ON birthday_campaigns(barbershop_id, campaign_type, delivery_status)'
    ];

    for (const indexSql of campaignIndexes) {
      try {
        const { error } = await supabase.rpc('query', { query: indexSql });
        if (error && !error.message.includes('already exists')) {
          
        }
      } catch (err) {
        
      }
    }

    // Step 6: Create template table indexes
    
    const templateIndexes = [
      'CREATE INDEX IF NOT EXISTS idx_birthday_templates_barbershop ON birthday_templates(barbershop_id)',
      'CREATE INDEX IF NOT EXISTS idx_birthday_templates_type ON birthday_templates(barbershop_id, template_type, is_active)',
      'CREATE INDEX IF NOT EXISTS idx_birthday_templates_default ON birthday_templates(barbershop_id, template_type, is_default) WHERE is_default = TRUE'
    ];

    for (const indexSql of templateIndexes) {
      try {
        const { error } = await supabase.rpc('query', { query: indexSql });
        if (error && !error.message.includes('already exists')) {
          
        }
      } catch (err) {
        
      }
    }

    // Step 7: Insert default templates

    const templates = [
      {
        barbershop_id: 'default',
        template_name: 'Birthday SMS - Default',
        template_type: 'birthday',
        message_type: 'sms',
        subject_line: null,
        message_content: 'Happy Birthday {{customer_name}}! 🎉 Celebrate with us and get {{discount_description}}. Book your special day appointment today! Valid for {{discount_expiry_days}} days.',
        includes_discount: true,
        discount_type: 'percentage',
        discount_value: 15,
        discount_description: '15% off your next service',
        is_default: true
      },
      {
        barbershop_id: 'default',
        template_name: 'Birthday Email - Default',
        template_type: 'birthday',
        message_type: 'email',
        subject_line: 'Happy Birthday from {{shop_name}}! 🎂',
        message_content: 'Dear {{customer_name}},\n\nHappy Birthday! 🎉\n\nWe hope your special day is filled with joy and happiness. To help you celebrate, we\'re offering you {{discount_description}} on your next visit!\n\n{{discount_details}}\n\nBook your birthday appointment today and let us help you look and feel your best on your special day.\n\nWith birthday wishes,\nThe {{shop_name}} Team\n\nBook Now: {{booking_link}}',
        includes_discount: true,
        discount_type: 'percentage',
        discount_value: 15,
        discount_description: '15% off your next service',
        is_default: true
      },
      {
        barbershop_id: 'default',
        template_name: 'Anniversary SMS - Default',
        template_type: 'anniversary',
        message_type: 'sms',
        subject_line: null,
        message_content: 'Happy Anniversary {{customer_name}}! 🎊 It\'s been {{years_as_customer}} year(s) since your first visit. Celebrate with {{discount_description}}! Book today!',
        includes_discount: true,
        discount_type: 'percentage',
        discount_value: 20,
        discount_description: '20% off your next service',
        is_default: true
      },
      {
        barbershop_id: 'default',
        template_name: 'Anniversary Email - Default',
        template_type: 'anniversary',
        message_type: 'email',
        subject_line: 'Celebrating {{years_as_customer}} Year(s) Together!',
        message_content: 'Dear {{customer_name}},\n\nHappy Anniversary! 🎊\n\nCan you believe it\'s been {{years_as_customer}} year(s) since your first visit to {{shop_name}}? Time flies when you\'re having great hair days!\n\nWe\'re so grateful for your loyalty and trust in us. To celebrate this milestone, we\'re offering you {{discount_description}}.\n\n{{discount_details}}\n\nThank you for being such an amazing customer. Here\'s to many more years of great looks together!\n\nWith appreciation,\nThe {{shop_name}} Team\n\nBook Now: {{booking_link}}',
        includes_discount: true,
        discount_type: 'percentage',
        discount_value: 20,
        discount_description: '20% off your next service',
        is_default: true
      }
    ];

    let templatesCreated = 0;
    for (const template of templates) {
      try {
        const { error } = await supabase
          .from('birthday_templates')
          .insert(template)
          .select();
        
        if (error && !error.message.includes('duplicate')) {
          
        } else {
          templatesCreated++;
        }
      } catch (err) {
        
      }
    }

    // Step 8: Verification

    // Check if birthday/anniversary columns were added
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, birthday, anniversary_date, birthday_reminders_enabled')
        .limit(1);

      if (error) {
        
      } else {
        
      }
    } catch (err) {
      
    }

    // Check new tables
    const tablesToCheck = ['birthday_campaigns', 'birthday_templates'];
    for (const table of tablesToCheck) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);

        if (error) {
          
        } else {
          
        }
      } catch (err) {
        
      }
    }

    // Check default templates
    try {
      const { data, error } = await supabase
        .from('birthday_templates')
        .select('id, template_name, template_type')
        .eq('barbershop_id', 'default')
        .eq('is_default', true);

      if (error) {
        
      } else {
        
        data.forEach(template => {
          `);
        });
      }
    } catch (err) {
      
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();