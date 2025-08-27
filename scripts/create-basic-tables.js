#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const envPath = join(__dirname, '../.env.local')
const envContent = readFileSync(envPath, 'utf8')
const envLines = envContent.split('\n')

envLines.forEach(line => {
  if (line.trim() && !line.startsWith('#')) {
    const [key, ...valueParts] = line.split('=')
    if (key && valueParts.length > 0) {
      process.env[key] = valueParts.join('=')
    }
  }
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function createBasicTables() {
  try {

    try {
      const { data, error } = await supabase
        .from('barbershops')
        .insert([{
          name: 'Test Barbershop',
          slug: 'test-barbershop-' + Date.now()
        }])
        .select()
        
      if (error) {
        
      } else {
        
      }
    } catch (err) {
      
    }

    const { data: profiles } = await supabase.from('profiles').select('*').limit(3)

    return true
    
  } catch (error) {
    console.error('❌ Error:', error)
    return false
  }
}

createBasicTables()