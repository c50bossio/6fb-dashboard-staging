import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml']

export async function POST(request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    const uploadType = formData.get('type') // 'logo', 'cover', 'gallery', 'team'
    const shopId = formData.get('shopId')

    if (!file || !uploadType || !shopId) {
      return NextResponse.json(
        { error: 'File, type, and shopId are required' },
        { status: 400 }
      )
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, WebP, and SVG are allowed.' },
        { status: 400 }
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB.' },
        { status: 400 }
      )
    }

    const fileExtension = file.name.split('.').pop().toLowerCase()
    const uniqueFilename = `${uploadType}-${shopId}-${uuidv4()}.${fileExtension}`
    
    const uploadDir = getUploadDirectory(uploadType)
    const uploadPath = join(process.cwd(), 'public', uploadDir)
    const filePath = join(uploadPath, uniqueFilename)
    
    try {
      await mkdir(uploadPath, { recursive: true })
    } catch (error) {
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    await writeFile(filePath, buffer)

    const publicUrl = `/${uploadDir}/${uniqueFilename}`

    return NextResponse.json({
      message: 'File uploaded successfully',
      url: publicUrl,
      filename: uniqueFilename,
      size: file.size,
      type: file.type,
      uploadType
    })

  } catch (error) {
    console.error('Error uploading file:', error)
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    )
  }
}

function getUploadDirectory(uploadType) {
  switch (uploadType) {
    case 'logo':
      return 'uploads/logos'
    case 'cover':
    case 'hero':
      return 'uploads/covers'
    case 'gallery':
      return 'uploads/gallery'
    case 'team':
      return 'uploads/team'
    case 'testimonial':
      return 'uploads/testimonials'
    default:
      return 'uploads/general'
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const fileUrl = searchParams.get('url')
    const shopId = searchParams.get('shopId')

    if (!fileUrl || !shopId) {
      return NextResponse.json(
        { error: 'File URL and shopId are required' },
        { status: 400 }
      )
    }

    const filename = fileUrl.split('/').pop()
    
    if (!filename.includes(shopId)) {
      return NextResponse.json(
        { error: 'Unauthorized to delete this file' },
        { status: 403 }
      )
    }

    const filePath = join(process.cwd(), 'public', fileUrl)

    try {
      const fs = require('fs').promises
      await fs.unlink(filePath)
    } catch (error) {
      console.log('File already deleted or does not exist:', filePath)
    }

    return NextResponse.json({
      message: 'File deleted successfully',
      url: fileUrl
    })

  } catch (error) {
    console.error('Error deleting file:', error)
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    )
  }
}