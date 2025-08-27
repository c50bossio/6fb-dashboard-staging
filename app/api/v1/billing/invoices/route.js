import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import UsageTracker from '@/lib/usage-tracker'

export const runtime = 'nodejs'

/**
 * GET /api/v1/billing/invoices
 * Returns invoice history and details
 */
export async function GET(request) {
  try {
    // Get Supabase session
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name) {
            const cookie = cookieStore.get(name)
            return cookie?.value
          },
        },
      }
    )

    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const { searchParams } = new URL(request.url)
    const months = parseInt(searchParams.get('months')) || 12

    // Get billing history (which serves as invoice data)
    const history = await UsageTracker.getBillingHistory(userId, months)

    // Transform billing history into invoice format
    const invoices = history.map((period, index) => ({
      id: `inv_${period.period.replace('-', '')}_${userId.slice(-6)}`,
      invoiceNumber: `6FB-${period.period}-${String(index + 1).padStart(3, '0')}`,
      period: period.period,
      periodDate: period.periodDate,
      status: 'paid', // For historical periods, assume paid
      dueDate: new Date(period.periodDate.getFullYear(), period.periodDate.getMonth() + 1, 15).toISOString().split('T')[0],
      items: [
        ...(period.usage.ai > 0 ? [{
          description: 'AI Agent Tokens',
          quantity: period.usage.ai,
          unitPrice: 0.04,
          total: period.costs.ai
        }] : []),
        ...(period.usage.sms > 0 ? [{
          description: 'SMS Messages',
          quantity: period.usage.sms,
          unitPrice: 0.01,
          total: period.costs.sms
        }] : []),
        ...(period.usage.email > 0 ? [{
          description: 'Email Messages',
          quantity: period.usage.email,
          unitPrice: 0.001,
          total: period.costs.email
        }] : []),
        ...(period.subscriptionFee > 0 ? [{
          description: 'Monthly Subscription',
          quantity: 1,
          unitPrice: period.subscriptionFee,
          total: period.subscriptionFee
        }] : [])
      ],
      subtotal: period.totalCost,
      subscriptionFee: period.subscriptionFee,
      total: period.grandTotal,
      currency: 'USD'
    }))

    // Get current month's "pending" invoice
    const currentUsage = await UsageTracker.getCurrentUsage(userId)
    const currentInvoice = {
      id: `inv_${currentUsage.period.replace('-', '')}_${userId.slice(-6)}_pending`,
      invoiceNumber: `6FB-${currentUsage.period}-PENDING`,
      period: currentUsage.period,
      periodDate: new Date(),
      status: 'pending',
      dueDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 15).toISOString().split('T')[0],
      items: [
        ...(currentUsage.usage.ai.tokens > 0 ? [{
          description: 'AI Agent Tokens (Current Period)',
          quantity: currentUsage.usage.ai.tokens,
          unitPrice: 0.04,
          total: currentUsage.usage.ai.cost
        }] : []),
        ...(currentUsage.usage.sms.messages > 0 ? [{
          description: 'SMS Messages (Current Period)',
          quantity: currentUsage.usage.sms.messages,
          unitPrice: 0.01,
          total: currentUsage.usage.sms.cost
        }] : []),
        ...(currentUsage.usage.email.sent > 0 ? [{
          description: 'Email Messages (Current Period)',
          quantity: currentUsage.usage.email.sent,
          unitPrice: 0.001,
          total: currentUsage.usage.email.cost
        }] : []),
        {
          description: 'Monthly Subscription (Current Period)',
          quantity: 1,
          unitPrice: currentUsage.totals.subscriptionFee,
          total: currentUsage.totals.subscriptionFee
        }
      ],
      subtotal: currentUsage.totals.cost,
      subscriptionFee: currentUsage.totals.subscriptionFee,
      total: currentUsage.totals.cost + currentUsage.totals.subscriptionFee,
      currency: 'USD'
    }

    return NextResponse.json({
      invoices: [currentInvoice, ...invoices],
      summary: {
        totalInvoices: invoices.length + 1,
        totalAmount: invoices.reduce((sum, inv) => sum + inv.total, 0) + currentInvoice.total,
        averageMonthlyBill: invoices.length > 0 ? 
          invoices.reduce((sum, inv) => sum + inv.total, 0) / invoices.length : 
          currentInvoice.total,
        lastPaidAmount: invoices.length > 0 ? invoices[0].total : 0
      }
    })

  } catch (error) {
    console.error('Error fetching invoices:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invoices', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/v1/billing/invoices
 * Generate or regenerate an invoice
 */
export async function POST(request) {
  try {
    // Get Supabase session
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name) {
            const cookie = cookieStore.get(name)
            return cookie?.value
          },
        },
      }
    )

    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const { period } = await request.json()

    if (!period) {
      return NextResponse.json(
        { error: 'Missing required field: period' },
        { status: 400 }
      )
    }

    // Get billing data for the specified period
    const history = await UsageTracker.getBillingHistory(userId, 12)
    const periodData = history.find(p => p.period === period)

    if (!periodData) {
      return NextResponse.json(
        { error: 'No billing data found for the specified period' },
        { status: 404 }
      )
    }

    // Generate invoice
    const invoice = {
      id: `inv_${period.replace('-', '')}_${userId.slice(-6)}`,
      invoiceNumber: `6FB-${period}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
      generatedAt: new Date().toISOString(),
      period: period,
      periodDate: periodData.periodDate,
      status: 'generated',
      dueDate: new Date(periodData.periodDate.getFullYear(), periodData.periodDate.getMonth() + 1, 15).toISOString().split('T')[0],
      items: [
        ...(periodData.usage.ai > 0 ? [{
          description: 'AI Agent Tokens',
          quantity: periodData.usage.ai,
          unitPrice: 0.04,
          total: periodData.costs.ai
        }] : []),
        ...(periodData.usage.sms > 0 ? [{
          description: 'SMS Messages',
          quantity: periodData.usage.sms,
          unitPrice: 0.01,
          total: periodData.costs.sms
        }] : []),
        ...(periodData.usage.email > 0 ? [{
          description: 'Email Messages',
          quantity: periodData.usage.email,
          unitPrice: 0.001,
          total: periodData.costs.email
        }] : []),
        {
          description: 'Monthly Subscription',
          quantity: 1,
          unitPrice: periodData.subscriptionFee,
          total: periodData.subscriptionFee
        }
      ],
      subtotal: periodData.totalCost,
      subscriptionFee: periodData.subscriptionFee,
      total: periodData.grandTotal,
      currency: 'USD'
    }

    return NextResponse.json({
      success: true,
      invoice
    })

  } catch (error) {
    console.error('Error generating invoice:', error)
    return NextResponse.json(
      { error: 'Failed to generate invoice', details: error.message },
      { status: 500 }
    )
  }
}