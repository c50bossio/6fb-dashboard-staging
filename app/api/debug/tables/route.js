import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - Check database table structure
export async function GET(request) {
  try {
    const supabase = createClient()

    // Check if barbershops table exists and list columns
    const { data: tables, error: tablesError } = await supabase
      .rpc('exec_sql', { 
        sql: `
          SELECT table_name, column_name, data_type, is_nullable
          FROM information_schema.columns 
          WHERE table_name IN ('barbershops', 'users') 
          ORDER BY table_name, ordinal_position;
        `
      })

    if (tablesError) {
      console.error('Error checking tables:', tablesError)
    }

    // Also try to count records
    const { data: barbershopCount } = await supabase
      .from('barbershops')
      .select('*', { count: 'exact', head: true })

    const { data: userCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })

    return NextResponse.json({
      tables: tables || [],
      counts: {
        barbershops: barbershopCount?.count || 'error',
        users: userCount?.count || 'error'
      }
    })

  } catch (error) {
    console.error('Error in GET /api/debug/tables:', error)
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    )
  }
}