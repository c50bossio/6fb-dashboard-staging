/**
 * CIN7 Webhook Registration Endpoint
 * 
 * Automatically registers webhooks with CIN7 when credentials are saved
 * This enables real-time inventory updates without manual intervention
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Cin7Client, decrypt } from '@/lib/cin7-client'

export async function POST(request) {
  try {
    const supabase = createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    // Get barbershop
    const { data: barbershop } = await supabase
      .from('barbershops')
      .select('id')
      .eq('owner_id', user.id)
      .single()
    
    if (!barbershop) {
      return NextResponse.json({ error: 'No barbershop found' }, { status: 404 })
    }
    
    // Get CIN7 credentials
    const { data: credentials } = await supabase
      .from('cin7_credentials')
      .select('*')
      .eq('barbershop_id', barbershop.id)
      .eq('is_active', true)
      .single()
    
    if (!credentials) {
      return NextResponse.json({ 
        error: 'CIN7 credentials not found',
        requiresSetup: true 
      }, { status: 404 })
    }
    
    // Decrypt credentials
    const accountId = decrypt(JSON.parse(credentials.encrypted_account_id))
    const apiKey = decrypt(JSON.parse(credentials.encrypted_api_key))
    
    // Initialize CIN7 client
    const cin7 = new Cin7Client(accountId, apiKey)
    
    // Get webhook URL (use environment variable or construct from request)
    const webhookBaseUrl = process.env.NEXT_PUBLIC_APP_URL || 
      `https://${request.headers.get('host')}`
    const webhookUrl = `${webhookBaseUrl}/api/cin7/webhook`
    
    console.log(`📡 Registering webhooks at: ${webhookUrl}`)
    
    // Register webhooks with CIN7
    const result = await cin7.subscribeToWebhooks(webhookUrl)
    
    if (result.success) {
      // Update webhook status in database
      await supabase
        .from('cin7_credentials')
        .update({
          webhook_status: 'active',
          webhook_url: webhookUrl,
          webhook_registered_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', credentials.id)
      
      console.log(`✅ Webhooks registered successfully`)
      
      return NextResponse.json({
        success: true,
        message: 'Webhooks registered successfully',
        webhooksCreated: result.webhooksCreated,
        webhookUrl
      })
    } else {
      // Update webhook status as error
      await supabase
        .from('cin7_credentials')
        .update({
          webhook_status: 'error',
          webhook_error: result.error,
          updated_at: new Date().toISOString()
        })
        .eq('id', credentials.id)
      
      console.error(`❌ Webhook registration failed: ${result.error}`)
      
      return NextResponse.json({
        success: false,
        error: result.error,
        message: 'Failed to register webhooks'
      }, { status: 500 })
    }
    
  } catch (error) {
    console.error('Webhook registration error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      message: 'Webhook registration failed'
    }, { status: 500 })
  }
}