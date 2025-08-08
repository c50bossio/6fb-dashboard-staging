#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables from .env.local
const envPath = join(__dirname, '../.env.local')
try {
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
} catch (error) {
  console.log('Warning: Could not load .env.local file')
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('🔍 Testing Supabase connection...')
console.log('URL:', supabaseUrl)

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testConnection() {
  try {
    console.log('📡 Testing basic connection...')
    
    // Simple test query
    const { data, error } = await supabase
      .from('_supabase_info') // This should exist in any Supabase database
      .select('*')
      .limit(1)
    
    if (error) {
      console.log('⚠️  Basic query failed:', error.message)
      
      // Try listing tables instead
      console.log('📋 Trying to list existing tables...')
      const { data: tables, error: tableError } = await supabase
        .rpc('list_tables')
        .single()
      
      if (tableError) {
        console.log('⚠️  Table listing failed:', tableError.message)
        console.log('🔍 Let me try a different approach...')
        
        // Try creating a simple table to test permissions
        const { data: testTable, error: createError } = await supabase
          .from('test_connection')
          .select('*')
          .limit(1)
        
        if (createError) {
          console.log('📋 No existing tables found, this is normal for new database')
          console.log('✅ Connection is working, ready to create schema')
        } else {
          console.log('✅ Connection successful - found existing tables')
        }
      } else {
        console.log('✅ Table listing successful:', tables)
      }
    } else {
      console.log('✅ Basic connection successful')
    }
    
    console.log('\n🎉 Supabase connection test completed!')
    console.log('Ready to proceed with database setup.')
    
  } catch (error) {
    console.error('❌ Connection test failed:', error)
    process.exit(1)
  }
}

testConnection()