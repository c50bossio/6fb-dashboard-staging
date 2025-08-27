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
      
    } else if (data?.length > 0) {
      
    } else {
      
    }
  }

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
      
    } else {
      
    }
    
    await supabase
      .from('barbershops')
      .update({ owner_id: owner.id })
      .eq('name', 'Premium Cuts Barbershop')
  }

}

fixRoles().catch(console.error)