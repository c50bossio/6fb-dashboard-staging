#!/usr/bin/env node

/**
 * Migration Script: Migrate to Unified Context System
 * 
 * This script migrates existing users and data to support the new unified context system:
 * 1. Creates organization records for multi-location owners
 * 2. Links barbershops to organizations
 * 3. Creates context preferences for existing users
 * 4. Validates context access permissions
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

// Load environment variables
config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

class UnifiedContextMigration {
  constructor() {
    this.results = {
      organizationsCreated: 0,
      barbershopsLinked: 0,
      usersUpdated: 0,
      contextPreferencesCreated: 0,
      errors: []
    }
  }

  async run() {
    console.log('🚀 Starting Unified Context Migration...')
    
    try {
      // Step 1: Create organizations for enterprise users
      await this.createOrganizations()
      
      // Step 2: Link barbershops to organizations  
      await this.linkBarbershopsToOrganizations()
      
      // Step 3: Create organization memberships
      await this.createOrganizationMemberships()
      
      // Step 4: Create context preferences for users
      await this.createContextPreferences()
      
      // Step 5: Validate the migration
      await this.validateMigration()
      
      console.log('✅ Migration completed successfully!')
      this.printResults()
      
    } catch (error) {
      console.error('❌ Migration failed:', error)
      this.results.errors.push(error.message)
      throw error
    }
  }

  async createOrganizations() {
    console.log('📋 Step 1: Creating organizations for enterprise users...')
    
    // Find users with ENTERPRISE_OWNER role who don't have organizations
    const { data: enterpriseUsers, error } = await supabase
      .from('profiles')
      .select(`
        id, 
        full_name, 
        email,
        barbershops!profiles_shop_id_fkey(id, name, address)
      `)
      .eq('role', 'ENTERPRISE_OWNER')
    
    if (error) throw error
    
    for (const user of enterpriseUsers) {
      // Check if user already has an organization
      const { data: existingOrg } = await supabase
        .from('organizations')
        .select('id')
        .eq('owner_id', user.id)
        .single()
      
      if (existingOrg) {
        console.log(`  ⏭️  Organization already exists for ${user.email}`)
        continue
      }
      
      // Create organization
      const orgName = user.barbershops?.name 
        ? `${user.barbershops.name} Enterprise`
        : `${user.full_name}'s Enterprise`
      
      const { data: newOrg, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: orgName,
          description: `Enterprise organization for ${user.full_name}`,
          owner_id: user.id,
          settings: {
            tier: 'ENTERPRISE',
            contextSystem: 'enabled',
            migrated: true,
            migratedAt: new Date().toISOString()
          }
        })
        .select()
        .single()
      
      if (orgError) {
        console.error(`  ❌ Failed to create organization for ${user.email}:`, orgError)
        this.results.errors.push(`Organization creation failed for ${user.email}: ${orgError.message}`)
        continue
      }
      
      console.log(`  ✅ Created organization "${orgName}" for ${user.email}`)
      this.results.organizationsCreated++
    }
  }

  async linkBarbershopsToOrganizations() {
    console.log('📋 Step 2: Linking barbershops to organizations...')
    
    // Get all organizations
    const { data: organizations, error } = await supabase
      .from('organizations')
      .select('id, owner_id, name')
    
    if (error) throw error
    
    for (const org of organizations) {
      // Find barbershops owned by this organization's owner
      const { data: barbershops, error: shopsError } = await supabase
        .from('barbershops')
        .select('id, name, owner_id')
        .eq('owner_id', org.owner_id)
        .is('organization_id', null) // Only unlinked barbershops
      
      if (shopsError) {
        console.error(`  ❌ Failed to fetch barbershops for organization ${org.name}:`, shopsError)
        continue
      }
      
      if (!barbershops?.length) {
        console.log(`  ⏭️  No unlinked barbershops found for ${org.name}`)
        continue
      }
      
      // Link barbershops to organization
      for (const barbershop of barbershops) {
        const { error: updateError } = await supabase
          .from('barbershops')
          .update({ organization_id: org.id })
          .eq('id', barbershop.id)
        
        if (updateError) {
          console.error(`  ❌ Failed to link ${barbershop.name} to ${org.name}:`, updateError)
          this.results.errors.push(`Barbershop linking failed: ${updateError.message}`)
          continue
        }
        
        console.log(`  ✅ Linked "${barbershop.name}" to "${org.name}"`)
        this.results.barbershopsLinked++
      }
    }
  }

  async createOrganizationMemberships() {
    console.log('📋 Step 3: Creating organization memberships...')
    
    // Get all organizations and their linked barbershops
    const { data: organizations, error } = await supabase
      .from('organizations')  
      .select(`
        id,
        owner_id,
        name,
        barbershops!barbershops_organization_id_fkey(
          id,
          barbershop_staff!barbershop_staff_barbershop_id_fkey(user_id, role)
        )
      `)
    
    if (error) throw error
    
    for (const org of organizations) {
      // Create membership for organization owner
      await this.createMembership(org.id, org.owner_id, 'OWNER')
      
      // Create memberships for all staff across organization locations
      const staffUsers = new Set()
      
      for (const barbershop of org.barbershops || []) {
        for (const staff of barbershop.barbershop_staff || []) {
          if (staff.user_id !== org.owner_id) { // Don't duplicate owner
            staffUsers.add(staff.user_id)
          }
        }
      }
      
      for (const userId of staffUsers) {
        await this.createMembership(org.id, userId, 'MEMBER')
      }
      
      console.log(`  ✅ Created memberships for ${org.name} (${staffUsers.size + 1} members)`)
    }
  }

  async createMembership(organizationId, userId, role) {
    // Check if membership already exists
    const { data: existing } = await supabase
      .from('organization_members')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .single()
    
    if (existing) return
    
    const { error } = await supabase
      .from('organization_members')
      .insert({
        organization_id: organizationId,
        user_id: userId,
        role: role,
        permissions: role === 'OWNER' 
          ? ['all'] 
          : ['view_analytics', 'manage_appointments']
      })
    
    if (error) {
      this.results.errors.push(`Membership creation failed: ${error.message}`)
    }
  }

  async createContextPreferences() {
    console.log('📋 Step 4: Creating context preferences for users...')
    
    // Get all users who need context preferences
    const { data: users, error } = await supabase
      .from('profiles')
      .select('id, role, email')
      .in('role', ['ENTERPRISE_OWNER', 'SHOP_OWNER', 'BARBER'])
    
    if (error) throw error
    
    for (const user of users) {
      // Check if user already has context preferences
      const { data: existingPrefs } = await supabase
        .from('user_context_preferences')
        .select('id')
        .eq('user_id', user.id)
        .single()
      
      if (existingPrefs) {
        console.log(`  ⏭️  Context preferences already exist for ${user.email}`)
        continue
      }
      
      // Determine default context based on user role
      let defaultContext = 'location'
      if (user.role === 'ENTERPRISE_OWNER') {
        // Check if user has multiple locations
        const { data: orgCount } = await supabase
          .from('organizations')
          .select('id')
          .eq('owner_id', user.id)
        
        defaultContext = orgCount?.length > 0 ? 'organization' : 'location'
      } else if (user.role === 'BARBER') {
        defaultContext = 'resource'
      }
      
      // Create context preferences
      const { error: prefsError } = await supabase
        .from('user_context_preferences')
        .insert({
          user_id: user.id,
          default_context_level: defaultContext,
          auto_switch: user.role === 'ENTERPRISE_OWNER',
          preferences: {
            showContextBanner: true,
            rememberLastContext: true,
            autoElevateToOrg: user.role === 'ENTERPRISE_OWNER'
          }
        })
      
      if (prefsError) {
        console.error(`  ❌ Failed to create preferences for ${user.email}:`, prefsError)
        this.results.errors.push(`Context preferences failed for ${user.email}: ${prefsError.message}`)
        continue
      }
      
      console.log(`  ✅ Created context preferences for ${user.email} (default: ${defaultContext})`)
      this.results.contextPreferencesCreated++
    }
  }

  async validateMigration() {
    console.log('📋 Step 5: Validating migration...')
    
    // Validate organizations have barbershops
    const { data: orgsWithoutShops } = await supabase
      .from('organizations')
      .select('id, name')
      .not('barbershops', 'any', true)
    
    if (orgsWithoutShops?.length > 0) {
      console.warn(`  ⚠️  ${orgsWithoutShops.length} organizations have no linked barbershops`)
    }
    
    // Validate enterprise users have organizations
    const { data: enterpriseWithoutOrgs } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('role', 'ENTERPRISE_OWNER')
      .not('organizations', 'any', true)
    
    if (enterpriseWithoutOrgs?.length > 0) {
      console.warn(`  ⚠️  ${enterpriseWithoutOrgs.length} enterprise users have no organizations`)
    }
    
    console.log('  ✅ Migration validation completed')
  }

  printResults() {
    console.log('\n📊 Migration Results:')
    console.log(`  Organizations created: ${this.results.organizationsCreated}`)
    console.log(`  Barbershops linked: ${this.results.barbershopsLinked}`)
    console.log(`  Users updated: ${this.results.usersUpdated}`)
    console.log(`  Context preferences created: ${this.results.contextPreferencesCreated}`)
    
    if (this.results.errors.length > 0) {
      console.log(`  Errors encountered: ${this.results.errors.length}`)
      this.results.errors.forEach(error => console.log(`    - ${error}`))
    }
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const migration = new UnifiedContextMigration()
  migration.run()
    .then(() => {
      console.log('Migration completed successfully!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('Migration failed:', error)
      process.exit(1)
    })
}

export default UnifiedContextMigration