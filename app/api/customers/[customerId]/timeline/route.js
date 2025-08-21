import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request, { params }) {
  try {
    const { customerId } = params

    // For now, we'll use JSON fields in the customers table
    // In production, you'd want separate notes and photos tables
    const { data: customer, error } = await supabase
      .from('customers')
      .select('notes_timeline, photos_timeline')
      .eq('id', customerId)
      .single()

    if (error) {
      console.error('Error fetching timeline:', error)
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      )
    }

    // Parse JSON fields or return empty arrays
    const notes = customer?.notes_timeline || []
    const photos = customer?.photos_timeline || []

    // Add sample data if empty for demonstration
    const sampleNotes = notes.length === 0 ? [
      {
        id: 'note-1',
        content: 'Prefers fade on sides, longer on top',
        category: 'preference',
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        created_by: 'John Barber'
      },
      {
        id: 'note-2',
        content: 'Allergic to certain hair products - use hypoallergenic only',
        category: 'health',
        created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        created_by: 'John Barber'
      },
      {
        id: 'note-3',
        content: 'Great conversation about his new business venture',
        category: 'general',
        created_at: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
        created_by: 'Mike Stylist'
      }
    ] : notes

    const samplePhotos = photos.length === 0 ? [
      {
        id: 'photo-1',
        url: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=400&h=400&fit=crop',
        caption: 'Fresh fade with line design',
        service_type: 'Premium Fade',
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'photo-2',
        url: 'https://images.unsplash.com/photo-1620331311520-246422fd82f9?w=400&h=400&fit=crop',
        caption: 'Classic cut before wedding',
        service_type: 'Classic Cut & Style',
        created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      }
    ] : photos

    return NextResponse.json({
      success: true,
      notes: sampleNotes,
      photos: samplePhotos,
      total: sampleNotes.length + samplePhotos.length
    })

  } catch (error) {
    console.error('Timeline API error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}