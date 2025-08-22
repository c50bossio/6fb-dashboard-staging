import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET(request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    // Mock data for development
    const mockWebsiteData = {
      domains: [
        {
          id: 1,
          domain: 'shop1.bookedbarber.com',
          location: 'Downtown Location',
          ssl: true,
          status: 'active',
          analytics: {
            visits: 12450,
            conversions: 423
          }
        },
        {
          id: 2,
          domain: 'shop2.bookedbarber.com',
          location: 'Uptown Location',
          ssl: true,
          status: 'active',
          analytics: {
            visits: 8920,
            conversions: 298
          }
        }
      ],
      templates: [
        { id: 1, name: 'Modern Barbershop', preview: '/templates/modern.jpg' },
        { id: 2, name: 'Classic Style', preview: '/templates/classic.jpg' },
        { id: 3, name: 'Urban Vibe', preview: '/templates/urban.jpg' }
      ],
      seo: {
        metaTitle: 'Premium Barbershop Services',
        metaDescription: 'Book your appointment at our award-winning barbershops',
        keywords: ['barbershop', 'haircut', 'grooming', 'beard trim']
      }
    }

    // If organization exists, try to get real data
    if (profile?.organization_id) {
      const { data: websites } = await supabase
        .from('enterprise_websites')
        .select('*')
        .eq('organization_id', profile.organization_id)

      if (websites && websites.length > 0) {
        return NextResponse.json({
          domains: websites,
          templates: mockWebsiteData.templates,
          seo: mockWebsiteData.seo
        })
      }
    }

    // Return mock data for development
    return NextResponse.json(mockWebsiteData)

  } catch (error) {
    console.error('Error in enterprise website API:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const body = await request.json()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Handle different website management actions
    const { action, data } = body

    switch (action) {
      case 'updateDomain':
        // Update domain settings
        return NextResponse.json({ success: true, message: 'Domain updated' })
        
      case 'updateSEO':
        // Update SEO settings
        return NextResponse.json({ success: true, message: 'SEO settings updated' })
        
      case 'updateTemplate':
        // Update website template
        return NextResponse.json({ success: true, message: 'Template updated' })
        
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error) {
    console.error('Error in enterprise website POST:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}