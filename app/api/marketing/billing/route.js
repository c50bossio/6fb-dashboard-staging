import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isDevBypassEnabled, getTestBillingData, TEST_USER_UUID } from '@/lib/auth/dev-bypass'

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// GET - Retrieve billing accounts and history using real database
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

    // Get real marketing accounts from database
    const { data: accounts, error: accountsError } = await supabase
      .from('marketing_accounts')
      .select('*')
      .or(`owner_id.eq.${userId},owner_id.eq.demo-user-001`)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (accountsError) {
      console.error('Error fetching marketing accounts:', accountsError)
      return NextResponse.json({
        success: true,
        accounts: [],
        billingHistory: [],
        timestamp: new Date().toISOString()
      })
    }

    // If no accounts exist for this user, create a default one
    if (!accounts || accounts.length === 0) {
      // Get user profile for account creation
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      const newAccount = {
        owner_id: userId,
        owner_type: profile?.role?.toLowerCase() || 'shop',
        account_name: `${profile?.full_name || profile?.email || 'Your'} Marketing Account`,
        description: `Marketing account for ${profile?.shop_name || 'your business'}`,
        billing_email: profile?.email || 'demo@example.com',
        sendgrid_from_email: profile?.email || 'noreply@bookedbarber.com',
        sendgrid_from_name: profile?.shop_name || 'Your Business',
        monthly_spend_limit: 1000.00,
        is_active: true,
        is_verified: false,
        provider: 'sendgrid'
      }

      const { data: createdAccount, error: createError } = await supabase
        .from('marketing_accounts')
        .insert(newAccount)
        .select()
        .single()

      if (!createError && createdAccount) {
        accounts.push(createdAccount)
      }
    }

    // Get billing history from marketing_billing_records
    const { data: billingHistory } = await supabase
      .from('marketing_billing_records')
      .select('*')
      .in('account_id', accounts.map(a => a.id))
      .order('created_at', { ascending: false })
      .limit(20)

    return NextResponse.json({
      success: true,
      accounts: accounts || [],
      billingHistory: billingHistory || [],
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