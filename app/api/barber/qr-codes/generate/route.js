import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import QRCode from 'qrcode'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const body = await request.json()
    const { linkId, options = {} } = body

    if (!linkId) {
      return NextResponse.json(
        { error: 'linkId is required' },
        { status: 400 }
      )
    }

    // Fetch the booking link
    const { data: bookingLink, error: fetchError } = await supabase
      .from('booking_links')
      .select('*')
      .eq('id', linkId)
      .single()

    if (fetchError || !bookingLink) {
      return NextResponse.json(
        { error: 'Booking link not found' },
        { status: 404 }
      )
    }

    // Generate the full URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://6fb.ai'
    const fullUrl = `${baseUrl}${bookingLink.url}`

    // Default QR code options
    const qrOptions = {
      width: options.size || 300,
      margin: options.margin || 4,
      color: {
        dark: options.foregroundColor || '#000000',
        light: options.backgroundColor || '#FFFFFF'
      },
      errorCorrectionLevel: options.errorCorrectionLevel || 'M'
    }

    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(fullUrl, qrOptions)

    // In a production environment, you would:
    // 1. Upload the QR code image to a storage service (AWS S3, Supabase Storage, etc.)
    // 2. Store the URL in the database
    // For now, we'll store the data URL directly

    // Check if QR code record exists
    const { data: existingQR } = await supabase
      .from('qr_codes')
      .select('*')
      .eq('link_id', linkId)
      .single()

    let qrRecord
    if (existingQR) {
      // Update existing QR code
      const { data, error } = await supabase
        .from('qr_codes')
        .update({
          size: qrOptions.width,
          margin: qrOptions.margin,
          foreground_color: qrOptions.color.dark,
          background_color: qrOptions.color.light,
          error_correction_level: qrOptions.errorCorrectionLevel,
          include_text: options.includeText || false,
          custom_text: options.customText || null,
          image_url: qrCodeDataUrl, // In production, this would be the uploaded image URL
          updated_at: new Date().toISOString()
        })
        .eq('link_id', linkId)
        .select()
        .single()

      if (error) {
        throw error
      }
      qrRecord = data
    } else {
      // Create new QR code record
      const { data, error } = await supabase
        .from('qr_codes')
        .insert({
          link_id: linkId,
          size: qrOptions.width,
          margin: qrOptions.margin,
          foreground_color: qrOptions.color.dark,
          background_color: qrOptions.color.light,
          error_correction_level: qrOptions.errorCorrectionLevel,
          include_text: options.includeText || false,
          custom_text: options.customText || null,
          image_url: qrCodeDataUrl, // In production, this would be the uploaded image URL
          download_count: 0
        })
        .select()
        .single()

      if (error) {
        throw error
      }
      qrRecord = data
    }

    // Update booking link to mark QR as generated
    await supabase
      .from('booking_links')
      .update({
        qr_generated: true,
        qr_code_url: qrCodeDataUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', linkId)

    // Track QR generation event
    await supabase
      .from('link_analytics')
      .insert({
        link_id: linkId,
        event_type: 'qr_generated',
        session_id: request.headers.get('x-session-id'),
        user_agent: request.headers.get('user-agent'),
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        timestamp: new Date().toISOString()
      })

    return NextResponse.json({
      success: true,
      data: {
        qrCodeUrl: qrCodeDataUrl,
        qrCodeId: qrRecord.id,
        fullUrl,
        options: qrOptions,
        bookingLink: {
          id: bookingLink.id,
          name: bookingLink.name,
          url: bookingLink.url
        }
      }
    })

  } catch (error) {
    console.error('QR Generation Error:', error)
    return NextResponse.json(
      { error: 'Failed to generate QR code', message: error.message },
      { status: 500 }
    )
  }
}

// Track QR code downloads
export async function PATCH(request) {
  try {
    const body = await request.json()
    const { qrCodeId } = body

    if (!qrCodeId) {
      return NextResponse.json(
        { error: 'qrCodeId is required' },
        { status: 400 }
      )
    }

    // Increment download count
    const { data, error } = await supabase
      .from('qr_codes')
      .update({
        download_count: supabase.rpc('increment_download_count', { qr_id: qrCodeId })
      })
      .eq('id', qrCodeId)
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      downloadCount: data.download_count
    })

  } catch (error) {
    console.error('Download tracking error:', error)
    return NextResponse.json(
      { error: 'Failed to track download', message: error.message },
      { status: 500 }
    )
  }
}