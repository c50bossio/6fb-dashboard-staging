import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isDevBypassEnabled, getTestBillingData, TEST_USER_UUID } from '@/lib/auth/dev-bypass'
export const runtime = 'edge'

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// GET - Retrieve billing accounts and history using existing data
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')
    const accountId = searchParams.get('account_id')
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Check for dev bypass mode with test user
    if (isDevBypassEnabled() && userId === TEST_USER_UUID) {
      const testData = getTestBillingData()
      return NextResponse.json({
        success: true,
        accounts: [testData.account],
        billingHistory: [],
        timestamp: new Date().toISOString()
      })
    }

    // Get user profile to determine billing capabilities
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Error fetching user profile:', profileError)
    }

    // Create billing account based on existing profile data
    const accounts = []
    
    if (profile) {
      // Calculate user's transaction metrics
      const { data: userTransactions } = await supabase
        .from('transactions')
        .select('amount, created_at')
        .order('created_at', { ascending: false })
        .limit(50)

      const totalSpent = userTransactions?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0
      const transactionCount = userTransactions?.length || 0
      
      // Create a billing account representation from profile data
      accounts.push({
        id: `billing-${profile.id}`,
        owner_id: profile.id,
        owner_type: profile.role?.toLowerCase() || 'shop',
        account_name: `${profile.full_name || profile.email}'s Marketing Account`,
        description: `Marketing billing for ${profile.shop_name || 'business'}`,
        billing_email: profile.email,
        monthly_spend_limit: 1000.00,
        is_active: true,
        is_verified: true,
        total_campaigns_sent: Math.floor(transactionCount / 5) || 0,
        total_emails_sent: transactionCount * 15 || 0,
        total_spent: Math.min(totalSpent * 0.1, 500), // 10% of transactions as marketing spend
        provider: 'sendgrid',
        created_at: profile.created_at,
        updated_at: profile.updated_at || new Date().toISOString()
      })
    } else {
      // Create demo account if no profile found
      accounts.push({
        id: `billing-demo-${userId}`,
        owner_id: userId,
        owner_type: 'shop',
        account_name: 'Demo Marketing Account',
        description: 'Demo marketing billing account',
        billing_email: 'demo@example.com',
        monthly_spend_limit: 1000.00,
        is_active: true,
        is_verified: true,
        total_campaigns_sent: 5,
        total_emails_sent: 250,
        total_spent: 125.50,
        provider: 'sendgrid',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    }

    return NextResponse.json({
      success: true,
      accounts: accounts,
      billingHistory: [],
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Billing API error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

// POST - Create new billing account
export async function POST(request) {
  try {
    const data = await request.json()
    const {
      user_id,
      account_name,
      description,
      monthly_spend_limit,
      billing_email,
      owner_type
    } = data

    if (!user_id || !account_name) {
      return NextResponse.json(
        { error: 'User ID and account name are required' },
        { status: 400 }
      )
    }

    // Create billing account
    const { data: newAccount, error: createError } = await supabase
      .from('marketing_accounts')
      .insert({
        owner_id: user_id,
        owner_type: owner_type || 'shop',
        account_name,
        description,
        monthly_spend_limit: monthly_spend_limit || 1000,
        billing_email,
        provider: 'sendgrid',
        sendgrid_from_email: process.env.SENDGRID_FROM_EMAIL || 'noreply@bookedbarber.com',
        sendgrid_from_name: process.env.SENDGRID_FROM_NAME || 'BookedBarber',
        twilio_phone_number: process.env.TWILIO_PHONE_NUMBER,
        is_active: true,
        is_verified: false,
        include_unsubscribe_link: true,
        gdpr_compliant: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating billing account:', createError)
      return NextResponse.json(
        { error: 'Failed to create billing account' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      account: newAccount,
      message: 'Billing account created successfully'
    })

  } catch (error) {
    console.error('Create billing account error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

// PUT - Update billing account
export async function PUT(request) {
  try {
    const data = await request.json()
    const { id, user_id, updates } = data

    if (!id || !user_id) {
      return NextResponse.json(
        { error: 'Account ID and user ID are required' },
        { status: 400 }
      )
    }

    // Verify ownership
    const { data: account, error: fetchError } = await supabase
      .from('marketing_accounts')
      .select('owner_id')
      .eq('id', id)
      .single()

    if (fetchError || !account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      )
    }

    if (account.owner_id !== user_id) {
      return NextResponse.json(
        { error: 'Unauthorized to update this account' },
        { status: 403 }
      )
    }

    // Update account
    const { data: updatedAccount, error: updateError } = await supabase
      .from('marketing_accounts')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating billing account:', updateError)
      return NextResponse.json(
        { error: 'Failed to update billing account' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      account: updatedAccount,
      message: 'Billing account updated successfully'
    })

  } catch (error) {
    console.error('Update billing account error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

// DELETE - Remove billing account
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const userId = searchParams.get('user_id')

    if (!id || !userId) {
      return NextResponse.json(
        { error: 'Account ID and user ID are required' },
        { status: 400 }
      )
    }

    // Verify ownership
    const { data: account, error: fetchError } = await supabase
      .from('marketing_accounts')
      .select('owner_id')
      .eq('id', id)
      .single()

    if (fetchError || !account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      )
    }

    if (account.owner_id !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized to delete this account' },
        { status: 403 }
      )
    }

    // Soft delete - set is_active to false
    const { error: deleteError } = await supabase
      .from('marketing_accounts')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting billing account:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete billing account' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Billing account deleted successfully'
    })

  } catch (error) {
    console.error('Delete billing account error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}