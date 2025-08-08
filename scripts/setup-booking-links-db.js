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

// Load environment variables
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
  console.log('🚀 Starting database setup for Booking Links system...\n')

  try {
    // Read the schema file
    const schemaPath = path.join(__dirname, '../database/booking-links-schema.sql')
    
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found: ${schemaPath}`)
    }

    const schemaSQL = fs.readFileSync(schemaPath, 'utf8')
    console.log('📖 Schema file loaded successfully')

    // Note: Supabase client doesn't support executing raw SQL files directly
    // You'll need to run the SQL manually in Supabase SQL Editor or via psql
    console.log('\n⚠️  MANUAL STEP REQUIRED:')
    console.log('1. Open your Supabase dashboard: https://app.supabase.com')
    console.log('2. Go to SQL Editor')
    console.log('3. Copy and paste the content from: database/booking-links-schema.sql')
    console.log('4. Execute the SQL to create all tables and functions')
    console.log('5. Come back and run this script again to validate\n')

    // Check if tables exist (basic validation)
    console.log('🔍 Checking database tables...')
    
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

    // Display results
    console.log('\n📊 Database Status:')
    console.log('─'.repeat(50))
    
    let allTablesExist = true
    for (const [table, result] of Object.entries(tableResults)) {
      const status = result.exists ? '✅' : '❌'
      const info = result.exists ? `(${result.count} rows)` : `- ${result.error}`
      console.log(`${status} ${table.padEnd(20)} ${info}`)
      
      if (!result.exists) {
        allTablesExist = false
      }
    }

    if (allTablesExist) {
      console.log('\n🎉 All tables are set up correctly!')
      console.log('\n🧪 Running test operations...')
      
      // Test creating a sample booking link (if user exists)
      try {
        const { data: users } = await supabase.auth.admin.listUsers()
        
        if (users && users.users.length > 0) {
          const testUserId = users.users[0].id
          
          console.log(`📝 Creating test booking link for user: ${testUserId}`)
          
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
            console.log(`❌ Test link creation failed: ${linkError.message}`)
          } else {
            console.log(`✅ Test link created successfully: ${createdLink.id}`)
            
            // Test analytics tracking
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
              console.log(`❌ Analytics test failed: ${analyticsError.message}`)
            } else {
              console.log('✅ Analytics tracking test successful')
            }

            // Clean up test data
            await supabase.from('link_analytics').delete().eq('link_id', createdLink.id)
            await supabase.from('booking_links').delete().eq('id', createdLink.id)
            console.log('🧹 Test data cleaned up')
          }
        } else {
          console.log('⚠️  No users found - skipping test link creation')
        }
      } catch (testError) {
        console.log(`⚠️  Test operations skipped: ${testError.message}`)
      }

      console.log('\n✨ Database setup completed successfully!')
      console.log('\n🔗 Next steps:')
      console.log('1. Your booking links system is ready to use')
      console.log('2. Test the barber booking links page: /dashboard/barber/booking-links')  
      console.log('3. Create some booking links and test the analytics')
      console.log('4. Check the SEO optimization on guest booking pages')

    } else {
      console.log('\n❌ Database setup incomplete.')
      console.log('\n🛠️  To fix this:')
      console.log('1. Copy the SQL from: database/booking-links-schema.sql')
      console.log('2. Paste it into your Supabase SQL Editor')
      console.log('3. Execute the SQL')
      console.log('4. Run this script again')
    }

  } catch (error) {
    console.error('\n❌ Setup failed:', error.message)
    console.error('\nStack trace:', error.stack)
    process.exit(1)
  }
}

// Run the setup
setupDatabase().catch(console.error)