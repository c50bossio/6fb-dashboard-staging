import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { encrypt, decrypt } from '@/lib/cin7-client.js'

async function registerCin7Webhooks(accountId, apiKey, webhookUrl) {
  try {
    console.log('🔗 Registering Cin7 webhooks for real-time updates...')
    
    // Define webhook events we want to subscribe to
    const webhookEvents = [
      {
        Type: 'Stock.Updated',
        URL: `${webhookUrl}/stock-updated`,
        Description: 'Inventory stock level changes'
      },
      {
        Type: 'Product.Modified', 
        URL: `${webhookUrl}/product-modified`,
        Description: 'Product information updates'
      },
      {
        Type: 'Sale.Completed',
        URL: `${webhookUrl}/sale-completed`, 
        Description: 'Sale transaction completed'
      }
    ]
    
    const registeredWebhooks = []
    
    for (const webhook of webhookEvents) {
      try {
        const response = await fetch('https://inventory.dearsystems.com/ExternalAPI/v2/webhooks', {
          method: 'POST',
          headers: {
            'api-auth-accountid': accountId,
            'api-auth-applicationkey': apiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(webhook)
        })
        
        if (response.ok) {
          const result = await response.json()
          registeredWebhooks.push({
            type: webhook.Type,
            url: webhook.URL,
            id: result.ID
          })
          console.log(`✅ Registered webhook: ${webhook.Type}`)
        } else {
          console.warn(`⚠️ Failed to register ${webhook.Type}: ${response.status}`)
        }
      } catch (hookError) {
        console.warn(`⚠️ Error registering ${webhook.Type}:`, hookError.message)
      }
    }
    
    return {
      success: registeredWebhooks.length > 0,
      registered: registeredWebhooks,
      count: registeredWebhooks.length
    }
    
  } catch (error) {
    console.error('Webhook registration failed:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

export async function GET() {
  try {
    const supabase = createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      // Development mode bypass - return sample response
      if (process.env.NODE_ENV === 'development') {
        return NextResponse.json({
          hasCredentials: false,
          message: 'No Cin7 credentials configured (dev mode)'
        })
      }
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      )
    }
    
    // Get user's barbershop
    const { data: barbershop, error: shopError } = await supabase
      .from('barbershops')
      .select('id, name')
      .eq('owner_id', user.id)
      .single()
    
    if (shopError || !barbershop) {
      return NextResponse.json({
        hasCredentials: false,
        message: 'No barbershop found for user'
      })
    }
    
    // Get credentials for this barbershop
    const { data: credentials, error } = await supabase
      .from('cin7_credentials')
      .select('barbershop_id, api_version, last_tested, updated_at, is_active, created_at, encrypted_account_id')
      .eq('barbershop_id', barbershop.id)
      .eq('is_active', true)
      .single()
    
    if (error || !credentials) {
      return NextResponse.json({
        hasCredentials: false,
        message: 'No Cin7 credentials configured'
      })
    }
    
    // Decrypt and mask account ID for display
    let maskedAccountId = null
    if (credentials.encrypted_account_id) {
      try {
        const decryptedAccountId = decrypt(JSON.parse(credentials.encrypted_account_id))
        maskedAccountId = decryptedAccountId.substring(0, 8) + '...' + decryptedAccountId.slice(-4)
      } catch (decryptError) {
        console.warn('Failed to decrypt account ID for masking:', decryptError)
        maskedAccountId = 'Hidden'
      }
    }
    
    return NextResponse.json({
      hasCredentials: true,
      credentials: {
        barbershop_id: credentials.barbershop_id,
        api_version: credentials.api_version,
        last_tested: credentials.last_tested,
        updated_at: credentials.updated_at,
        is_active: credentials.is_active,
        created_at: credentials.created_at,
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
    const supabase = createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      )
    }
    
    // Get user's barbershop
    const { data: barbershop, error: shopError } = await supabase
      .from('barbershops')
      .select('id, name')
      .eq('owner_id', user.id)
      .single()
    
    if (shopError || !barbershop) {
      return NextResponse.json({
        error: 'No barbershop found',
        message: 'No barbershop found for user'
      }, { status: 404 })
    }
    
    console.log('🗑️ Deleting Cin7 credentials for barbershop:', barbershop.id)
    
    const { data: existingCreds, error: checkError } = await supabase
      .from('cin7_credentials')
      .select('barbershop_id')
      .eq('barbershop_id', barbershop.id)
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
      .eq('barbershop_id', barbershop.id)
    
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
    const supabase = createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      )
    }
    
    // Get user's barbershop
    const { data: barbershop, error: shopError } = await supabase
      .from('barbershops')
      .select('id, name')
      .eq('owner_id', user.id)
      .single()
    
    if (shopError || !barbershop) {
      return NextResponse.json({
        error: 'No barbershop found',
        message: 'No barbershop found for user'
      }, { status: 404 })
    }
    
    const body = await request.json()
    const { apiKey, accountId } = body
    
    if (!apiKey || !accountId) {
      return NextResponse.json({
        error: 'Missing credentials',
        message: 'Both API key and Account ID are required'
      }, { status: 400 })
    }
    
    console.log('🔄 Updating Cin7 credentials for barbershop:', barbershop.id)
    
    // Test credentials with Cin7 API v2
    const testResponse = await fetch('https://inventory.dearsystems.com/ExternalAPI/v2/me', {
      method: 'GET',
      headers: {
        'api-auth-accountid': accountId,
        'api-auth-applicationkey': apiKey,
        'Content-Type': 'application/json'
      }
    })
    
    if (!testResponse.ok) {
      console.error('Cin7 API test failed:', testResponse.status, testResponse.statusText)
      return NextResponse.json({
        error: 'Invalid credentials',
        message: 'Could not connect to Cin7 with provided credentials. Please verify your Account ID and API Key.'
      }, { status: 400 })
    }
    
    // Get company info for validation
    const companyInfo = await testResponse.json()
    
    // Encrypt credentials using AES encryption
    const encryptedApiKey = encrypt(apiKey)
    const encryptedAccountId = encrypt(accountId)
    
    // Register webhooks for real-time updates
    let webhookRegistered = false
    try {
      const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9999'}/api/cin7/webhook`
      const webhookResult = await registerCin7Webhooks(accountId, apiKey, webhookUrl)
      webhookRegistered = webhookResult.success
      console.log('Webhook registration result:', webhookResult)
    } catch (webhookError) {
      console.warn('Failed to register webhooks (non-critical):', webhookError.message)
    }
    
    const { error: updateError } = await supabase
      .from('cin7_credentials')
      .upsert({
        barbershop_id: barbershop.id,
        encrypted_api_key: JSON.stringify(encryptedApiKey),
        encrypted_account_id: JSON.stringify(encryptedAccountId),
        api_version: 'v2',
        account_name: companyInfo.Company || 'Connected Account',
        last_tested: new Date().toISOString(),
        webhook_registered: webhookRegistered,
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
      accountName: companyInfo.Company || 'Connected Account',
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