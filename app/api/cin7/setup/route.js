/**
 * Simplified CIN7 Setup API
 * Single endpoint to handle complete setup flow
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { Cin7Client, encrypt } from '@/lib/cin7-client'

export async function POST(request) {
  try {
    const supabase = createClient()
    
    // Check for dev bypass in headers (from localStorage)
    const devBypass = request.headers.get('x-dev-bypass') === 'true' || 
                     process.env.NODE_ENV === 'development'
    
    let user = null
    
    if (devBypass) {
      // Use mock user for development
      user = {
        id: 'dev-user-id',
        email: 'dev-enterprise@test.com'
      }
      console.log('🔧 Using dev bypass for CIN7 setup')
    } else {
      // Get authenticated user
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
      if (authError || !authUser) {
        return NextResponse.json({ 
          success: false,
          error: 'Not authenticated' 
        }, { status: 401 })
      }
      user = authUser
    }

    // Parse request body
    const { accountId, apiKey, accountName, options = {} } = await request.json()

    // Validate inputs
    if (!accountId || !apiKey) {
      return NextResponse.json({ 
        success: false,
        error: 'Account ID and API Key are required' 
      }, { status: 400 })
    }

    // Default options
    const syncOptions = {
      autoSync: options.autoSync !== false,
      syncInterval: options.syncInterval || 15,
      enableWebhooks: options.enableWebhooks !== false,
      lowStockAlerts: options.lowStockAlerts !== false,
      ...options
    }

    console.log('🚀 Starting CIN7 setup for user:', user.id)

    // Get or create barbershop
    let barbershop = null
    
    if (devBypass) {
      // Use mock barbershop for development
      barbershop = { id: 'barbershop_demo_001' }
      console.log('🔧 Using demo barbershop for dev bypass')
    } else {
      const { data: userBarbershop } = await supabase
        .from('barbershops')
        .select('id')
        .eq('owner_id', user.id)
        .single()
        
      if (!userBarbershop) {
        return NextResponse.json({ 
          success: false,
          error: 'No barbershop found for user' 
        }, { status: 404 })
      }
      barbershop = userBarbershop
    }

    // Step 1: Test connection first
    console.log('📡 Testing CIN7 connection...')
    const cin7 = new Cin7Client(accountId, apiKey)
    const testResult = await cin7.testConnection()
    
    if (!testResult.success) {
      return NextResponse.json({ 
        success: false,
        error: testResult.message || 'Failed to connect to CIN7',
        details: testResult.error
      }, { status: 400 })
    }

    console.log('✅ Connection successful:', testResult.accountName)

    // Step 2: Encrypt and save credentials (skip for dev bypass)
    let credentialsSaved = false
    
    if (devBypass) {
      console.log('🔧 Skipping credential storage for dev bypass')
      credentialsSaved = true
    } else {
      const encryptedAccountId = encrypt(accountId)
      const encryptedApiKey = encrypt(apiKey)

      // Check if credentials already exist
      const { data: existingCreds } = await supabase
        .from('cin7_credentials')
        .select('id')
        .eq('barbershop_id', barbershop.id)
        .single()

    if (existingCreds) {
      // Update existing credentials
      const { error: updateError } = await supabase
        .from('cin7_credentials')
        .update({
          encrypted_account_id: JSON.stringify(encryptedAccountId),
          encrypted_api_key: JSON.stringify(encryptedApiKey),
          account_name: testResult.accountName || accountName,
          is_active: true,
          last_updated: new Date().toISOString(),
          sync_settings: syncOptions
        })
        .eq('id', existingCreds.id)

      if (updateError) {
        console.error('❌ Failed to update credentials:', updateError)
        throw updateError
      }
      credentialsSaved = true
      console.log('✅ Credentials updated successfully')
    } else {
      // Insert new credentials
      const { error: insertError } = await supabase
        .from('cin7_credentials')
        .insert({
          barbershop_id: barbershop.id,
          user_id: user.id,
          encrypted_account_id: JSON.stringify(encryptedAccountId),
          encrypted_api_key: JSON.stringify(encryptedApiKey),
          account_name: testResult.accountName || accountName,
          is_active: true,
          sync_settings: syncOptions
        })

      if (insertError) {
        console.error('❌ Failed to save credentials:', insertError)
        throw insertError
      }
      credentialsSaved = true
      console.log('✅ Credentials saved successfully')
    }
    }

    // Step 3: Register webhooks if enabled
    let webhooksRegistered = false
    if (syncOptions.enableWebhooks) {
      console.log('🔔 Registering webhooks...')
      
      const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9999'}/api/cin7/webhook`
      const webhookResult = await cin7.subscribeToWebhooks(webhookUrl)
      
      if (webhookResult.success) {
        webhooksRegistered = true
        console.log('✅ Webhooks registered successfully')
        
        // Save webhook status (skip for dev bypass)
        if (!devBypass) {
          await supabase
            .from('cin7_credentials')
            .update({
              webhook_url: webhookUrl,
              webhook_status: 'active'
            })
            .eq('barbershop_id', barbershop.id)
        }
      } else {
        console.warn('⚠️ Webhook registration failed:', webhookResult.error)
        // Continue without webhooks - not critical
      }
    }

    // Step 4: Initial sync (optional - can be done separately)
    let initialSyncData = null
    if (options.performInitialSync !== false) {
      console.log('🔄 Starting initial sync...')
      
      try {
        const syncResult = await cin7.syncInventory()
        
        if (syncResult.success) {
          // Save products to database (skip for dev bypass)
          if (!devBypass) {
            for (const product of syncResult.inventory) {
              await supabase
                .from('products')
                .upsert({
                barbershop_id: barbershop.id,
                cin7_product_id: product.cin7_id,
                sku: product.sku,
                name: product.name,
                description: product.description,
                category: product.category,
                brand: product.brand,
                cost_price: product.unit_cost,
                retail_price: product.retail_price,
                current_stock: product.current_stock,
                min_stock_level: product.min_stock,
                max_stock_level: product.max_stock,
                cin7_barcode: product.barcode,
                cin7_last_sync: new Date().toISOString(),
                cin7_sync_enabled: true
              }, {
                onConflict: 'sku,barbershop_id'
              })
            }
          }
          
          initialSyncData = {
            itemsSynced: syncResult.itemsSynced,
            lowStockCount: syncResult.inventory.filter(p => p.current_stock <= p.min_stock).length,
            outOfStockCount: syncResult.inventory.filter(p => p.current_stock === 0).length
          }
          
          console.log(`✅ Synced ${syncResult.itemsSynced} products`)
        }
      } catch (syncError) {
        console.error('⚠️ Initial sync failed:', syncError)
        // Continue - sync can be retried later
      }
    }

    // Step 5: Update connection status (skip for dev bypass)
    if (!devBypass) {
      await supabase
        .from('cin7_credentials')
        .update({
          last_sync: new Date().toISOString(),
          last_sync_status: 'success'
        })
        .eq('barbershop_id', barbershop.id)
    }

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'CIN7 setup completed successfully',
      accountName: testResult.accountName,
      credentialsSaved,
      webhooksRegistered,
      syncOptions,
      initialSync: initialSyncData,
      nextSteps: [
        webhooksRegistered ? null : 'Manual webhook setup may be required',
        initialSyncData ? null : 'Run initial sync to import products',
        'Configure sync frequency in settings'
      ].filter(Boolean)
    })

  } catch (error) {
    console.error('❌ Setup failed:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Setup failed',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
}

// GET endpoint to check setup status
export async function GET(request) {
  try {
    const supabase = createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ 
        isSetup: false,
        error: 'Not authenticated' 
      }, { status: 401 })
    }

    // Check if CIN7 is set up
    const { data: barbershop } = await supabase
      .from('barbershops')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (!barbershop) {
      return NextResponse.json({ 
        isSetup: false,
        error: 'No barbershop found' 
      })
    }

    const { data: credentials } = await supabase
      .from('cin7_credentials')
      .select('account_name, is_active, last_sync, sync_settings')
      .eq('barbershop_id', barbershop.id)
      .eq('is_active', true)
      .single()

    if (!credentials) {
      return NextResponse.json({ 
        isSetup: false,
        message: 'CIN7 not configured' 
      })
    }

    return NextResponse.json({
      isSetup: true,
      accountName: credentials.account_name,
      lastSync: credentials.last_sync,
      syncSettings: credentials.sync_settings,
      isActive: credentials.is_active
    })

  } catch (error) {
    console.error('Status check failed:', error)
    return NextResponse.json({
      isSetup: false,
      error: error.message
    }, { status: 500 })
  }
}