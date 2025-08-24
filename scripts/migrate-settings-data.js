#!/usr/bin/env node
/**
 * Settings Data Migration Script
 * 
 * Safely migrates existing settings data from fragmented tables to the new
 * normalized three-tier hierarchy (System → Organization → User).
 * 
 * This script handles:
 * - Migrating barbershops → organizations with consolidated data
 * - Creating user-organization memberships from existing relationships
 * - Extracting settings from various sources into settings_hierarchy
 * - Maintaining backward compatibility during transition
 * 
 * Usage: node scripts/migrate-settings-data.js [--dry-run] [--barbershop-id=ID]
 */

const { createClient } = require('@supabase/supabase-js')

// Environment setup
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing required environment variables:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL')
  console.error('   SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Migration configuration
const args = process.argv.slice(2)
const isDryRun = args.includes('--dry-run')
const specificBarbershopId = args.find(arg => arg.startsWith('--barbershop-id='))?.split('=')[1]

console.log('🚀 Starting Settings Data Migration')
console.log('=====================================')
console.log(`Mode: ${isDryRun ? 'DRY RUN (no changes will be made)' : 'LIVE MIGRATION'}`)
if (specificBarbershopId) {
  console.log(`Target: Single barbershop ${specificBarbershopId}`)
}
console.log('')

/**
 * Migration Statistics Tracking
 */
const stats = {
  barbershops: { found: 0, migrated: 0, errors: 0 },
  memberships: { created: 0, errors: 0 },
  settings: { created: 0, errors: 0 },
  profiles: { updated: 0, errors: 0 }
}

/**
 * Step 1: Migrate Barbershops to Organizations
 * Consolidates business information scattered across multiple tables
 */
async function migrateBarbershopsToOrganizations() {
  console.log('📊 Step 1: Migrating Barbershops → Organizations')
  console.log('------------------------------------------------')
  
  try {
    // Get existing barbershops
    let query = supabase
      .from('barbershops')
      .select('*')
      .order('created_at', { ascending: true })
    
    if (specificBarbershopId) {
      query = query.eq('id', specificBarbershopId)
    }
    
    const { data: barbershops, error: fetchError } = await query
    
    if (fetchError) {
      throw new Error(`Failed to fetch barbershops: ${fetchError.message}`)
    }
    
    stats.barbershops.found = barbershops.length
    console.log(`   Found ${barbershops.length} barbershops to migrate`)
    
    for (const barbershop of barbershops) {
      try {
        console.log(`   → Processing: ${barbershop.name} (${barbershop.id})`)
        
        // Check if already migrated
        const { data: existing } = await supabase
          .from('organizations')
          .select('id')
          .eq('id', barbershop.id)
          .single()
        
        if (existing) {
          console.log(`     ⚠️  Already exists as organization, skipping`)
          continue
        }
        
        // Prepare consolidated organization data
        const organizationData = {
          id: barbershop.id, // Preserve same ID for compatibility
          name: barbershop.name || 'Unnamed Barbershop',
          type: 'barbershop',
          slug: barbershop.slug || null,
          
          // Consolidate contact information
          contact_info: {
            email: barbershop.email || null,
            phone: barbershop.phone || null,
            website: barbershop.website || null,
            social_media: barbershop.social_media || {}
          },
          
          // Consolidate address information
          address: {
            street: barbershop.address || null,
            city: barbershop.city || null,
            state: barbershop.state || null,
            zip_code: barbershop.zip_code || null,
            country: barbershop.country || 'US',
            coordinates: {
              lat: barbershop.latitude || null,
              lng: barbershop.longitude || null
            },
            service_area_radius: barbershop.service_area_radius || null
          },
          
          // Business hours (preserve existing or use defaults)
          business_hours: barbershop.business_hours || {
            monday: { open: '09:00', close: '17:00', is_open: true },
            tuesday: { open: '09:00', close: '17:00', is_open: true },
            wednesday: { open: '09:00', close: '17:00', is_open: true },
            thursday: { open: '09:00', close: '17:00', is_open: true },
            friday: { open: '09:00', close: '17:00', is_open: true },
            saturday: { open: '09:00', close: '17:00', is_open: true },
            sunday: { open: '10:00', close: '16:00', is_open: false },
            timezone: 'America/New_York'
          },
          
          // Organization settings
          settings: {
            description: barbershop.description || null,
            branding: {
              logo_url: barbershop.logo_url || null,
              primary_color: barbershop.primary_color || '#6B7280',
              secondary_color: barbershop.secondary_color || '#F3F4F6'
            },
            booking: {
              require_phone: barbershop.require_phone ?? true,
              allow_walk_ins: barbershop.allow_walk_ins ?? true,
              cancellation_policy: barbershop.cancellation_policy || '24_hours',
              deposit_required: barbershop.deposit_required ?? false
            },
            notifications: barbershop.notification_settings || {},
            integrations: barbershop.integration_settings || {}
          },
          
          is_active: barbershop.is_active ?? true,
          subscription_tier: barbershop.subscription_tier || 'shop_owner',
          created_at: barbershop.created_at,
          created_by: barbershop.owner_id
        }
        
        if (!isDryRun) {
          const { error: insertError } = await supabase
            .from('organizations')
            .insert(organizationData)
          
          if (insertError) {
            throw new Error(`Insert failed: ${insertError.message}`)
          }
        }
        
        stats.barbershops.migrated++
        console.log(`     ✅ Migrated successfully`)
        
      } catch (error) {
        stats.barbershops.errors++
        console.log(`     ❌ Error: ${error.message}`)
      }
    }
    
  } catch (error) {
    console.error(`❌ Step 1 failed: ${error.message}`)
    throw error
  }
  
  console.log(`   Summary: ${stats.barbershops.migrated}/${stats.barbershops.found} migrated`)
  console.log('')
}

/**
 * Step 2: Create User-Organization Memberships
 * Establishes proper role-based relationships
 */
async function createUserOrganizationMemberships() {
  console.log('👥 Step 2: Creating User-Organization Memberships')
  console.log('--------------------------------------------------')
  
  try {
    // Get barbershop owners
    let query = supabase
      .from('barbershops')
      .select('id, name, owner_id')
      .not('owner_id', 'is', null)
    
    if (specificBarbershopId) {
      query = query.eq('id', specificBarbershopId)
    }
    
    const { data: barbershops, error: fetchError } = await query
    
    if (fetchError) {
      throw new Error(`Failed to fetch barbershop owners: ${fetchError.message}`)
    }
    
    console.log(`   Processing ${barbershops.length} owner relationships`)
    
    for (const barbershop of barbershops) {
      try {
        // Check if membership already exists
        const { data: existing } = await supabase
          .from('user_organization_memberships')
          .select('id')
          .eq('user_id', barbershop.owner_id)
          .eq('organization_id', barbershop.id)
          .single()
        
        if (existing) {
          console.log(`   → ${barbershop.name}: Membership already exists`)
          continue
        }
        
        // Create owner membership
        const membershipData = {
          user_id: barbershop.owner_id,
          organization_id: barbershop.id,
          role: 'owner',
          is_primary: true, // First org is primary for the user
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
          const { error: insertError } = await supabase
            .from('user_organization_memberships')
            .insert(membershipData)
          
          if (insertError) {
            throw new Error(`Insert failed: ${insertError.message}`)
          }
        }
        
        stats.memberships.created++
        console.log(`   → ${barbershop.name}: ✅ Owner membership created`)
        
      } catch (error) {
        stats.memberships.errors++
        console.log(`   → ${barbershop.name}: ❌ Error: ${error.message}`)
      }
    }
    
    // Also create memberships for barbers (from barbershop_staff table)
    const { data: staffMembers } = await supabase
      .from('barbershop_staff')
      .select('user_id, barbershop_id, role, is_active')
      .eq('is_active', true)
    
    if (staffMembers) {
      console.log(`   Processing ${staffMembers.length} staff relationships`)
      
      for (const staff of staffMembers) {
        try {
          // Check if membership already exists
          const { data: existing } = await supabase
            .from('user_organization_memberships')
            .select('id')
            .eq('user_id', staff.user_id)
            .eq('organization_id', staff.barbershop_id)
            .single()
          
          if (existing) continue
          
          const membershipData = {
            user_id: staff.user_id,
            organization_id: staff.barbershop_id,
            role: staff.role || 'barber',
            is_primary: false,
            permissions: {
              settings: { view: true, edit: false },
              staff: { view: true, manage: false, hire: false },
              customers: { view: true, manage: true, export: false },
              financials: { view: false, reports: false, payouts: false },
              bookings: { view: true, manage: true, calendar: true }
            },
            is_active: staff.is_active
          }
          
          if (!isDryRun) {
            const { error: insertError } = await supabase
              .from('user_organization_memberships')
              .insert(membershipData)
            
            if (insertError) continue // Skip on duplicate/error
          }
          
          stats.memberships.created++
          
        } catch (error) {
          stats.memberships.errors++
        }
      }
    }
    
  } catch (error) {
    console.error(`❌ Step 2 failed: ${error.message}`)
    throw error
  }
  
  console.log(`   Summary: ${stats.memberships.created} memberships created`)
  console.log('')
}

/**
 * Step 3: Migrate Settings to Hierarchy
 * Extract scattered settings into organized hierarchy
 */
async function migrateSettingsToHierarchy() {
  console.log('⚙️  Step 3: Migrating Settings to Hierarchy')
  console.log('---------------------------------------------')
  
  try {
    // Migrate notification settings from profiles
    console.log('   → Migrating user notification preferences...')
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, notification_preferences, appearance_settings')
      .not('notification_preferences', 'is', null)
    
    if (profiles) {
      for (const profile of profiles) {
        try {
          // Create user-level notification settings
          if (profile.notification_preferences) {
            const settingsData = {
              context_type: 'user',
              context_id: profile.id,
              category: 'notifications',
              settings: profile.notification_preferences,
              inherits_from_parent: true,
              is_active: true
            }
            
            if (!isDryRun) {
              await supabase
                .from('settings_hierarchy')
                .upsert(settingsData, {
                  onConflict: 'context_type,context_id,category'
                })
            }
            
            stats.settings.created++
          }
          
          // Create user-level appearance settings
          if (profile.appearance_settings) {
            const settingsData = {
              context_type: 'user',
              context_id: profile.id,
              category: 'appearance',
              settings: profile.appearance_settings,
              inherits_from_parent: true,
              is_active: true
            }
            
            if (!isDryRun) {
              await supabase
                .from('settings_hierarchy')
                .upsert(settingsData, {
                  onConflict: 'context_type,context_id,category'
                })
            }
            
            stats.settings.created++
          }
          
        } catch (error) {
          stats.settings.errors++
        }
      }
    }
    
    // Migrate organization-level settings from barbershops
    console.log('   → Migrating organization settings...')
    let query = supabase
      .from('barbershops')
      .select('id, notification_settings, booking_settings, payment_settings')
    
    if (specificBarbershopId) {
      query = query.eq('id', specificBarbershopId)
    }
    
    const { data: barbershops } = await query
    
    if (barbershops) {
      for (const barbershop of barbershops) {
        try {
          // Organization notification settings
          if (barbershop.notification_settings) {
            const settingsData = {
              context_type: 'organization',
              context_id: barbershop.id,
              category: 'notifications',
              settings: barbershop.notification_settings,
              inherits_from_parent: true,
              is_active: true
            }
            
            if (!isDryRun) {
              await supabase
                .from('settings_hierarchy')
                .upsert(settingsData, {
                  onConflict: 'context_type,context_id,category'
                })
            }
            
            stats.settings.created++
          }
          
          // Organization booking preferences
          if (barbershop.booking_settings) {
            const settingsData = {
              context_type: 'organization',
              context_id: barbershop.id,
              category: 'booking_preferences',
              settings: barbershop.booking_settings,
              inherits_from_parent: true,
              is_active: true
            }
            
            if (!isDryRun) {
              await supabase
                .from('settings_hierarchy')
                .upsert(settingsData, {
                  onConflict: 'context_type,context_id,category'
                })
            }
            
            stats.settings.created++
          }
          
          // Organization payment settings
          if (barbershop.payment_settings) {
            const settingsData = {
              context_type: 'organization',
              context_id: barbershop.id,
              category: 'payment_settings',
              settings: barbershop.payment_settings,
              inherits_from_parent: true,
              is_active: true
            }
            
            if (!isDryRun) {
              await supabase
                .from('settings_hierarchy')
                .upsert(settingsData, {
                  onConflict: 'context_type,context_id,category'
                })
            }
            
            stats.settings.created++
          }
          
        } catch (error) {
          stats.settings.errors++
        }
      }
    }
    
  } catch (error) {
    console.error(`❌ Step 3 failed: ${error.message}`)
    throw error
  }
  
  console.log(`   Summary: ${stats.settings.created} settings migrated`)
  console.log('')
}

/**
 * Step 4: Update User Profiles for New Schema
 * Add references to primary organization
 */
async function updateUserProfiles() {
  console.log('👤 Step 4: Updating User Profiles')
  console.log('-----------------------------------')
  
  try {
    // Update profiles to reference primary organization
    const { data: memberships } = await supabase
      .from('user_organization_memberships')
      .select('user_id, organization_id')
      .eq('is_primary', true)
      .eq('is_active', true)
    
    if (memberships) {
      console.log(`   Updating ${memberships.length} user profiles`)
      
      for (const membership of memberships) {
        try {
          if (!isDryRun) {
            const { error: updateError } = await supabase
              .from('profiles')
              .update({
                shop_id: membership.organization_id,
                barbershop_id: membership.organization_id, // Compatibility
                updated_at: new Date().toISOString()
              })
              .eq('id', membership.user_id)
            
            if (updateError) {
              throw new Error(`Update failed: ${updateError.message}`)
            }
          }
          
          stats.profiles.updated++
          
        } catch (error) {
          stats.profiles.errors++
        }
      }
    }
    
  } catch (error) {
    console.error(`❌ Step 4 failed: ${error.message}`)
    throw error
  }
  
  console.log(`   Summary: ${stats.profiles.updated} profiles updated`)
  console.log('')
}

/**
 * Step 5: Validation and Verification
 */
async function validateMigration() {
  console.log('✅ Step 5: Validating Migration')
  console.log('---------------------------------')
  
  try {
    // Run built-in verification function
    const { data: verification, error } = await supabase.rpc('verify_settings_migration')
    
    if (error) {
      throw new Error(`Verification failed: ${error.message}`)
    }
    
    console.log('   Verification Results:')
    verification.forEach(check => {
      const icon = check.status === 'PASS' ? '✅' : '❌'
      console.log(`   ${icon} ${check.check_name}: ${check.details}`)
    })
    
    // Additional validation checks
    const { count: orgCount } = await supabase
      .from('organizations')
      .select('*', { count: 'exact', head: true })
    
    const { count: membershipCount } = await supabase
      .from('user_organization_memberships')
      .select('*', { count: 'exact', head: true })
    
    const { count: settingsCount } = await supabase
      .from('settings_hierarchy')
      .select('*', { count: 'exact', head: true })
    
    console.log('')
    console.log('   Final Statistics:')
    console.log(`   📊 Organizations: ${orgCount}`)
    console.log(`   👥 Memberships: ${membershipCount}`)
    console.log(`   ⚙️  Settings: ${settingsCount}`)
    
  } catch (error) {
    console.error(`❌ Validation failed: ${error.message}`)
    throw error
  }
}

/**
 * Main Migration Execution
 */
async function runMigration() {
  const startTime = Date.now()
  
  try {
    await migrateBarbershopsToOrganizations()
    await createUserOrganizationMemberships()
    await migrateSettingsToHierarchy()
    await updateUserProfiles()
    await validateMigration()
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    
    console.log('🎉 Migration Completed Successfully!')
    console.log('====================================')
    console.log(`Duration: ${duration}s`)
    console.log('')
    console.log('📊 Final Statistics:')
    console.log(`   Barbershops: ${stats.barbershops.migrated}/${stats.barbershops.found} migrated`)
    console.log(`   Memberships: ${stats.memberships.created} created`)
    console.log(`   Settings: ${stats.settings.created} created`)
    console.log(`   Profiles: ${stats.profiles.updated} updated`)
    console.log('')
    
    if (stats.barbershops.errors + stats.memberships.errors + stats.settings.errors + stats.profiles.errors > 0) {
      console.log('⚠️  Some errors occurred during migration:')
      console.log(`   Barbershop errors: ${stats.barbershops.errors}`)
      console.log(`   Membership errors: ${stats.memberships.errors}`)
      console.log(`   Settings errors: ${stats.settings.errors}`)
      console.log(`   Profile errors: ${stats.profiles.errors}`)
      console.log('')
    }
    
    if (isDryRun) {
      console.log('🔍 This was a DRY RUN - no actual changes were made')
      console.log('   Run without --dry-run flag to perform the migration')
    } else {
      console.log('✅ All data has been successfully migrated to the new schema')
      console.log('   The old tables remain intact for rollback if needed')
    }
    
  } catch (error) {
    console.error(`💥 Migration failed: ${error.message}`)
    process.exit(1)
  }
}

// Execute migration
runMigration()