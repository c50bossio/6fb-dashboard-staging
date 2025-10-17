/**
 * Apply Performance Indexes to Supabase Database
 * Adds strategic indexes to optimize analytics and dashboard queries
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config()

async function applyPerformanceIndexes() {

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  try {
    const sqlContent = fs.readFileSync(path.join(__dirname, '../database/migrations/006_performance_indexes.sql'), 'utf8')
    
    const sqlCommands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--') && !cmd.startsWith('COMMENT'))

    let successCount = 0
    let errorCount = 0

    for (let i = 0; i < sqlCommands.length; i++) {
      const command = sqlCommands[i]
      
      if (command.startsWith('--') || command.trim() === '') {
        continue
      }

      try {
        
        }${command.length > 80 ? '...' : ''}`)
        
        const { error } = await supabase.rpc('exec_sql', {
          sql_query: command + ';'
        })
        
        if (error) {
          
          errorCount++
        } else {
          
          successCount++
        }
        
        await new Promise(resolve => setTimeout(resolve, 100))
        
      } catch (err) {
        
        errorCount++
      }
    }

    if (successCount > 0) {

      const startTime = Date.now()
      
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('customer_id, start_time, price, service_name')
        .gte('start_time', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .limit(100)
      
      const queryTime = Date.now() - startTime
      
      if (bookingsError) {
        
      } else {
        `)
        
      }
    }
    
  } catch (error) {
    console.error('❌ Failed to apply performance indexes:', error)
    console.error('Details:', error.message)
  }
}

if (require.main === module) {
  applyPerformanceIndexes().catch(console.error)
}

module.exports = { applyPerformanceIndexes }