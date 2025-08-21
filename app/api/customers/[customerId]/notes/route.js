import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request, { params }) {
  try {
    const { customerId } = params
    const body = await request.json()
    const { content, category, created_at } = body

    // Get current customer data
    const { data: customer, error: fetchError } = await supabase
      .from('customers')
      .select('notes_timeline')
      .eq('id', customerId)
      .single()

    if (fetchError) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      )
    }

    // Get existing notes or create new array
    const existingNotes = customer?.notes_timeline || []
    
    // Create new note
    const newNote = {
      id: `note-${Date.now()}`,
      content,
      category: category || 'general',
      created_at: created_at || new Date().toISOString(),
      created_by: 'Current User' // In production, get from auth context
    }

    // Add new note to beginning of array
    const updatedNotes = [newNote, ...existingNotes]

    // Update customer with new notes
    const { error: updateError } = await supabase
      .from('customers')
      .update({ notes_timeline: updatedNotes })
      .eq('id', customerId)

    if (updateError) {
      console.error('Error updating notes:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to save note' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      note: newNote
    })

  } catch (error) {
    console.error('Notes API error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(request, { params }) {
  try {
    const { customerId } = params
    const url = new URL(request.url)
    const noteId = url.pathname.split('/').pop()

    // Get current customer data
    const { data: customer, error: fetchError } = await supabase
      .from('customers')
      .select('notes_timeline')
      .eq('id', customerId)
      .single()

    if (fetchError) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      )
    }

    // Filter out the deleted note
    const existingNotes = customer?.notes_timeline || []
    const updatedNotes = existingNotes.filter(note => note.id !== noteId)

    // Update customer with filtered notes
    const { error: updateError } = await supabase
      .from('customers')
      .update({ notes_timeline: updatedNotes })
      .eq('id', customerId)

    if (updateError) {
      console.error('Error deleting note:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to delete note' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Delete note API error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}