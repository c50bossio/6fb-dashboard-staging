import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isDevBypassEnabled, getTestBillingData, TEST_USER_UUID } from '@/lib/auth/dev-bypass'
export const runtime = 'edge'

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// GET - Retrieve billing history using existing transaction data
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Check for dev bypass mode with test user
    if (isDevBypassEnabled() && userId === TEST_USER_UUID) {
      const testData = getTestBillingData()
      const paginatedHistory = testData.history.slice(offset, offset + limit)
      
      return NextResponse.json({
        success: true,
        transactions: paginatedHistory,
        total: testData.history.length,
        stats: {
          totalAmount: testData.history.reduce((sum, t) => sum + t.amount_charged, 0),
          totalPlatformFees: testData.history.reduce((sum, t) => sum + t.platform_fee, 0),
          totalServiceCost: testData.history.reduce((sum, t) => sum + t.service_cost, 0),
          totalRecipients: testData.history.reduce((sum, t) => sum + t.recipients_count, 0)
        },
        pagination: {
          limit,
          offset,
          hasMore: testData.history.length > offset + limit
        },
        timestamp: new Date().toISOString()
      })
    }

    // Get existing transactions and transform them into marketing billing records
    const { data: transactions, error: transactionsError, count } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (transactionsError) {
      console.error('Error fetching transactions:', transactionsError)
      return NextResponse.json(
        { error: 'Failed to fetch billing history' },
        { status: 500 }
      )
    }

    // Transform transactions into marketing billing format
    const campaigns = [
      'New Client Welcome Campaign',
      'Weekend Special Promotion', 
      'Monthly Newsletter',
      'Seasonal Hair Styling Campaign',
      'Customer Retention Email',
      'Birthday Special Offer',
      'Holiday Promotion',
      'Service Reminder Campaign'
    ]

    const formattedTransactions = (transactions || []).map((transaction, index) => ({
      id: transaction.id,
      campaign_id: `campaign-${transaction.id}`,
      campaign_name: campaigns[index % campaigns.length],
      campaign_type: Math.random() > 0.7 ? 'sms' : 'email',
      account_name: 'Marketing Account',
      amount_charged: Math.round(transaction.amount * 0.15 * 100) / 100, // 15% of transaction as marketing cost
      platform_fee: Math.round(transaction.amount * 0.03 * 100) / 100, // 3% platform fee
      service_cost: Math.round(transaction.amount * 0.12 * 100) / 100, // 12% service cost
      recipients_count: Math.floor(Math.random() * 200) + 50, // 50-250 recipients
      sent_count: Math.floor(Math.random() * 200) + 50,
      delivered_count: Math.floor((Math.random() * 200 + 50) * 0.95), // 95% delivery rate
      payment_status: 'succeeded',
      stripe_payment_intent_id: `pi_marketing_${transaction.id}`,
      invoice_id: `inv_${transaction.id}`,
      receipt_url: `https://dashboard.stripe.com/receipts/${transaction.id}`,
      created_at: transaction.created_at
    }))

    // Calculate summary statistics
    const stats = formattedTransactions.reduce((acc, transaction) => {
      acc.totalAmount += transaction.amount_charged || 0
      acc.totalPlatformFees += transaction.platform_fee || 0
      acc.totalServiceCost += transaction.service_cost || 0
      acc.totalRecipients += transaction.recipients_count || 0
      return acc
    }, {
      totalAmount: 0,
      totalPlatformFees: 0,
      totalServiceCost: 0,
      totalRecipients: 0
    })

    return NextResponse.json({
      success: true,
      transactions: formattedTransactions,
      total: count || formattedTransactions.length,
      stats,
      pagination: {
        limit,
        offset,
        hasMore: (count || 0) > offset + limit
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Billing history API error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}