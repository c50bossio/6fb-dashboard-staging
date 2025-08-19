import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
export const runtime = 'edge'

export async function POST() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ 
        success: false, 
        message: 'Missing Supabase configuration' 
      }, { status: 500 })
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: existingTable, error: checkError } = await supabase
      .from('booking_links')
      .select('id')
      .limit(1)

    if (!checkError) {
      return NextResponse.json({ 
        success: true, 
        message: 'Database tables already exist',
        tablesExist: true 
      })
    }

    
    return NextResponse.json({ 
      success: false,
      message: 'Database tables do not exist. Please run the SQL manually in Supabase Dashboard.',
      tablesExist: false,
      instructions: {
        step1: 'Go to your Supabase Dashboard',
        step2: 'Navigate to SQL Editor',
        step3: 'Copy and paste the SQL from create-booking-tables.sql',
        step4: 'Click Run to execute the SQL',
        sqlFile: '/create-booking-tables.sql'
      }
    })

  } catch (error) {
    console.error('Database setup error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      instructions: 'Please run the SQL manually in Supabase Dashboard'
    }, { status: 500 })
  }
}