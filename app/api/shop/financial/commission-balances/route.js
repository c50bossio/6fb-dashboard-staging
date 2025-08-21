import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request) {
  try {
    const supabase = createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's barbershop
    const { data: shop } = await supabase
      .from('barbershops')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (!shop) {
      return NextResponse.json({
        balances: []
      })
    }

    // Get commission balances with barber info
    const { data: balances, error: balancesError } = await supabase
      .from('barber_commission_balances')
      .select(`
        *,
        profiles:barber_id (
          id,
          email,
          full_name
        )
      `)
      .eq('barbershop_id', shop.id)
      .order('pending_amount', { ascending: false })

    if (balancesError) {
      console.error('Error fetching commission balances:', balancesError)
      return NextResponse.json({
        balances: []
      })
    }

    // Format the response
    const formattedBalances = (balances || []).map(balance => ({
      ...balance,
      barber_name: balance.profiles?.full_name || balance.profiles?.email || 'Unknown Barber'
    }))

    return NextResponse.json({
      balances: formattedBalances
    })

  } catch (error) {
    console.error('Error in commission balances API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}