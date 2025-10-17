#!/usr/bin/env node

/**
 * Database Setup Script for Booking Links System
 * 
 * This script applies the booking-links-schema.sql to your Supabase database
 * and validates that all tables and functions are working correctly.
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

require('dotenv').config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:')
  console.error('  - NEXT_PUBLIC_SUPABASE_URL')
  console.error('  - SUPABASE_SERVICE_ROLE_KEY')
  console.error('\nPlease check your .env file.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function setupDatabase() {

  try {
    const schemaPath = path.join(__dirname, '../database/booking-links-schema.sql')
    
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found: ${schemaPath}`)
    }

    const schemaSQL = fs.readFileSync(schemaPath, 'utf8')

    const tables = ['booking_links', 'link_analytics', 'qr_codes', 'link_shares', 'booking_attributions']
    const tableResults = {}
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('count', { count: 'exact', head: true })
        
        if (error && error.code === '42P01') {
          tableResults[table] = { exists: false, error: 'Table does not exist' }
        } else if (error) {
          tableResults[table] = { exists: false, error: error.message }
        } else {
          tableResults[table] = { exists: true, count: data?.length || 0 }
        }
      } catch (err) {
        tableResults[table] = { exists: false, error: err.message }
      }
    }

    )
    
    let allTablesExist = true
    for (const [table, result] of Object.entries(tableResults)) {
      const status = result.exists ? '✅' : '❌'
      const info = result.exists ? `(${result.count} rows)` : `- ${result.error}`
      } ${info}`)
      
      if (!result.exists) {
        allTablesExist = false
      }
    }

    if (allTablesExist) {

      try {
        const { data: users } = await supabase.auth.admin.listUsers()
        
        if (users && users.users.length > 0) {
          const testUserId = users.users[0].id

          const testLink = {
            barber_id: testUserId,
            name: 'Test Link - Setup Validation',
            url: `/book/${testUserId}?test=true`,
            services: JSON.stringify([
              { id: 1, name: 'Test Service', price: 25, duration: 30 }
            ]),
            time_slots: ['morning', 'afternoon'],
            duration: 30,
            custom_price: 25,
            active: true
          }

          const { data: createdLink, error: linkError } = await supabase
            .from('booking_links')
            .insert(testLink)
            .select()
            .single()

          if (linkError) {
            
          } else {

            const { error: analyticsError } = await supabase
              .from('link_analytics')
              .insert({
                link_id: createdLink.id,
                event_type: 'test',
                session_id: 'test-session',
                user_agent: 'Setup Script',
                ip_address: '127.0.0.1'
              })

            if (analyticsError) {
              
            } else {
              
            }

            await supabase.from('link_analytics').delete().eq('link_id', createdLink.id)
            await supabase.from('booking_links').delete().eq('id', createdLink.id)
            
          }
        } else {
          
        }
      } catch (testError) {
        
      }

    } else {

    }

  } catch (error) {
    console.error('\n❌ Setup failed:', error.message)
    console.error('\nStack trace:', error.stack)
    process.exit(1)
  }
}

setupDatabase().catch(console.error)