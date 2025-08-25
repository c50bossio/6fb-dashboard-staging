/**
 * Simplified CIN7 Setup API
 * Single endpoint to handle complete setup flow
 */

import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { Cin7Client, encrypt } from '@/lib/cin7-client.js'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function POST(request) {
  try {
    // Check for dev bypass in headers (from localStorage)
    const devBypass = request.headers.get('x-dev-bypass') === 'true' || 
                     process.env.NODE_ENV === 'development'
    
    // Use service role client in dev mode to bypass RLS
    const supabase = devBypass ? 
      createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY) :
      createClient()
    
    let user = null
    
    if (devBypass) {
      // Use mock user for development - use actual user ID from database
      user = {
        id: 'bcea9cf9-e593-4dbf-a787-1ed74e04dbf5', // Actual user c50bossio@gmail.com
        email: 'c50bossio@gmail.com'
      }
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


    // Get user's barbershop using same logic as sync endpoint
    let barbershop = null
    
    // Method 1: Check profile for shop_id or barbershop_id first (most reliable)
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, shop_id, barbershop_id, email')
      .or(`(id.eq.${user.id}),(email.eq.${user.email})`)
      .single()
    
    if (profile && (profile.shop_id || profile.barbershop_id)) {
      const shopId = profile.shop_id || profile.barbershop_id
      const { data: profileShop } = await supabase
        .from('barbershops')
        .select('id, name')
        .eq('id', shopId)
        .single()
      
      if (profileShop) {
        barbershop = profileShop
        console.log('Found barbershop via profile:', profileShop.name)
      }
    }
    
    // Method 2: Check if user owns a barbershop (fallback)
    if (!barbershop) {
      const { data: userBarbershop } = await supabase
        .from('barbershops')
        .select('id, name')
        .eq('owner_id', profile?.id || user.id)
        .single()
      
      if (userBarbershop) {
        barbershop = userBarbershop
        console.log('Found barbershop via ownership:', userBarbershop.name)
      }
    }
    
    // Method 3: Check barbershop_staff table (for employees)
    if (!barbershop) {
      const { data: staffRecord } = await supabase
        .from('barbershop_staff')
        .select('barbershop_id')
        .eq('user_id', profile?.id || user.id)
        .single()
      
      if (staffRecord?.barbershop_id) {
        const { data: staffShop } = await supabase
          .from('barbershops')
          .select('id, name')
          .eq('id', staffRecord.barbershop_id)
          .single()
        
        if (staffShop) {
          barbershop = staffShop
          console.log('Found barbershop via staff association:', staffShop.name)
        }
      }
    }
    
    if (!barbershop) {
      console.error('No barbershop found for user:', {
        userId: user.id,
        userEmail: user.email,
        profileId: profile?.id,
        profileShopId: profile?.shop_id,
        profileBarbershopId: profile?.barbershop_id
      })
      
      // Provide helpful error message based on what we found
      let errorMessage = 'No barbershop found for your account'
      let helpText = 'Please complete your barbershop setup first'
      
      if (!profile) {
        errorMessage = 'User profile not found'
        helpText = 'Please ensure you are logged in and have completed account setup'
      } else if (!profile.shop_id && !profile.barbershop_id) {
        errorMessage = 'No barbershop associated with your profile'
        helpText = 'Please complete the onboarding process to create or join a barbershop first'
      } else {
        errorMessage = 'Barbershop not found in database'
        helpText = 'Your profile references a barbershop that may have been deleted. Please contact support'
      }
      
      return NextResponse.json({ 
        success: false,
        error: errorMessage,
        message: helpText,
        nextSteps: [
          'Complete barbershop onboarding if not done',
          'Verify you are logged into the correct account',
          'Contact support if this issue persists'
        ],
        debug: process.env.NODE_ENV === 'development' ? {
          userId: user.id,
          userEmail: user.email,
          profileFound: !!profile,
          shopId: profile?.shop_id,
          barbershopId: profile?.barbershop_id,
          devBypass: devBypass
        } : undefined
      }, { status: 404 })
    }

    // Step 1: Encrypt and save credentials FIRST (so they're available for future attempts)
    let credentialsSaved = false
    let connectionTestPassed = false
    let testResult = { success: false, message: 'Connection not tested yet' }
    
    // Always save credentials to database first
    {
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
            account_name: accountName,
            is_active: false, // Mark as inactive until connection test passes
            updated_at: new Date().toISOString()
          })
          .eq('id', existingCreds.id)

        if (updateError) {
          console.error('❌ Failed to update credentials:', updateError)
          throw updateError
        }
        credentialsSaved = true
      } else {
        // Insert new credentials
        const { error: insertError } = await supabase
          .from('cin7_credentials')
          .insert({
            barbershop_id: barbershop.id,
            encrypted_account_id: JSON.stringify(encryptedAccountId),
            encrypted_api_key: JSON.stringify(encryptedApiKey),
            account_name: accountName,
            is_active: false // Mark as inactive until connection test passes
          })

        if (insertError) {
          console.error('❌ Failed to save credentials:', insertError)
          throw insertError
        }
        credentialsSaved = true
      }
    }

    // Step 2: Test connection AFTER saving credentials
    const cin7 = new Cin7Client(accountId, apiKey)
    testResult = await cin7.testConnection()
    connectionTestPassed = testResult.success
    
    // Step 3: Update credential status based on connection test
    if (connectionTestPassed) {
      await supabase
        .from('cin7_credentials')
        .update({
          is_active: true,
          account_name: testResult.accountName || accountName,
          last_tested: new Date().toISOString()
        })
        .eq('barbershop_id', barbershop.id)
    }

    // Step 3: Register webhooks if enabled
    let webhooksRegistered = false
    if (syncOptions.enableWebhooks) {
      
      const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9999'}/api/cin7/webhook`
      const webhookResult = await cin7.subscribeToWebhooks(webhookUrl)
      
      if (webhookResult.success) {
        webhooksRegistered = true
        
        // Save webhook status
        await supabase
          .from('cin7_credentials')
          .update({
            webhook_url: webhookUrl,
            webhook_status: 'active'
          })
          .eq('barbershop_id', barbershop.id)
      } else {
        console.warn('⚠️ Webhook registration failed:', webhookResult.error)
        // Continue without webhooks - not critical
      }
    }

    // Step 4: Initial sync (optional - can be done separately)
    let initialSyncData = null
    if (options.performInitialSync !== false) {
      
      try {
        const syncResult = await cin7.syncInventory()
        
        if (syncResult.success) {
          // Save products to database
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
          
          initialSyncData = {
            itemsSynced: syncResult.itemsSynced,
            lowStockCount: syncResult.inventory.filter(p => p.current_stock <= p.min_stock).length,
            outOfStockCount: syncResult.inventory.filter(p => p.current_stock === 0).length
          }
          
        }
      } catch (syncError) {
        console.error('⚠️ Initial sync failed:', syncError)
        // Continue - sync can be retried later
      }
    }

    // Step 5: Update connection status
    await supabase
      .from('cin7_credentials')
      .update({
        last_sync: new Date().toISOString(),
        last_sync_status: 'success'
      })
      .eq('barbershop_id', barbershop.id)

    // Return response based on what succeeded
    if (credentialsSaved && connectionTestPassed) {
      // Perfect - everything worked
      return NextResponse.json({
        success: true,
        message: 'CIN7 setup completed successfully',
        accountName: testResult.accountName,
        credentialsSaved,
        connectionTested: true,
        webhooksRegistered,
        initialSync: initialSyncData,
        nextSteps: [
          webhooksRegistered ? null : 'Manual webhook setup may be required',
          initialSyncData ? null : 'Run initial sync to import products',
          'Configure sync frequency in settings'
        ].filter(Boolean)
      })
    } else if (credentialsSaved && !connectionTestPassed) {
      // Credentials saved but connection failed - partial success
      return NextResponse.json({
        success: true, // Still success because credentials were saved
        message: 'Credentials saved successfully, but connection test failed',
        warning: 'Please verify your Account ID and API Key are correct',
        accountName: accountName,
        credentialsSaved,
        connectionTested: false,
        connectionError: testResult.message || testResult.error,
        webhooksRegistered: false,
        nextSteps: [
          'Verify your Cin7 Account ID and API Key',
          'Test connection again from Product Management page',
          'Run sync once connection is working'
        ]
      })
    } else {
      // Credentials failed to save
      return NextResponse.json({
        success: false,
        error: 'Failed to save credentials',
        message: 'Credentials could not be saved to database',
        credentialsSaved,
        connectionTested: connectionTestPassed
      }, { status: 500 })
    }

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