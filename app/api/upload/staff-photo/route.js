import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request) {
  try {
    const supabase = createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    // In development, allow bypass for testing
    const isDevelopment = process.env.NODE_ENV === 'development'
    const mockUserId = 'dev-user-' + Date.now()
    
    if (!isDevelopment && (authError || !user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Use real user ID if available, otherwise use mock ID in development
    const userId = user?.id || (isDevelopment ? mockUserId : null)
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const formData = await request.formData()
    const file = formData.get('file')
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.' }, { status: 400 })
    }
    
    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 5MB' }, { status: 400 })
    }
    
    // Generate unique filename with user ID folder for organization
    const fileExt = file.name.split('.').pop().toLowerCase()
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(7)
    const fileName = `${userId}/staff-${timestamp}-${randomString}.${fileExt}`
    
    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: true // Allow overwriting if same filename (unlikely due to timestamp)
      })
    
    if (uploadError) {
      console.error('Supabase Storage upload error:', uploadError)
      
      // Check if it's a bucket not found error
      if (uploadError.message?.includes('Bucket not found')) {
        return NextResponse.json({ 
          error: 'Storage bucket not configured. Please run the SETUP_SUPABASE_STORAGE.sql script in Supabase.',
          setupRequired: true 
        }, { status: 503 })
      }
      
      return NextResponse.json({ error: uploadError.message || 'Upload failed' }, { status: 500 })
    }
    
    // Get public URL for the uploaded file
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName)
    
    // Return the public URL for immediate use
    return NextResponse.json({
      success: true,
      url: publicUrl,
      path: fileName,
      size: file.size,
      type: file.type
    })
    
  } catch (error) {
    console.error('Error in staff photo upload:', error)
    return NextResponse.json(
      { 
        error: 'Failed to upload image', 
        details: error.message,
        fallback: 'You can continue with the form - the image will be saved as base64.'
      },
      { status: 500 }
    )
  }
}

// DELETE method to remove images if needed
export async function DELETE(request) {
  try {
    const supabase = createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { path } = await request.json()
    
    if (!path) {
      return NextResponse.json({ error: 'No path provided' }, { status: 400 })
    }
    
    // Ensure user can only delete their own images
    if (!path.startsWith(user.id)) {
      return NextResponse.json({ error: 'Unauthorized to delete this file' }, { status: 403 })
    }
    
    const { error: deleteError } = await supabase.storage
      .from('avatars')
      .remove([path])
    
    if (deleteError) {
      console.error('Delete error:', deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }
    
    return NextResponse.json({ success: true, message: 'Image deleted successfully' })
    
  } catch (error) {
    console.error('Error deleting staff photo:', error)
    return NextResponse.json(
      { error: 'Failed to delete image', details: error.message },
      { status: 500 }
    )
  }
}