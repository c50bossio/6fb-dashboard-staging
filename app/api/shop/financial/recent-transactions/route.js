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
        transactions: []
      })
    }

    // Get recent commission transactions
    const { data: transactions, error: transactionsError } = await supabase
      .from('commission_transactions')
      .select(`
        *,
        profiles:barber_id (
          id,
          email,
          full_name
        ),
        financial_arrangements!arrangement_id (
          type,
          commission_percentage
        )
      `)
      .eq('barbershop_id', shop.id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (transactionsError) {
      console.error('Error fetching commission transactions:', transactionsError)
      return NextResponse.json({
        transactions: []
      })
    }

    // Format the response
    const formattedTransactions = (transactions || []).map(transaction => ({
      ...transaction,
      barber_name: transaction.profiles?.full_name || transaction.profiles?.email || 'Unknown Barber',
      arrangement_details: transaction.financial_arrangements
    }))

    return NextResponse.json({
      transactions: formattedTransactions
    })

  } catch (error) {
    console.error('Error in recent transactions API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}