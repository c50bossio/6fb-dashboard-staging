#!/usr/bin/env node

/**
 * Examine the existing bookings table structure
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://dfhqjdoydihajmjxniee.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwODcwMTAsImV4cCI6MjA2OTY2MzAxMH0.TUYnEBzpB2LQaGLIXg5wtvJHyyhFD2QAOMdY_B-V1fI'

const supabase = createClient(supabaseUrl, supabaseKey)

async function examineBookingsTable() {
  
  )
  
  try {
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('*')
      .limit(2)
    
    if (error) {
      console.error('Error fetching bookings:', error.message)
      return
    }

    if (bookings && bookings.length > 0) {
      
      const columns = Object.keys(bookings[0])
      columns.forEach(col => {
        const value = bookings[0][col]
        const type = value === null ? 'null' : typeof value
        } (${type})`)
      })
      
      :')
      )
    } else {

      const { data, error: schemaError } = await supabase
        .from('bookings')
        .select('*')
        .limit(0)
      
      if (!schemaError) {
        
      }
    }

    const { count, error: countError } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
    
    if (!countError) {
      
    }

    const requiredFields = [
      'barbershop_id',
      'barber_id', 
      'customer_id',
      'service_name',
      'start_time',
      'end_time',
      'status',
      'service_price'
    ]

    if (bookings && bookings.length > 0) {
      const existingColumns = Object.keys(bookings[0])
      requiredFields.forEach(field => {
        if (existingColumns.includes(field)) {
          
        } else {
          const similar = existingColumns.filter(col => 
            col.toLowerCase().includes(field.toLowerCase().replace('_', '')) ||
            field.toLowerCase().includes(col.toLowerCase().replace('_', ''))
          )
          if (similar.length > 0) {
            })`)
          } else {
            
          }
        }
      })
    }

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

examineBookingsTable()