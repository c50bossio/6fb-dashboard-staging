import { createServerComponentClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const cookieStore = cookies()
    const supabase = createServerComponentClient({ cookies: () => cookieStore })

    // Check if tables already exist
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

    // If tables don't exist, they need to be created via Supabase Dashboard
    // because we can't execute CREATE TABLE via the Supabase client directly
    
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