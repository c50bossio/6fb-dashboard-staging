#!/usr/bin/env node
/**
 * Simplified Settings Data Migration
 * 
 * Migrates existing barbershop data to the new normalized schema
 * without requiring the full database functions that may not be available.
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)
const isDryRun = process.argv.includes('--dry-run')

async function migrateData() {
  try {
    // First, check if the new tables are available

    const checkTables = ['organizations', 'user_organization_memberships', 'settings_hierarchy']
    const missingTables = []
    
    for (const table of checkTables) {
      try {
        const { error } = await supabase.from(table).select('*').limit(0)
        if (error && error.message.includes('does not exist')) {
          missingTables.push(table)
        }
      } catch (e) {
        missingTables.push(table)
      }
    }
    
    if (missingTables.length > 0) {
      )
      
      return
    }

    // Step 1: Migrate barbershops to organizations
    
    const { data: barbershops, error: barbershopError } = await supabase
      .from('barbershops')
      .select('*')
    
    if (barbershopError) {
      throw new Error(`Failed to fetch barbershops: ${barbershopError.message}`)
    }

    for (const barbershop of barbershops) {
      // Check if already exists in organizations
      const { data: existing } = await supabase
        .from('organizations')
        .select('id')
        .eq('id', barbershop.id)
        .single()
      
      if (existing) {
        
        continue
      }
      
      const organizationData = {
        id: barbershop.id,
        name: barbershop.name || 'Unnamed Barbershop',
        type: 'barbershop',
        contact_info: {
          email: barbershop.email || null,
          phone: barbershop.phone || null,
          website: barbershop.website || null
        },
        address: {
          street: barbershop.address || null,
          city: barbershop.city || null,
          state: barbershop.state || null,
          zip_code: barbershop.zip_code || null,
          country: barbershop.country || 'US'
        },
        business_hours: barbershop.business_hours || {
          monday: { open: '09:00', close: '17:00', is_open: true },
          tuesday: { open: '09:00', close: '17:00', is_open: true },
          wednesday: { open: '09:00', close: '17:00', is_open: true },
          thursday: { open: '09:00', close: '17:00', is_open: true },
          friday: { open: '09:00', close: '17:00', is_open: true },
          saturday: { open: '09:00', close: '17:00', is_open: true },
          sunday: { open: '10:00', close: '16:00', is_open: false }
        },
        settings: {
          description: barbershop.description || null,
          branding: {
            logo_url: barbershop.logo_url || null,
            primary_color: barbershop.primary_color || '#6B7280'
          },
          booking: {
            require_phone: barbershop.require_phone ?? true,
            allow_walk_ins: barbershop.allow_walk_ins ?? true,
            cancellation_policy: barbershop.cancellation_policy || '24_hours'
          }
        },
        is_active: barbershop.is_active ?? true,
        subscription_tier: 'shop_owner',
        created_at: barbershop.created_at,
        created_by: barbershop.owner_id
      }
      
      if (!isDryRun) {
        const { error } = await supabase
          .from('organizations')
          .insert(organizationData)
        
        if (error) {
          
          continue
        }
      }

      // Step 2: Create user membership for owner
      if (barbershop.owner_id) {
        const membershipData = {
          user_id: barbershop.owner_id,
          organization_id: barbershop.id,
          role: 'owner',
          is_primary: true,
          permissions: {
            settings: { view: true, edit: true },
            staff: { view: true, manage: true, hire: true },
            customers: { view: true, manage: true, export: true },
            financials: { view: true, reports: true, payouts: true },
            bookings: { view: true, manage: true, calendar: true }
          },
          is_active: true
        }
        
        if (!isDryRun) {
          const { error: membershipError } = await supabase
            .from('user_organization_memberships')
            .insert(membershipData)
          
          if (membershipError && !membershipError.message.includes('duplicate')) {
            
          }
        }
      }
    }
    
    // Step 3: Create organization-level settings from barbershop data

    for (const barbershop of barbershops) {
      if (barbershop.notification_settings || barbershop.booking_settings) {
        const settingsToMigrate = []
        
        if (barbershop.notification_settings) {
          settingsToMigrate.push({
            context_type: 'organization',
            context_id: barbershop.id,
            category: 'notifications',
            settings: barbershop.notification_settings
          })
        }
        
        if (barbershop.booking_settings) {
          settingsToMigrate.push({
            context_type: 'organization',
            context_id: barbershop.id,
            category: 'booking_preferences',
            settings: barbershop.booking_settings
          })
        }
        
        if (!isDryRun) {
          for (const setting of settingsToMigrate) {
            const { error } = await supabase
              .from('settings_hierarchy')
              .upsert(setting, { onConflict: 'context_type,context_id,category' })
            
            if (error) {
              
            }
          }
        }
        
        if (settingsToMigrate.length > 0) {
          
        }
      }
    }

    if (isDryRun) {

    } else {

    }
    
  } catch (error) {
    console.error('💥 Migration failed:', error.message)
    process.exit(1)
  }
}

migrateData()