import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
export const runtime = 'edge'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const linkId = searchParams.get('linkId')

    if (!linkId) {
      return NextResponse.json(
        { success: false, error: 'Link ID is required' },
        { status: 400 }
      )
    }

    if (!supabase) {
      return NextResponse.json({
        success: true,
        data: {
          linkId,
          embedSettings: {
            theme: 'light',
            primaryColor: '#3B82F6',
            hideHeader: false,
            hideFooter: false,
            allowedDomains: [],
            trackingEnabled: true
          },
          embedStats: {
            totalViews: 0,
            lastEmbedded: null,
            activeEmbeds: 0
          }
        }
      })
    }

    const { data: link, error } = await supabase
      .from('booking_links')
      .select('id, embed_settings, embed_count, last_embedded_at')
      .eq('id', linkId)
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch embed settings' },
        { status: 500 }
      )
    }

    if (!link) {
      return NextResponse.json(
        { success: false, error: 'Booking link not found' },
        { status: 404 }
      )
    }

    const embedSettings = link.embed_settings || {
      theme: 'light',
      primaryColor: '#3B82F6',
      hideHeader: false,
      hideFooter: false,
      allowedDomains: [],
      trackingEnabled: true
    }

    return NextResponse.json({
      success: true,
      data: {
        linkId,
        embedSettings,
        embedStats: {
          totalViews: link.embed_count || 0,
          lastEmbedded: link.last_embedded_at,
          activeEmbeds: 0 // This would require real-time tracking
        }
      }
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { linkId, embedSettings, incrementView } = body

    if (!linkId) {
      return NextResponse.json(
        { success: false, error: 'Link ID is required' },
        { status: 400 }
      )
    }

    if (!supabase) {
      return NextResponse.json({
        success: true,
        message: 'Settings saved successfully (development mode)'
      })
    }

    const updates = {}
    
    if (embedSettings) {
      updates.embed_settings = embedSettings
    }
    
    if (incrementView) {
      const { data: currentLink } = await supabase
        .from('booking_links')
        .select('embed_count')
        .eq('id', linkId)
        .single()
      
      updates.embed_count = (currentLink?.embed_count || 0) + 1
      updates.last_embedded_at = new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('booking_links')
      .update(updates)
      .eq('id', linkId)
      .select()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to update embed settings' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: incrementView ? 'View tracked successfully' : 'Settings updated successfully',
      data
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request) {
  try {
    const body = await request.json()
    const { linkId, domain, action } = body

    if (!linkId || !domain || !action) {
      return NextResponse.json(
        { success: false, error: 'Link ID, domain, and action are required' },
        { status: 400 }
      )
    }

    if (!supabase) {
      return NextResponse.json({
        success: true,
        message: 'Domain settings updated (development mode)'
      })
    }

    const { data: link, error: fetchError } = await supabase
      .from('booking_links')
      .select('embed_settings')
      .eq('id', linkId)
      .single()

    if (fetchError) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch current settings' },
        { status: 500 }
      )
    }

    const embedSettings = link.embed_settings || { allowedDomains: [] }
    let allowedDomains = embedSettings.allowedDomains || []

    if (action === 'add' && !allowedDomains.includes(domain)) {
      allowedDomains.push(domain)
    } else if (action === 'remove') {
      allowedDomains = allowedDomains.filter(d => d !== domain)
    }

    embedSettings.allowedDomains = allowedDomains

    const { error: updateError } = await supabase
      .from('booking_links')
      .update({ embed_settings: embedSettings })
      .eq('id', linkId)

    if (updateError) {
      return NextResponse.json(
        { success: false, error: 'Failed to update domain settings' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Domain ${action}ed successfully`,
      allowedDomains
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json()
    const { linkId, event, referrer, userAgent } = body

    if (!linkId || !event) {
      return NextResponse.json(
        { success: false, error: 'Link ID and event are required' },
        { status: 400 }
      )
    }

    if (!supabase) {
      return NextResponse.json({
        success: true,
        message: 'Event tracked (development mode)'
      })
    }

    const analyticsData = {
      link_id: linkId,
      event_type: event,
      referrer,
      user_agent: userAgent,
      timestamp: new Date().toISOString(),
      ip_address: request.headers.get('x-forwarded-for') || 
                  request.headers.get('x-real-ip') || 
                  'unknown'
    }

    try {
      const { error: analyticsError } = await supabase
        .from('embed_analytics')
        .insert([analyticsData])

      if (analyticsError) {
        console.log('Embed analytics table not found, updating booking_links')
        
        const { error: updateError } = await supabase
          .from('booking_links')
          .update({ last_embedded_at: new Date().toISOString() })
          .eq('id', linkId)
          
        if (updateError) {
          console.error('Failed to update last embedded timestamp:', updateError)
        }
      }
    } catch (error) {
      console.error('Analytics tracking error:', error)
    }

    return NextResponse.json({
      success: true,
      message: 'Event tracked successfully'
    })

  } catch (error) {
    console.error('Analytics API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}