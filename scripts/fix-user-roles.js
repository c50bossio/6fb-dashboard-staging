#!/usr/bin/env node

/**
 * Fix user roles in the database
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

async function fixRoles() {
  console.log('🔧 Fixing user roles...\n')
  
  const roleUpdates = [
    { email: 'owner@premiumcuts.com', role: 'SHOP_OWNER', full_name: 'Michael Johnson' },
    { email: 'john@premiumcuts.com', role: 'BARBER', full_name: 'John Martinez' },
    { email: 'sarah@premiumcuts.com', role: 'BARBER', full_name: 'Sarah Williams' },
    { email: 'mike@premiumcuts.com', role: 'BARBER', full_name: 'Mike Rodriguez' },
    { email: 'testclient@example.com', role: 'CLIENT', full_name: 'James Smith' }
  ]
  
  for (const update of roleUpdates) {
    const { data, error } = await supabase
      .from('profiles')
      .update({ 
        role: update.role,
        full_name: update.full_name
      })
      .eq('email', update.email)
      .select()
    
    if (error) {
      console.log(`❌ Failed to update ${update.email}:`, error.message)
    } else if (data?.length > 0) {
      console.log(`✅ Updated ${update.email} to role: ${update.role}`)
    } else {
      console.log(`⚠️  No user found with email: ${update.email}`)
    }
  }
  
  console.log('\n🔗 Linking shop owner to barbershop...')
  
  const { data: owner } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', 'owner@premiumcuts.com')
    .single()
  
  if (owner) {
    const { error: shopError } = await supabase
      .from('barbershops')
      .update({ owner_id: owner.id })
      .eq('name', 'Elite Cuts Barbershop')
    
    if (!shopError) {
      console.log('✅ Linked shop owner to barbershop')
    } else {
      console.log('❌ Failed to link shop owner:', shopError.message)
    }
    
    await supabase
      .from('barbershops')
      .update({ owner_id: owner.id })
      .eq('name', 'Premium Cuts Barbershop')
  }
  
  console.log('\n✅ Role fixes complete!')
  console.log('\nYou can now log in with:')
  console.log('  Shop Owner: owner@premiumcuts.com / TestPassword123!')
  console.log('  Barber: john@premiumcuts.com / TestPassword123!')
}

fixRoles().catch(console.error)