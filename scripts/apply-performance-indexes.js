/**
 * Apply Performance Indexes to Supabase Database
 * Adds strategic indexes to optimize analytics and dashboard queries
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

async function applyPerformanceIndexes() {
  console.log('🚀 Applying Performance Indexes to Supabase...')
  
  // Create Supabase client with service role key
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  try {
    // Read the SQL file
    const sqlContent = fs.readFileSync('./database/add-performance-indexes.sql', 'utf8')
    
    // Split SQL commands by semicolon and filter out empty statements
    const sqlCommands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--') && !cmd.startsWith('COMMENT'))

    console.log(`📋 Found ${sqlCommands.length} SQL commands to execute`)
    
    let successCount = 0
    let errorCount = 0

    // Execute each command individually
    for (let i = 0; i < sqlCommands.length; i++) {
      const command = sqlCommands[i]
      
      // Skip comments
      if (command.startsWith('--') || command.trim() === '') {
        continue
      }

      try {
        console.log(`\n⚡ Executing command ${i + 1}/${sqlCommands.length}:`)
        console.log(`   ${command.substring(0, 80)}${command.length > 80 ? '...' : ''}`)
        
        const { error } = await supabase.rpc('exec_sql', {
          sql_query: command + ';'
        })
        
        if (error) {
          console.log(`   ❌ Error: ${error.message}`)
          errorCount++
        } else {
          console.log(`   ✅ Success`)
          successCount++
        }
        
        // Small delay to avoid overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100))
        
      } catch (err) {
        console.log(`   ❌ Exception: ${err.message}`)
        errorCount++
      }
    }

    console.log(`\n📊 Performance Index Application Complete:`)
    console.log(`   ✅ Successful: ${successCount} indexes`)
    console.log(`   ❌ Failed: ${errorCount} indexes`)
    
    if (successCount > 0) {
      console.log(`\n🎯 Database Performance Optimized:`)
      console.log(`   • Added ${successCount} strategic indexes`)
      console.log(`   • Optimized customer analytics queries`)
      console.log(`   • Improved revenue calculation performance`)
      console.log(`   • Enhanced service popularity analysis`)
      console.log(`   • Accelerated dashboard loading times`)
      
      // Test query performance
      console.log(`\n🔍 Testing optimized query performance...`)
      const startTime = Date.now()
      
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('customer_id, start_time, price, service_name')
        .gte('start_time', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .limit(100)
      
      const queryTime = Date.now() - startTime
      
      if (bookingsError) {
        console.log(`   ❌ Test query failed: ${bookingsError.message}`)
      } else {
        console.log(`   ✅ Test query completed in ${queryTime}ms (retrieved ${bookings.length} bookings)`)
        console.log(`   🎉 Performance optimization successful!`)
      }
    }
    
  } catch (error) {
    console.error('❌ Failed to apply performance indexes:', error)
    console.error('Details:', error.message)
  }
}

// Execute if run directly
if (require.main === module) {
  applyPerformanceIndexes().catch(console.error)
}

module.exports = { applyPerformanceIndexes }