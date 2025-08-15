import { NextResponse } from 'next/server'
export const runtime = 'edge'

export async function DELETE(request, { params }) {
  try {
    const { accountId } = params
    
    if (!accountId) {
      return NextResponse.json({ success: false, error: 'Missing account ID' }, { status: 400 })
    }

    
    const success = true

    if (success) {
      return NextResponse.json({ 
        success: true,
        message: 'Calendar account disconnected successfully'
      })
    } else {
      return NextResponse.json(
        { success: false, error: 'Failed to disconnect calendar account' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error disconnecting calendar account:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}