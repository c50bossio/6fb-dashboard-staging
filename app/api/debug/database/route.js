import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function GET(request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'inspect'
    
    if (action === 'inspect') {
      // Check database structure and data
      const results = {}
      
      // Check barbershops table
      const { data: barbershops, error: barbershopsError } = await supabase
        .from('barbershops')
        .select('*')
        .limit(5)
      
      results.barbershops = {
        count: barbershops?.length || 0,
        data: barbershops || [],
        error: barbershopsError?.message || null
      }
      
      // Check barbershop_staff table
      const { data: staff, error: staffError } = await supabase
        .from('barbershop_staff')
        .select('*')
        .limit(5)
      
      results.barbershop_staff = {
        count: staff?.length || 0,
        data: staff || [],
        error: staffError?.message || null
      }
      
      // Check profiles table
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, shop_id, barbershop_id, role')
        .limit(5)
      
      results.profiles = {
        count: profiles?.length || 0,
        data: profiles || [],
        error: profilesError?.message || null
      }
      
      return NextResponse.json({ 
        success: true, 
        action: 'inspect',
        results 
      })
    }
    
    if (action === 'seed') {
      // RLS policies prevent inserts, so we'll simulate the context system with existing data
      const results = {}
      
      // Get the first barbershop
      const { data: barbershops, error: barbershopError } = await supabase
        .from('barbershops')
        .select('*')
        .limit(1)
        .single()
      
      results.existing_barbershop = {
        data: barbershops,
        error: barbershopError?.message || null
      }
      
      if (barbershops && !barbershopError) {
        // Simulate what the context system would generate
        const mockUser = {
          id: 'mock-user-123',
          email: 'test@barbershop.com',
          role: 'SHOP_OWNER'
        }
        
        const mockContexts = [
          {
            id: `${barbershops.id}-executive`,
            displayName: `📍 ${barbershops.name} - Executive Dashboard`,
            contextType: 'executive',
            locationId: barbershops.id,
            locationName: barbershops.name,
            locationAddress: `${barbershops.city}, ${barbershops.state}`,
            userId: mockUser.id,
            role: mockUser.role,
            primaryView: 'analytics',
            permissions: ['view_all', 'manage_all', 'financial_reports', 'cross_location']
          },
          {
            id: `${barbershops.id}-manager`,
            displayName: `📍 ${barbershops.name} - Manager Dashboard`,
            contextType: 'manager',
            locationId: barbershops.id,
            locationName: barbershops.name,
            locationAddress: `${barbershops.city}, ${barbershops.state}`,
            userId: mockUser.id,
            role: mockUser.role,
            primaryView: 'shop-calendar',
            permissions: ['manage_staff', 'view_analytics', 'book_appointments', 'manage_schedules']
          },
          {
            id: `${barbershops.id}-booking`,
            displayName: `📍 ${barbershops.name} - Book Appointment`,
            contextType: 'booking',
            locationId: barbershops.id,
            locationName: barbershops.name,
            locationAddress: `${barbershops.city}, ${barbershops.state}`,
            userId: mockUser.id,
            role: mockUser.role,
            primaryView: 'book-appointment',
            permissions: ['book_appointments', 'view_availability']
          }
        ]
        
        results.mock_contexts = mockContexts
        results.context_count = mockContexts.length
      }
      
      return NextResponse.json({ 
        success: true, 
        action: 'seed',
        message: 'RLS policies prevent inserts, but contexts can be generated from existing barbershop data',
        results 
      })
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    
  } catch (error) {
    console.error('Database debug error:', error)
    return NextResponse.json({ 
      error: 'Database debug failed', 
      details: error.message 
    }, { status: 500 })
  }
}