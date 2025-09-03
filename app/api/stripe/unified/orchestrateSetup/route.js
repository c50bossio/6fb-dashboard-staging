import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// Create Supabase client with service role for API operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase configuration for Stripe API')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

/**
 * POST /api/stripe/unified/orchestrateSetup
 * 
 * Orchestrates the complete Stripe Connect setup flow:
 * 1. Checks if account exists
 * 2. Creates new account if needed
 * 3. Returns onboarding URL for immediate use
 */
export async function POST(request) {
  console.log('🚀 [STRIPE API] orchestrateSetup called at:', new Date().toISOString())
  
  try {
    // PHASE 1: Environment Variable Validation
    console.log('🔧 [STRIPE API] Validating environment variables...')
    const requiredEnvVars = {
      'STRIPE_SECRET_KEY': process.env.STRIPE_SECRET_KEY,
      'NEXT_PUBLIC_SUPABASE_URL': process.env.NEXT_PUBLIC_SUPABASE_URL,
      'SUPABASE_SERVICE_ROLE_KEY': process.env.SUPABASE_SERVICE_ROLE_KEY
    }
    
    const missingVars = []
    const presentVars = []
    
    for (const [name, value] of Object.entries(requiredEnvVars)) {
      if (!value) {
        missingVars.push(name)
      } else {
        presentVars.push(`${name}: ${value.substring(0, 10)}...`)
      }
    }
    
    console.log('✅ [STRIPE API] Present environment variables:', presentVars)
    
    if (missingVars.length > 0) {
      console.error('❌ [STRIPE API] Missing required environment variables:', missingVars)
      return NextResponse.json(
        { 
          error: 'Server configuration error: Missing required environment variables',
          details: `Missing: ${missingVars.join(', ')}`,
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      )
    }
    
    console.log('✅ [STRIPE API] All required environment variables are present')

    // PHASE 2: Stripe API Connection Test
    console.log('🔧 [STRIPE API] Testing Stripe API connectivity...')
    try {
      // Simple API call to test connection - get account info (should fail gracefully if API key invalid)
      const testStripe = new Stripe(process.env.STRIPE_SECRET_KEY)
      console.log('✅ [STRIPE API] Stripe client initialized successfully')
      
      // Test basic API functionality with a simple balance retrieval (low-cost test)
      console.log('🔧 [STRIPE API] Testing Stripe API key validity with balance check...')
      const balance = await testStripe.balance.retrieve()
      console.log('✅ [STRIPE API] Stripe API key is valid - balance retrieved:', {
        available: balance.available?.length || 0,
        pending: balance.pending?.length || 0
      })
      
    } catch (stripeInitError) {
      console.error('❌ [STRIPE API] Failed to initialize Stripe client or API test failed:', stripeInitError)
      return NextResponse.json(
        { 
          error: 'Stripe API configuration error',
          details: stripeInitError.message,
          code: stripeInitError.code || 'UNKNOWN',
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      )
    }
    
    const body = await request.json()
    const { 
      barbershopId, 
      businessInfo 
    } = body

    console.log('📊 [STRIPE API] Request payload:', {
      barbershopId,
      businessInfo,
      headers: Object.fromEntries(request.headers.entries())
    })

    // PHASE 3: Request Payload Validation
    console.log('🔧 [STRIPE API] Validating request payload...')
    
    if (!barbershopId || !businessInfo) {
      console.error('❌ [STRIPE API] Missing required fields:', { 
        barbershopId: !!barbershopId, 
        businessInfo: !!businessInfo,
        barbershopIdValue: barbershopId,
        businessInfoValue: businessInfo
      })
      return NextResponse.json(
        { error: 'barbershopId and businessInfo are required' },
        { status: 400 }
      )
    }
    
    // Validate businessInfo structure
    const requiredBusinessFields = ['name', 'type']
    const missingBusinessFields = requiredBusinessFields.filter(field => !businessInfo[field])
    
    if (missingBusinessFields.length > 0) {
      console.error('❌ [STRIPE API] Missing required business fields:', {
        missing: missingBusinessFields,
        received: businessInfo
      })
      return NextResponse.json(
        { 
          error: 'Missing required business information fields',
          details: `Missing: ${missingBusinessFields.join(', ')}`,
          received: businessInfo
        },
        { status: 400 }
      )
    }
    
    console.log('✅ [STRIPE API] Request payload validation passed')

    // Handle Bearer token authentication - with development mode bypass
    const isDevelopment = process.env.NODE_ENV === 'development'
    const authHeader = request.headers.get('authorization');
    
    let user = null
    
    if (isDevelopment && !authHeader) {
      console.log('🔧 [STRIPE API] Development mode - bypassing authentication (no auth header)')
      // Create mock user for development mode
      user = {
        id: 'dev-user-12345',
        email: 'dev@example.com'
      }
      console.log('✅ [STRIPE API] Using development mode mock user:', user.email, 'for barbershop:', barbershopId)
    } else {
      // Production authentication flow
      if (!authHeader) {
        return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 });
      }

      const token = authHeader.replace('Bearer ', '');
      
      // Get user from the token using service role client
      const { data: { user: authUser }, error: userError } = await supabase.auth.getUser(token)
      if (userError || !authUser) {
        console.error('Authentication error:', userError)
        return NextResponse.json({ 
          error: 'Invalid authentication token', 
          details: userError?.message 
        }, { status: 401 })
      }

      user = authUser
      console.log('✅ Authenticated user:', user.email, 'for barbershop:', barbershopId)
    }

    // Get barbershop information - with development mode bypass
    let barbershop = null
    
    if (isDevelopment && !authHeader) {
      console.log('🔧 [STRIPE API] Development mode - using mock barbershop data')
      // Create mock barbershop for development mode
      barbershop = {
        id: barbershopId,
        name: 'Downtown Barbershop (DEV)',
        owner_id: user.id,
        address: '123 Main St',
        city: 'Downtown',
        state: 'CA',
        zip_code: '90210'
      }
      console.log('✅ [STRIPE API] Using development mode mock barbershop:', barbershop.name)
    } else {
      // Production barbershop lookup
      console.log('🔍 [STRIPE API] Fetching barbershop data for ID:', barbershopId)
      const { data: barbershopData, error: shopError } = await supabase
        .from('barbershops')
        .select('id, name, owner_id, address, city, state, zip_code')
        .eq('id', barbershopId)
        .single()

      if (shopError) {
        console.error('❌ [STRIPE API] Barbershop query error:', shopError)
        return NextResponse.json(
          { error: 'Database error while fetching barbershop', details: shopError.message },
          { status: 500 }
        )
      }

      if (!barbershopData) {
        console.error('❌ [STRIPE API] Barbershop not found for ID:', barbershopId)
        return NextResponse.json(
          { error: 'Barbershop not found' },
          { status: 404 }
        )
      }
      
      barbershop = barbershopData
      console.log('✅ [STRIPE API] Found barbershop:', barbershop.name)
    }

    // Verify user has permission - with development mode bypass
    let profile = null
    
    if (isDevelopment && !authHeader) {
      console.log('🔧 [STRIPE API] Development mode - using mock profile data')
      // Create mock profile for development mode
      profile = {
        id: user.id,
        barbershop_id: barbershopId,
        role: 'SHOP_OWNER'
      }
      console.log('✅ [STRIPE API] Using development mode mock profile:', profile)
    } else {
      // Production profile lookup
      console.log('🔍 [STRIPE API] Checking user permissions for user ID:', user.id)
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, barbershop_id, role')
        .eq('id', user.id)
        .single()

      if (profileError) {
        console.error('❌ [STRIPE API] Profile query error:', profileError)
        return NextResponse.json(
          { error: 'Error fetching user profile', details: profileError.message },
          { status: 500 }
        )
      }
      
      profile = profileData
    }

    console.log('📊 [STRIPE API] User profile:', {
      userId: user.id,
      profileBarbershopId: profile?.barbershop_id,
      userRole: profile?.role,
      barbershopOwnerId: barbershop.owner_id
    })

    const hasPermission = profile?.barbershop_id === barbershopId || 
                         profile?.role === 'SUPER_ADMIN' ||
                         barbershop.owner_id === user.id

    if (!hasPermission) {
      console.error('❌ [STRIPE API] Access denied for user:', user.email, 'to barbershop:', barbershopId)
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    console.log('✅ [STRIPE API] Permission granted for user:', user.email)

    // PHASE 4: Database Schema Validation - with development mode bypass
    if (isDevelopment && !authHeader) {
      console.log('🔧 [STRIPE API] Development mode - skipping database schema validation')
      console.log('✅ [STRIPE API] Database schema validation bypassed for development')
    } else {
      // Production database schema validation
      console.log('🔧 [STRIPE API] Validating database schema...')
      try {
        // Test if stripe_accounts table exists by attempting to query it with a limit
        const { data: schemaTest, error: schemaError } = await supabase
          .from('stripe_accounts')
          .select('account_id')
          .limit(1)
        
        if (schemaError) {
          console.error('❌ [STRIPE API] Database schema error - stripe_accounts table issue:', schemaError)
          return NextResponse.json(
            { 
              error: 'Database schema error: stripe_accounts table not accessible',
              details: schemaError.message,
              timestamp: new Date().toISOString()
            },
            { status: 500 }
          )
        }
        
        console.log('✅ [STRIPE API] Database schema validation passed - stripe_accounts table accessible')
        
      } catch (dbError) {
        console.error('❌ [STRIPE API] Database connection error:', dbError)
        return NextResponse.json(
          { 
            error: 'Database connection error',
            details: dbError.message,
            timestamp: new Date().toISOString()
          },
          { status: 500 }
        )
      }
    }

    // Check if Stripe account already exists - with development mode bypass
    let existingAccount = null
    let stripeAccountId = null
    
    if (isDevelopment && !authHeader) {
      console.log('🔧 [STRIPE API] Development mode - using mock Stripe account data')
      // Create mock existing account data (no existing account, so we create new one)
      existingAccount = null
      stripeAccountId = null
      console.log('📊 [STRIPE API] Development mode mock - no existing Stripe account, will create new one')
    } else {
      // Production Stripe account lookup
      console.log('🔍 [STRIPE API] Checking for existing Stripe account for barbershop:', barbershopId)
      const { data: existingAccountData } = await supabase
        .from('stripe_accounts')
        .select('account_id, onboarding_completed, charges_enabled')
        .eq('barbershop_id', barbershopId)
        .single()

      existingAccount = existingAccountData
      stripeAccountId = existingAccount?.account_id
      
      console.log('📊 [STRIPE API] Existing Stripe account data:', {
        exists: !!existingAccount,
        accountId: existingAccount?.account_id,
        onboardingCompleted: existingAccount?.onboarding_completed,
        chargesEnabled: existingAccount?.charges_enabled
      })

      // If account exists and is fully onboarded, return dashboard link
      if (existingAccount && existingAccount.onboarding_completed && existingAccount.charges_enabled) {
        console.log('✅ [STRIPE API] Account already onboarded, creating dashboard link for:', stripeAccountId)
        try {
          const loginLink = await stripe.accounts.createLoginLink(stripeAccountId)
          console.log('🔗 [STRIPE API] Dashboard link created successfully')
          return NextResponse.json({
            success: true,
            setup_url: loginLink.url,
            account_id: stripeAccountId,
            status: 'completed',
            message: 'Account already onboarded, returning dashboard link'
          })
        } catch (dashboardError) {
          console.error('❌ [STRIPE API] Error creating dashboard link:', dashboardError)
          // Continue to create new onboarding link instead
        }
      }
    }

    // Create new Stripe account if doesn't exist - with development mode bypass
    if (!stripeAccountId) {
      if (isDevelopment && !authHeader) {
        console.log('🔧 [STRIPE API] Development mode - mocking Stripe account creation')
        // Mock Stripe account creation for development
        stripeAccountId = 'acct_dev_mock_account_123'
        console.log('✅ [STRIPE API] Development mode mock Stripe account:', stripeAccountId)
        console.log('✅ [STRIPE API] Skipping database save in development mode')
      } else {
        // Production Stripe account creation
        console.log('🆕 [STRIPE API] Creating new Stripe Connect account for barbershop:', barbershopId)
        console.log('📊 [STRIPE API] Account creation parameters:', {
          email: user.email,
          businessType: businessInfo.type === 'company' ? 'company' : 'individual',
          businessName: businessInfo.name || barbershop.name,
          businessUrl: businessInfo.url || `https://bookedbarber.com/shop/${barbershopId}`,
          supportPhone: businessInfo.phone
        })
        
        const connectAccount = await stripe.accounts.create({
          type: 'standard',
          email: user.email,
          business_type: businessInfo.type === 'company' ? 'company' : 'individual',
          business_profile: {
            name: businessInfo.name || barbershop.name,
            mcc: '7230', // Barber shops MCC
            url: businessInfo.url || `https://bookedbarber.com/shop/${barbershopId}`,
            support_phone: businessInfo.phone
          },
          metadata: {
            barbershop_id: barbershopId,
            created_by: user.id,
            platform: 'bookedbarber',
            setup_type: 'orchestrated'
          }
        })

        stripeAccountId = connectAccount.id
        console.log('✅ [STRIPE API] Stripe Connect account created:', stripeAccountId)

        // Save to database
        console.log('💾 [STRIPE API] Saving Stripe account to database...')
        const { error: saveError } = await supabase
          .from('stripe_accounts')
          .upsert({
            barbershop_id: barbershopId,
            account_id: stripeAccountId,
            onboarding_completed: false,
            charges_enabled: false,
            payouts_enabled: false,
            details_submitted: false,
            created_by: user.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })

        if (saveError) {
          console.error('❌ [STRIPE API] Error saving Stripe account to database:', saveError)
          // Try to delete the orphaned Stripe account
          try {
            console.log('🗑️ [STRIPE API] Attempting to delete orphaned Stripe account:', stripeAccountId)
            await stripe.accounts.del(stripeAccountId)
            console.log('✅ [STRIPE API] Orphaned Stripe account deleted successfully')
          } catch (deleteError) {
            console.error('❌ [STRIPE API] Error deleting orphaned Stripe account:', deleteError)
          }
          throw new Error('Failed to save account information')
        }
        
        console.log('✅ [STRIPE API] Stripe account saved to database successfully')
      }
    }

    // Create onboarding link - with development mode bypass
    let accountLink
    const returnUrl = `${request.nextUrl.origin}/finance?onboarding=complete`
    const refreshUrl = `${request.nextUrl.origin}/finance?refresh=true`
    
    if (isDevelopment && !authHeader) {
      console.log('🔧 [STRIPE API] Development mode - mocking onboarding link creation')
      // Mock onboarding link for development
      accountLink = {
        url: 'https://connect.stripe.com/dev-mock-onboarding-link',
        expires_at: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
      }
      console.log('✅ [STRIPE API] Development mode mock onboarding link:', accountLink.url)
      console.log('✅ [STRIPE API] Skipping database update in development mode')
    } else {
      // Production onboarding link creation
      console.log('🔗 [STRIPE API] Creating onboarding link with URLs:', {
        returnUrl,
        refreshUrl,
        accountId: stripeAccountId
      })
      
      accountLink = await stripe.accountLinks.create({
        account: stripeAccountId,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: 'account_onboarding'
      })

      console.log('✅ [STRIPE API] Onboarding link created:', {
        url: accountLink.url,
        expiresAt: accountLink.expires_at
      })

      // Update database with onboarding attempt
      console.log('💾 [STRIPE API] Updating database with onboarding attempt...')
      const { error: updateError } = await supabase
        .from('stripe_accounts')
        .update({
          updated_at: new Date().toISOString()
        })
        .eq('account_id', stripeAccountId)

      if (updateError) {
        console.error('⚠️ [STRIPE API] Error updating database with onboarding attempt:', updateError)
        // Don't fail the request for this non-critical update
      } else {
        console.log('✅ [STRIPE API] Database updated with onboarding attempt')
      }
    }

    const successResponse = {
      success: true,
      setup_url: accountLink.url,
      account_id: stripeAccountId,
      status: 'onboarding_required',
      expires_at: accountLink.expires_at,
      message: 'Stripe Connect setup initiated successfully'
    }

    console.log('🎉 [STRIPE API] Returning success response:', successResponse)

    return NextResponse.json(successResponse)

  } catch (error) {
    console.error('💥 [STRIPE API] CRITICAL ERROR in orchestrateSetup:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code || 'UNKNOWN'
    })
    
    const errorResponse = { 
      error: error.message || 'Failed to orchestrate Stripe setup',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      timestamp: new Date().toISOString()
    }
    
    console.error('🚨 [STRIPE API] Returning error response:', errorResponse)
    
    return NextResponse.json(errorResponse, { status: 500 })
  }
}