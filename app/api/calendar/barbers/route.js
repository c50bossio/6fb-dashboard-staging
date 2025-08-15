import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
export const runtime = 'edge'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request) {
  try {
    let { data: barbers, error } = await supabase
      .from('barbers')
      .select('*')
      .eq('is_active', true)
      .order('name')
    
    if (error) {
      console.log('Barbers table not found, trying profiles with barber role...')
      
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .in('role', ['barber', 'shop_owner', 'admin'])
        .limit(10)
      
      if (profileError) {
        console.error('Error fetching profiles:', profileError)
        return NextResponse.json({ 
          error: 'Failed to fetch barbers',
          details: profileError.message 
        }, { status: 500 })
      }
      
      barbers = profiles.map((profile, index) => ({
        id: profile.id,
        name: profile.full_name || profile.email || `Barber ${index + 1}`,
        email: profile.email,
        color: ['#10b981', '#546355', '#f59e0b', '#D4B878'][index % 4],
        active: true,
        role: profile.role
      }))
      
      return NextResponse.json({ barbers, source: 'profiles' })
    }
    
    const resources = barbers.map(barber => {
      let location = 'Downtown' // default
      if (barber.name && (barber.name.includes('Sarah') || barber.name.includes('Lisa'))) {
        location = 'Uptown'
      }
      
      return {
        id: barber.id,
        title: barber.name,
        eventColor: barber.color || '#546355',
        businessHours: barber.business_hours || { start: '09:00', end: '18:00' },
        extendedProps: {
          location: location,
          email: barber.email,
          phone: barber.phone,
          workingDays: barber.working_days || [1, 2, 3, 4, 5, 6]
        }
      }
    })
    
    return NextResponse.json({ 
      barbers: resources, 
      source: 'database',
      count: resources.length 
    })
    
  } catch (error) {
    console.error('Error fetching barbers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch barbers', details: error.message },
      { status: 500 }
    )
  }
}