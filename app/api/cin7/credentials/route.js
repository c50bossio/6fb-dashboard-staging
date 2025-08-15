import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET() {
  try {
    const barbershopId = '550e8400-e29b-41d4-a716-446655440000' // Hardcoded for demo
    
    const { data: credentials, error } = await supabase
      .from('cin7_credentials')
      .select('barbershop_id, api_version, last_tested, updated_at, is_active, created_at')
      .eq('barbershop_id', barbershopId)
      .eq('is_active', true)
      .single()
    
    if (error || !credentials) {
      return NextResponse.json({
        hasCredentials: false,
        message: 'No Cin7 credentials configured'
      })
    }
    
    const { data: credWithAccountId } = await supabase
      .from('cin7_credentials')
      .select('encrypted_account_id')
      .eq('barbershop_id', barbershopId)
      .single()
    
    const accountId = credWithAccountId 
      ? Buffer.from(credWithAccountId.encrypted_account_id, 'base64').toString('utf-8')
      : null
    
    const maskedAccountId = accountId 
      ? accountId.substring(0, 8) + '...' + accountId.slice(-4)
      : null
    
    return NextResponse.json({
      hasCredentials: true,
      credentials: {
        ...credentials,
        maskedAccountId,
        lastTested: credentials.last_tested,
        lastSynced: credentials.updated_at,
        apiVersion: credentials.api_version
      }
    })
    
  } catch (error) {
    console.error('Error fetching credentials:', error)
    return NextResponse.json(
      { error: 'Failed to fetch credentials' },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  try {
    const barbershopId = '550e8400-e29b-41d4-a716-446655440000' // Hardcoded for demo
    
    console.log('🗑️ Deleting Cin7 credentials for barbershop:', barbershopId)
    
    const { data: existingCreds, error: checkError } = await supabase
      .from('cin7_credentials')
      .select('barbershop_id')
      .eq('barbershop_id', barbershopId)
      .single()
    
    if (checkError || !existingCreds) {
      return NextResponse.json({
        error: 'No credentials found',
        message: 'No Cin7 credentials to delete'
      }, { status: 404 })
    }
    
    const { error: deleteError } = await supabase
      .from('cin7_credentials')
      .delete()
      .eq('barbershop_id', barbershopId)
    
    if (deleteError) {
      console.error('Error deleting credentials:', deleteError)
      return NextResponse.json({
        error: 'Delete failed',
        message: 'Could not delete credentials'
      }, { status: 500 })
    }
    
    console.log('✅ Cin7 credentials deleted successfully')
    
    return NextResponse.json({
      success: true,
      message: 'Cin7 credentials deleted successfully',
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Delete credentials error:', error)
    return NextResponse.json({
      error: 'Delete failed',
      message: error.message
    }, { status: 500 })
  }
}

export async function PUT(request) {
  try {
    const body = await request.json()
    const { apiKey, accountId } = body
    const barbershopId = '550e8400-e29b-41d4-a716-446655440000' // Hardcoded for demo
    
    if (!apiKey || !accountId) {
      return NextResponse.json({
        error: 'Missing credentials',
        message: 'Both API key and Account ID are required'
      }, { status: 400 })
    }
    
    console.log('🔄 Updating Cin7 credentials...')
    
    const testResponse = await fetch('https://inventory.dearsystems.com/externalapi/products?limit=1', {
      method: 'GET',
      headers: {
        'api-auth-accountid': accountId,
        'api-auth-applicationkey': apiKey,
        'Content-Type': 'application/json'
      }
    })
    
    if (!testResponse.ok && testResponse.status !== 403) {
      return NextResponse.json({
        error: 'Invalid credentials',
        message: 'Could not connect to Cin7 with provided credentials'
      }, { status: 400 })
    }
    
    const encryptedApiKey = Buffer.from(apiKey).toString('base64')
    const encryptedAccountId = Buffer.from(accountId).toString('base64')
    
    const { error: updateError } = await supabase
      .from('cin7_credentials')
      .upsert({
        barbershop_id: barbershopId,
        encrypted_api_key: encryptedApiKey,
        encrypted_account_id: encryptedAccountId,
        api_version: 'v1',
        last_tested: new Date().toISOString(),
        is_active: true,
        updated_at: new Date().toISOString()
      }, { onConflict: 'barbershop_id' })
    
    if (updateError) {
      console.error('Error updating credentials:', updateError)
      return NextResponse.json({
        error: 'Update failed',
        message: 'Could not save updated credentials'
      }, { status: 500 })
    }
    
    console.log('✅ Cin7 credentials updated successfully')
    
    return NextResponse.json({
      success: true,
      message: 'Cin7 credentials updated successfully',
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Update credentials error:', error)
    return NextResponse.json({
      error: 'Update failed',
      message: error.message
    }, { status: 500 })
  }
}