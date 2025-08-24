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
    const serviceId = formData.get('service_id') // Optional - for organizing by service
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.' 
      }, { status: 400 })
    }
    
    // Validate file size (10MB max for service images)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ 
        error: 'File size must be less than 10MB' 
      }, { status: 400 })
    }
    
    // Generate unique filename with user ID folder for organization
    const fileExt = file.name.split('.').pop().toLowerCase()
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(7)
    const servicePrefix = serviceId ? `service-${serviceId}` : 'service'
    const fileName = `${userId}/${servicePrefix}-${timestamp}-${randomString}.${fileExt}`
    
    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    // Upload to Supabase Storage (using 'service-images' bucket)
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('service-images')
      .upload(fileName, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: true // Allow overwriting if same filename (unlikely due to timestamp)
      })
    
    if (uploadError) {
      console.error('Supabase Storage upload error:', uploadError)
      
      // Check if it's a bucket not found error
      if (uploadError.message?.includes('Bucket not found')) {
        // Fall back to avatars bucket if service-images doesn't exist
        const { data: fallbackData, error: fallbackError } = await supabase.storage
          .from('avatars')
          .upload(`services/${fileName}`, buffer, {
            contentType: file.type,
            cacheControl: '3600',
            upsert: true
          })
        
        if (fallbackError) {
          return NextResponse.json({ 
            error: 'Storage bucket not configured. Please run the SETUP_SUPABASE_STORAGE.sql script in Supabase.',
            setupRequired: true 
          }, { status: 503 })
        }
        
        // Get public URL for the uploaded file (fallback bucket)
        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(`services/${fileName}`)
        
        return NextResponse.json({
          success: true,
          url: publicUrl,
          path: `services/${fileName}`,
          bucket: 'avatars',
          size: file.size,
          type: file.type
        })
      }
      
      return NextResponse.json({ 
        error: uploadError.message || 'Upload failed' 
      }, { status: 500 })
    }
    
    // Get public URL for the uploaded file
    const { data: { publicUrl } } = supabase.storage
      .from('service-images')
      .getPublicUrl(fileName)
    
    // Return the public URL for immediate use
    return NextResponse.json({
      success: true,
      url: publicUrl,
      path: fileName,
      bucket: 'service-images',
      size: file.size,
      type: file.type,
      message: 'Service image uploaded successfully'
    })
    
  } catch (error) {
    console.error('Error in service image upload:', error)
    return NextResponse.json(
      { 
        error: 'Failed to upload service image', 
        details: error.message,
        fallback: 'You can continue with URL input instead.'
      },
      { status: 500 }
    )
  }
}

// DELETE method to remove service images if needed
export async function DELETE(request) {
  try {
    const supabase = createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { path, bucket } = await request.json()
    
    if (!path) {
      return NextResponse.json({ error: 'No path provided' }, { status: 400 })
    }
    
    // Ensure user can only delete their own images
    if (!path.startsWith(user.id)) {
      return NextResponse.json({ 
        error: 'Unauthorized to delete this file' 
      }, { status: 403 })
    }
    
    // Use specified bucket or default to service-images
    const bucketName = bucket || 'service-images'
    
    const { error: deleteError } = await supabase.storage
      .from(bucketName)
      .remove([path])
    
    if (deleteError) {
      console.error('Delete error:', deleteError)
      return NextResponse.json({ 
        error: deleteError.message 
      }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Service image deleted successfully' 
    })
    
  } catch (error) {
    console.error('Error deleting service image:', error)
    return NextResponse.json(
      { 
        error: 'Failed to delete service image', 
        details: error.message 
      },
      { status: 500 }
    )
  }
}