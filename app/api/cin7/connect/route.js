import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { encrypt, decrypt } from '@/lib/cin7-client.js'

/**
 * Simplified Cin7 Connection Endpoint
 * 
 * This replaces the complex credentials system with a simple approach:
 * 1. Get user profile (which has barbershop_id)
 * 2. Test Cin7 credentials
 * 3. Store encrypted credentials
 * 4. Return success
 */

async function testCin7Connection(accountId, apiKey) {
  try {
    // Test with the standard v2 endpoint
    const response = await fetch('https://inventory.dearsystems.com/ExternalAPI/v2/me', {
      method: 'GET',
      headers: {
        'api-auth-accountid': accountId,
        'api-auth-applicationkey': apiKey,
        'Content-Type': 'application/json'
      }
    })
    
    if (response.ok) {
      const data = await response.json()
      return { 
        success: true, 
        data,
        accountName: data.Company || data.Name || 'Connected Account'
      }
    }
    
    // If failed, try to get error details
    const errorText = await response.text()
    console.error(`Cin7 API error ${response.status}:`, errorText)
    
    return { 
      success: false, 
      error: response.status === 401 
        ? 'Invalid credentials. Please check your Account ID and API Key.'
        : `Connection failed (${response.status}): ${errorText}`
    }
  } catch (error) {
    console.error('Cin7 connection test failed:', error)
    return { success: false, error: error.message }
  }
}

export async function POST(request) {
  try {
    const supabase = createClient()
    const { accountId, apiKey } = await request.json()

    if (!accountId || !apiKey) {
      return NextResponse.json(
        { error: 'Account ID and API key are required' },
        { status: 400 }
      )
    }

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    // Get user profile - use simple lookup
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, barbershop_id, shop_id, email')
      .or(`id.eq.${user.id},email.eq.${user.email}`)
      .single()
    
    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }
    
    // Get barbershop ID from profile
    const barbershopId = profile.barbershop_id || profile.shop_id
    if (!barbershopId) {
      return NextResponse.json(
        { 
          error: 'No barbershop associated',
          message: 'Please complete your barbershop setup first'
        },
        { status: 400 }
      )
    }

    // Test the connection
    console.log('Testing Cin7 connection...')
    const connectionTest = await testCin7Connection(accountId, apiKey)
    
    if (!connectionTest.success) {
      return NextResponse.json(
        { error: connectionTest.error },
        { status: 401 }
      )
    }

    // Save credentials to cin7_credentials table
    const encryptedCredentials = {
      barbershop_id: barbershopId,
      encrypted_api_key: JSON.stringify(encrypt(apiKey)),
      encrypted_account_id: JSON.stringify(encrypt(accountId)),
      account_name: connectionTest.accountName,
      api_version: 'v2',
      is_active: true,
      last_tested: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    // Upsert credentials (update if exists, insert if not)
    const { error: upsertError } = await supabase
      .from('cin7_credentials')
      .upsert(encryptedCredentials, { 
        onConflict: 'barbershop_id' 
      })
    
    if (upsertError) {
      console.error('Failed to save credentials:', upsertError)
      return NextResponse.json(
        { error: 'Failed to save credentials', details: upsertError.message },
        { status: 500 }
      )
    }

    console.log(`✅ Cin7 credentials saved for barbershop ${barbershopId}`)

    return NextResponse.json({
      success: true,
      status: 'connected',
      message: 'Successfully connected to Cin7',
      accountName: connectionTest.accountName,
      barbershopId: barbershopId
    })

  } catch (error) {
    console.error('Connection error:', error)
    return NextResponse.json(
      { error: 'Connection failed: ' + error.message },
      { status: 500 }
    )
  }
}

// GET - Check connection status
export async function GET(request) {
  try {
    const supabase = createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, barbershop_id, shop_id, email')
      .or(`id.eq.${user.id},email.eq.${user.email}`)
      .single()
    
    if (!profile) {
      return NextResponse.json({
        connected: false,
        message: 'Profile not found'
      })
    }
    
    const barbershopId = profile.barbershop_id || profile.shop_id
    if (!barbershopId) {
      return NextResponse.json({
        connected: false,
        message: 'No barbershop associated'
      })
    }
    
    // Check for existing credentials
    const { data: credentials } = await supabase
      .from('cin7_credentials')
      .select('account_name, last_sync, last_sync_status, is_active')
      .eq('barbershop_id', barbershopId)
      .eq('is_active', true)
      .single()
    
    if (credentials) {
      return NextResponse.json({
        connected: true,
        accountName: credentials.account_name,
        lastSync: credentials.last_sync,
        syncStatus: credentials.last_sync_status
      })
    }
    
    return NextResponse.json({
      connected: false,
      message: 'No Cin7 credentials found'
    })
    
  } catch (error) {
    console.error('Status check error:', error)
    return NextResponse.json({
      connected: false,
      error: error.message
    })
  }
}
