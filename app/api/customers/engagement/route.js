import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const body = await request.json()
    const { customerId, type, templateUsed, timestamp } = body

    // For now, store engagement data in a JSON field in customers table
    // This works without needing new tables
    const { data: customer, error: fetchError } = await supabase
      .from('customers')
      .select('engagement_history')
      .eq('id', customerId)
      .single()

    if (fetchError) {
      console.error('Error fetching customer:', fetchError)
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      )
    }

    // Get existing engagement history or create new array
    const engagementHistory = customer.engagement_history || []
    
    // Add new engagement
    engagementHistory.push({
      type,
      templateUsed,
      timestamp,
      id: `eng-${Date.now()}`
    })

    // Keep only last 50 engagements
    const recentEngagements = engagementHistory.slice(-50)

    // Update customer with new engagement history
    const { data: updatedCustomer, error: updateError } = await supabase
      .from('customers')
      .update({
        engagement_history: recentEngagements,
        last_engagement: timestamp,
        engagement_count: recentEngagements.length
      })
      .eq('id', customerId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating customer engagement:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to update engagement' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      engagement: {
        customerId,
        type,
        templateUsed,
        timestamp,
        totalEngagements: recentEngagements.length
      }
    })

  } catch (error) {
    console.error('Engagement API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to track engagement'
      },
      { status: 500 }
    )
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customerId')

    if (!customerId) {
      return NextResponse.json(
        { success: false, error: 'Customer ID is required' },
        { status: 400 }
      )
    }

    const { data: customer, error } = await supabase
      .from('customers')
      .select('engagement_history, last_engagement, engagement_count')
      .eq('id', customerId)
      .single()

    if (error) {
      console.error('Error fetching engagement history:', error)
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      engagements: customer.engagement_history || [],
      lastEngagement: customer.last_engagement,
      totalCount: customer.engagement_count || 0
    })

  } catch (error) {
    console.error('Get engagement API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch engagement history'
      },
      { status: 500 }
    )
  }
}