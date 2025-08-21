import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Use service role key to bypass RLS for testing
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
    
    // Fetch all customers for the test barbershop
    const { data: customers, error } = await supabase
      .from('customers')
      .select('*')
      .eq('shop_id', 'c6261c6d-08e7-4e5f-89c3-ad3f3529caed')
      .eq('is_active', true)
      .order('name')
    
    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      message: `Successfully retrieved ${customers.length} customers`,
      customers: customers,
      testInfo: {
        barbershopId: 'c6261c6d-08e7-4e5f-89c3-ad3f3529caed',
        totalFound: customers.length,
        hasVipCustomers: customers.some(c => c.vip_status),
        averageVisits: customers.reduce((sum, c) => sum + (c.total_visits || 0), 0) / customers.length || 0,
        totalRevenue: customers.reduce((sum, c) => sum + parseFloat(c.total_spent || 0), 0)
      }
    })
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}