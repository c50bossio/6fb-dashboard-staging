import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
export const runtime = 'edge'

export async function GET(request) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    
    const isDevelopment = process.env.NODE_ENV === 'development'
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (!isDevelopment && (authError || !user)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    let userId = user?.id
    if (isDevelopment && !userId) {
      const { data: devUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'SHOP_OWNER')
        .limit(1)
        .single()
      userId = devUser?.id
    }
    
    let profile = null
    if (userId) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()
      profile = profileData
    }
    
    if (!isDevelopment && (!profile || !['SHOP_OWNER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN'].includes(profile.role))) {
      return NextResponse.json(
        { error: 'Forbidden - Must be a shop owner or admin' },
        { status: 403 }
      )
    }
    
    const { data: shop } = await supabase
      .from('barbershops')
      .select('id')
      .eq('owner_id', userId)
      .single()
    
    if (!shop) {
      return NextResponse.json({
        arrangements: [],
        metrics: {
          totalCommissions: 0,
          totalBoothRent: 0,
          pendingPayouts: 0,
          completedPayouts: 0
        }
      })
    }
    
    const { data: arrangements, error: arrangementsError } = await supabase
      .from('financial_arrangements')
      .select(`
        *,
        profiles:barber_id (
          id,
          email,
          full_name
        )
      `)
      .eq('barbershop_id', shop.id)
      .order('created_at', { ascending: false })
    
    if (arrangementsError) {
      console.error('Error fetching arrangements:', arrangementsError)
      return NextResponse.json({
        arrangements: [],
        metrics: {
          totalCommissions: 0,
          totalBoothRent: 0,
          pendingPayouts: 0,
          completedPayouts: 0
        }
      })
    }
    
    const formattedArrangements = (arrangements || []).map(arr => ({
      ...arr,
      barber_name: arr.profiles?.full_name || 'Unknown Barber',
      barber_email: arr.profiles?.email || ''
    }))
    
    const activeArrangements = formattedArrangements.filter(a => a.is_active)
    
    const metrics = {
      totalCommissions: activeArrangements
        .filter(a => a.type === 'commission' || a.type === 'hybrid')
        .length * 1500, // Mock average monthly commission
      totalBoothRent: activeArrangements
        .filter(a => a.type === 'booth_rent' || a.type === 'hybrid')
        .reduce((sum, a) => {
          if (a.booth_rent_frequency === 'monthly') return sum + (a.booth_rent_amount || 0)
          if (a.booth_rent_frequency === 'weekly') return sum + ((a.booth_rent_amount || 0) * 4)
          if (a.booth_rent_frequency === 'daily') return sum + ((a.booth_rent_amount || 0) * 30)
          return sum
        }, 0),
      pendingPayouts: 2450, // Mock pending amount
      completedPayouts: 18500 // Mock completed amount
    }
    
    return NextResponse.json({
      arrangements: formattedArrangements,
      metrics
    })
    
  } catch (error) {
    console.error('Error in /api/shop/financial/arrangements:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    
    const isDevelopment = process.env.NODE_ENV === 'development'
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (!isDevelopment && (authError || !user)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const arrangementData = await request.json()
    
    let userId = user?.id
    if (isDevelopment && !userId) {
      const { data: devUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'SHOP_OWNER')
        .limit(1)
        .single()
      userId = devUser?.id
    }
    
    let profile = null
    if (userId) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()
      profile = profileData
    }
    
    if (!isDevelopment && (!profile || !['SHOP_OWNER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN'].includes(profile.role))) {
      return NextResponse.json(
        { error: 'Forbidden - Must be a shop owner or admin' },
        { status: 403 }
      )
    }
    
    const { data: shop } = await supabase
      .from('barbershops')
      .select('id')
      .eq('owner_id', userId)
      .single()
    
    if (!shop) {
      return NextResponse.json(
        { error: 'No shop found for this user' },
        { status: 404 }
      )
    }
    
    const arrangementToInsert = {
      barbershop_id: shop.id,
      barber_id: arrangementData.barber_id,
      type: arrangementData.type,
      commission_percentage: arrangementData.type !== 'booth_rent' ? arrangementData.commission_percentage : null,
      booth_rent_amount: arrangementData.type !== 'commission' ? arrangementData.booth_rent_amount : null,
      booth_rent_frequency: arrangementData.type !== 'commission' ? arrangementData.booth_rent_frequency : null,
      product_commission_percentage: arrangementData.product_commission_percentage || 10,
      payment_method: arrangementData.payment_method,
      payment_frequency: arrangementData.payment_frequency,
      is_active: arrangementData.is_active !== false,
      start_date: new Date().toISOString().split('T')[0]
    }
    
    const { data: existing } = await supabase
      .from('financial_arrangements')
      .select('id')
      .eq('barbershop_id', shop.id)
      .eq('barber_id', arrangementData.barber_id)
      .eq('is_active', true)
      .single()
    
    if (existing) {
      await supabase
        .from('financial_arrangements')
        .update({ 
          is_active: false,
          end_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', existing.id)
    }
    
    const { data: newArrangement, error: insertError } = await supabase
      .from('financial_arrangements')
      .insert(arrangementToInsert)
      .select()
      .single()
    
    if (insertError) {
      console.error('Error inserting arrangement:', insertError)
      return NextResponse.json(
        { error: 'Failed to create arrangement' },
        { status: 500 }
      )
    }
    
    return NextResponse.json(newArrangement)
    
  } catch (error) {
    console.error('Error in POST /api/shop/financial/arrangements:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}