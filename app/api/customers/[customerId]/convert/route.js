import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

export async function PUT(request, { params }) {
  try {
    const { customerId } = params
    const body = await request.json()
    
    if (!customerId) {
      return NextResponse.json(
        { error: 'Customer ID is required' },
        { status: 400 }
      )
    }

    console.log('[Convert Customer] Marking customer', customerId, 'as converted')

    // Update customer to mark as converted
    const updateData = {
      walk_in_converted: true,
      converted_date: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...body
    }

    const { data, error } = await supabase
      .from('customers')
      .update(updateData)
      .eq('id', customerId)
      .select()
      .single()

    if (error) {
      // If the marketing fields don't exist, try a simpler update
      console.warn('[Convert Customer] Marketing fields update failed, trying fallback:', error)
      
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('customers')
        .update({
          notes: `${data?.notes || ''}\n\nConverted from walk-in customer on ${new Date().toLocaleDateString()}`.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', customerId)
        .select()
        .single()

      if (fallbackError) {
        console.error('[Convert Customer] Fallback update failed:', fallbackError)
        throw fallbackError
      }

      console.log('[Convert Customer] Successfully updated customer (fallback mode)')
      
      return NextResponse.json({
        success: true,
        customer: fallbackData,
        fallback_mode: true,
        message: 'Customer marked as converted (noted in comments)'
      })
    }

    console.log('[Convert Customer] Successfully updated customer')

    // Optional: Create a record in a conversion tracking table if it exists
    try {
      await supabase
        .from('customer_conversions')
        .insert({
          customer_id: customerId,
          conversion_type: 'walk_in_to_regular',
          conversion_date: new Date().toISOString(),
          created_at: new Date().toISOString()
        })
    } catch (conversionError) {
      // Ignore if conversion tracking table doesn't exist
      console.log('[Convert Customer] Conversion tracking table not available')
    }

    return NextResponse.json({
      success: true,
      customer: data,
      message: 'Customer successfully marked as converted'
    })

  } catch (error) {
    console.error('[Convert Customer] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update customer conversion status' },
      { status: 500 }
    )
  }
}