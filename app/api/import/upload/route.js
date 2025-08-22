/**
 * File Upload API Endpoint
 * Handles CSV file uploads for data import
 * Max file size: 50MB (100MB for compressed)
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Configuration
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
const MAX_COMPRESSED_SIZE = 100 * 1024 * 1024 // 100MB
const ALLOWED_EXTENSIONS = ['.csv', '.txt', '.zip']
const UPLOAD_DIR = process.env.UPLOAD_TEMP_DIR || '/tmp/imports'

export async function POST(request) {
  try {
    // Get form data
    const formData = await request.formData()
    const file = formData.get('file')
    const platform = formData.get('platform')
    const entityType = formData.get('entityType')
    const barbershopId = formData.get('barbershopId')
    const userId = formData.get('userId')

    // Validate required fields
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    if (!platform || !barbershopId) {
      return NextResponse.json(
        { error: 'Missing required fields: platform and barbershopId' },
        { status: 400 }
      )
    }

    // Check file type
    const fileName = file.name.toLowerCase()
    const fileExtension = fileName.substring(fileName.lastIndexOf('.'))
    
    if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
      return NextResponse.json(
        { 
          error: 'Invalid file type',
          message: `Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}` 
        },
        { status: 400 }
      )
    }

    // Check file size
    const maxSize = fileExtension === '.zip' ? MAX_COMPRESSED_SIZE : MAX_FILE_SIZE
    if (file.size > maxSize) {
      return NextResponse.json(
        { 
          error: 'File too large',
          message: `Maximum size: ${formatBytes(maxSize)}. Your file: ${formatBytes(file.size)}`
        },
        { status: 400 }
      )
    }

    // Create upload directory if it doesn't exist
    await mkdir(UPLOAD_DIR, { recursive: true })

    // Generate unique filename
    const uniqueId = randomUUID()
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
    const uniqueFileName = `${uniqueId}_${sanitizedName}`
    const filePath = join(UPLOAD_DIR, uniqueFileName)

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Create import record in database
    const { data: importRecord, error: dbError } = await supabase
      .from('data_imports')
      .insert({
        barbershop_id: barbershopId,
        user_id: userId || null,
        source_platform: platform,
        import_type: entityType || 'unknown',
        status: 'pending',
        original_filename: file.name,
        file_path: filePath,
        file_size_bytes: file.size,
        file_format: fileExtension.substring(1),
        delimiter: formData.get('delimiter') || ',',
        import_options: {
          skipDuplicates: formData.get('skipDuplicates') === 'true',
          mergeStrategy: formData.get('mergeStrategy') || 'preserve_existing',
          validateOnly: formData.get('validateOnly') === 'true'
        }
      })
      .select()
      .single()

    if (dbError) {
      // Clean up uploaded file on database error
      try {
        const { unlink } = await import('fs/promises')
        await unlink(filePath)
      } catch (cleanupError) {
        console.error('Failed to clean up file:', cleanupError)
      }

      return NextResponse.json(
        { 
          error: 'Failed to create import record',
          details: dbError.message 
        },
        { status: 500 }
      )
    }

    // Add audit log entry
    await supabase
      .from('import_audit_log')
      .insert({
        import_id: importRecord.id,
        action: 'File uploaded',
        action_type: 'info',
        details: {
          filename: file.name,
          size: file.size,
          platform: platform,
          entityType: entityType
        }
      })

    // Return success response with import ID
    return NextResponse.json({
      success: true,
      importId: importRecord.id,
      message: 'File uploaded successfully',
      details: {
        filename: file.name,
        size: formatBytes(file.size),
        platform: platform,
        entityType: entityType,
        status: 'pending_validation'
      },
      nextStep: `/api/import/preview?importId=${importRecord.id}`
    })

  } catch (error) {
    console.error('Upload error:', error)
    
    return NextResponse.json(
      { 
        error: 'Upload failed',
        message: error.message 
      },
      { status: 500 }
    )
  }
}

// OPTIONS method for CORS
export async function OPTIONS(request) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  })
}

// Helper function to format bytes
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}