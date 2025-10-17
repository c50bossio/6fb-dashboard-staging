import { NextResponse } from 'next/server';
import { uploadImage, validateImageFile } from '../../../../lib/supabase-storage';

export async function POST(request) {
  try {
    // Get the form data
    const formData = await request.formData();
    const file = formData.get('image');

    if (!file) {
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      );
    }

    // Validate the file
    try {
      validateImageFile(file, 5); // 5MB max
    } catch (validationError) {
      return NextResponse.json(
        { error: validationError.message },
        { status: 400 }
      );
    }

    // Convert File to Buffer for Supabase
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create a new File object with buffer
    const uploadFile = new File([buffer], file.name, { type: file.type });

    // Upload to Supabase Storage
    const { url, path } = await uploadImage(uploadFile, 'product-images', 'products');

    // Return the public URL
    return NextResponse.json({
      success: true,
      url,
      path,
      message: 'Image uploaded successfully'
    });

  } catch (error) {
    console.error('Image upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload image. Please try again.' },
      { status: 500 }
    );
  }
}

// Configure max file size for Next.js App Router
export const runtime = 'nodejs';
export const maxDuration = 60;