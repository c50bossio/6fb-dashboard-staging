import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request) {
  try {
    const supabase = await createClient()
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, role, barbershop_id, barbershop_id')
      .eq('id', user.id)
      .single()
    
    if (!profile) {
      return NextResponse.json({ 
        resources: [{
          id: user.id,
          title: 'Default User',
          eventColor: '#10b981'
        }],
        message: 'No profile found, using default' 
      })
    }

    // Determine barbershop ID
    let barbershopId = profile.shop_id || profile.barbershop_id
    
    // If no direct shop, check if user is staff
    if (!barbershopId) {
      const { data: staffAssignment } = await supabase
        .from('barbershop_staff')
        .select('barbershop_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()
      
      if (staffAssignment) {
        barbershopId = staffAssignment.barbershop_id
      }
    }

    let resources = []

    // If we have a barbershop, get all barbers/staff
    if (barbershopId) {
      // Get all staff members for this barbershop
      const { data: staffMembers } = await supabase
        .from('barbershop_staff')
        .select(`
          user_id,
          role,
          is_active,
          profiles!inner (
            id,
            full_name,
            email
          )
        `)
        .eq('barbershop_id', barbershopId)
        .eq('is_active', true)

      if (staffMembers && staffMembers.length > 0) {
        resources = staffMembers.map((staff, index) => ({
          id: staff.profiles.id,
          title: staff.profiles.full_name || staff.profiles.email || `Barber ${index + 1}`,
          eventColor: getBarberColor(index),
          role: staff.role,
          email: staff.profiles.email
        }))
      }

      // Also check if the shop owner should be included
      const { data: barbershop } = await supabase
        .from('barbershops')
        .select('owner_id')
        .eq('id', barbershopId)
        .single()

      if (barbershop && barbershop.owner_id) {
        // Get owner profile
        const { data: ownerProfile } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .eq('id', barbershop.owner_id)
          .single()

        if (ownerProfile && !resources.find(r => r.id === ownerProfile.id)) {
          resources.push({
            id: ownerProfile.id,
            title: ownerProfile.full_name || ownerProfile.email || 'Shop Owner',
            eventColor: '#6366f1', // Purple for owner
            role: 'owner',
            email: ownerProfile.email
          })
        }
      }
    }

    // If still no resources, add the current user as a default resource
    if (resources.length === 0) {
      resources.push({
        id: profile.id,
        title: profile.full_name || user.email || 'Me',
        eventColor: '#10b981', // Default green
        role: profile.role || 'barber',
        email: user.email
      })
    }

    return NextResponse.json({
      resources,
      barbershopId,
      profile: {
        id: profile.id,
        full_name: profile.full_name,
        role: profile.role
      }
    })

  } catch (error) {
    console.error('Error fetching calendar resources:', error)
    
    // Return a default resource on error
    return NextResponse.json({ 
      resources: [{
        id: 'default',
        title: 'Default Resource',
        eventColor: '#10b981'
      }],
      error: 'Failed to fetch resources'
    }, { status: 200 }) // Return 200 to prevent calendar from breaking
  }
}

// Helper function to get consistent colors for barbers
function getBarberColor(index) {
  const colors = [
    '#10b981', // Green
    '#3b82f6', // Blue
    '#f59e0b', // Amber
    '#8b5cf6', // Purple
    '#ef4444', // Red
    '#ec4899', // Pink
    '#14b8a6', // Teal
    '#f97316', // Orange
  ]
  
  return colors[index % colors.length]
}