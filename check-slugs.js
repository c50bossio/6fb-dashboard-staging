#!/usr/bin/env node

import 'dotenv/config'
import supabaseQuery from './lib/supabase-query.js'

async function checkSlugs() {
  console.log('🔍 Checking barbershop slugs...\n')
  
  const result = await supabaseQuery.queryTable('barbershops', { 
    select: '*', 
    limit: 10 
  })
  
  if (result.error) {
    console.error('Error:', result.error.message)
  } else {
    console.log('📊 Available barbershops:')
    result.data?.forEach(shop => {
      console.log(`  - ${shop.name} (slug: ${shop.slug || 'no-slug'})`)
    })
  }
}

checkSlugs().catch(console.error)