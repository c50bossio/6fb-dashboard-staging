import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Query all barbershops
    const { data: barbershops, error: barbershopsError } = await supabase
      .from('barbershops')
      .select('id, name, owner_id, organization_id, created_at')
      .order('created_at', { ascending: false })

    if (barbershopsError) {
      console.error('Barbershops query error:', barbershopsError)
    }

    // Query all user profiles 
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, barbershop_id, barberbarbershop_id')

    if (profilesError) {
      console.error('Profiles query error:', profilesError)
    }

    // Query organizations
    const { data: organizations, error: organizationsError } = await supabase
      .from('organizations')
      .select('id, name, created_at')
      .order('created_at', { ascending: false })

    if (organizationsError) {
      console.error('Organizations query error:', organizationsError)
    }

    return NextResponse.json({
      barbershops: barbershops || [],
      profiles: profiles || [],  
      organizations: organizations || [],
      errors: {
        barbershops: barbershopsError?.message || null,
        profiles: profilesError?.message || null,
        organizations: organizationsError?.message || null
      }
    })

  } catch (error) {
    console.error('Database state query error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}