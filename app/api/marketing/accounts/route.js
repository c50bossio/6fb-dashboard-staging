import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy')

// GET - Fetch marketing accounts based on user role
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')
    const accountType = searchParams.get('type') // 'barber', 'shop', 'enterprise'
    const limit = parseInt(searchParams.get('limit')) || 50
    const offset = parseInt(searchParams.get('offset')) || 0

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Get user's role and permissions
    const { data: user } = await supabase
      .from('profiles')
      .select('id, role, barbershop_id, enterprise_id')
      .eq('id', userId)
      .single()

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Ensure marketing_accounts table exists
    await ensureMarketingAccountsTable()

    // Build query based on permissions
    let query = supabase
      .from('marketing_accounts')
      .select(`
        *,
        payment_methods:marketing_payment_methods(
          id,
          stripe_payment_method_id,
          card_brand,
          card_last4,
          is_default,
          created_at
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Filter based on user role and access
    if (user.role === 'enterprise_owner') {
      // Enterprise owners can see all accounts in their enterprise
      if (user.enterprise_id) {
        const { data: shopIds } = await supabase
          .from('barbershops')
          .select('id')
          .eq('enterprise_id', user.enterprise_id)
        
        const shopIdList = shopIds?.map(s => s.id) || []
        
        query = query.or(`owner_id.eq.${userId},barbershop_id.in.(${shopIdList.join(',')})`)
      } else {
        query = query.eq('owner_id', userId)
      }
    } else if (user.role === 'shop_owner') {
      // Shop owners can see shop accounts and their personal accounts
      query = query.or(`owner_id.eq.${userId},barbershop_id.eq.${user.barbershop_id}`)
    } else {
      // Barbers see only their own accounts and accounts they're authorized to use
      query = query.or(`owner_id.eq.${userId},authorized_users.cs.[${userId}]`)
    }

    // Apply account type filter if provided
    if (accountType) {
      query = query.eq('owner_type', accountType)
    }

    const { data: accounts, error } = await query

    if (error) {
      console.error('Error fetching marketing accounts:', error)
      return NextResponse.json(
        { error: 'Failed to fetch accounts', details: error.message },
        { status: 500 }
      )
    }

    // Get total count for pagination
    const { count } = await supabase
      .from('marketing_accounts')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', userId)

    return NextResponse.json({
      accounts: accounts || [],
      total: count || 0,
      limit,
      offset,
      hasMore: (count || 0) > offset + limit
    })

  } catch (error) {
    console.error('Error in marketing accounts API:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// POST - Create new billing account with Stripe payment method setup
export async function POST(request) {
  try {
    const body = await request.json()
    const {
      user_id,
      account_name,
      owner_type, // 'barber', 'shop', 'enterprise'
      barbershop_id,
      enterprise_id,
      authorized_users = [],
      require_approval_above = 100, // $100 default threshold
      payment_method_id, // Stripe payment method ID
      make_default = false
    } = body

    if (!user_id || !account_name || !owner_type) {
      return NextResponse.json(
        { error: 'User ID, account name, and owner type are required' },
        { status: 400 }
      )
    }

    // Verify user permissions
    const { data: user } = await supabase
      .from('profiles')
      .select('id, role, barbershop_id, enterprise_id, stripe_customer_id')
      .eq('id', user_id)
      .single()

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Validate owner_type permissions
    if (owner_type === 'enterprise' && user.role !== 'enterprise_owner') {
      return NextResponse.json(
        { error: 'Only enterprise owners can create enterprise accounts' },
        { status: 403 }
      )
    }

    if (owner_type === 'shop' && !['shop_owner', 'enterprise_owner'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Only shop or enterprise owners can create shop accounts' },
        { status: 403 }
      )
    }

    // Create Stripe customer if not exists
    let stripeCustomerId = user.stripe_customer_id
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          user_id: user_id,
          account_type: owner_type
        }
      })
      stripeCustomerId = customer.id

      // Update user profile with Stripe customer ID
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', user_id)
    }

    // Ensure tables exist
    await ensureMarketingAccountsTable()
    await ensurePaymentMethodsTable()

    // Create marketing account
    const { data: account, error: accountError } = await supabase
      .from('marketing_accounts')
      .insert([{
        owner_id: user_id,
        account_name,
        owner_type,
        barbershop_id: owner_type === 'shop' ? (barbershop_id || user.barbershop_id) : null,
        enterprise_id: owner_type === 'enterprise' ? (enterprise_id || user.enterprise_id) : null,
        authorized_users,
        require_approval_above,
        stripe_customer_id: stripeCustomerId,
        is_active: true
      }])
      .select()
      .single()

    if (accountError) {
      console.error('Error creating marketing account:', accountError)
      return NextResponse.json(
        { error: 'Failed to create account', details: accountError.message },
        { status: 500 }
      )
    }

    // If payment method provided, attach it to the customer and account
    if (payment_method_id) {
      try {
        // Attach payment method to customer
        await stripe.paymentMethods.attach(payment_method_id, {
          customer: stripeCustomerId,
        })

        // Get payment method details
        const paymentMethod = await stripe.paymentMethods.retrieve(payment_method_id)

        // Store payment method in database
        const { error: pmError } = await supabase
          .from('marketing_payment_methods')
          .insert([{
            account_id: account.id,
            stripe_payment_method_id: payment_method_id,
            stripe_customer_id: stripeCustomerId,
            card_brand: paymentMethod.card?.brand,
            card_last4: paymentMethod.card?.last4,
            card_exp_month: paymentMethod.card?.exp_month,
            card_exp_year: paymentMethod.card?.exp_year,
            is_default: make_default
          }])

        if (pmError) {
          console.error('Error storing payment method:', pmError)
          // Don't fail the account creation for payment method issues
        }

        // Set as default payment method if requested
        if (make_default) {
          await stripe.customers.update(stripeCustomerId, {
            invoice_settings: {
              default_payment_method: payment_method_id,
            },
          })
        }
      } catch (stripeError) {
        console.error('Stripe payment method error:', stripeError)
        // Don't fail account creation for payment method issues
      }
    }

    return NextResponse.json({
      account,
      message: 'Marketing account created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating marketing account:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// PATCH - Update account details, payment methods, or permissions
export async function PATCH(request) {
  try {
    const body = await request.json()
    const { id, user_id, ...updateData } = body

    if (!id || !user_id) {
      return NextResponse.json(
        { error: 'Account ID and user ID are required' },
        { status: 400 }
      )
    }

    // Verify account exists and user has permission
    const { data: account } = await supabase
      .from('marketing_accounts')
      .select('owner_id, owner_type, authorized_users')
      .eq('id', id)
      .single()

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    // Check permissions
    const hasAccess = await verifyAccountAccess(user_id, id)
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'You do not have permission to modify this account' },
        { status: 403 }
      )
    }

    // Handle payment method updates separately
    if (updateData.add_payment_method) {
      return await addPaymentMethod(id, updateData.add_payment_method)
    }

    if (updateData.remove_payment_method) {
      return await removePaymentMethod(id, updateData.remove_payment_method)
    }

    if (updateData.set_default_payment_method) {
      return await setDefaultPaymentMethod(id, updateData.set_default_payment_method)
    }

    // Update account data
    const { data: updated, error } = await supabase
      .from('marketing_accounts')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating marketing account:', error)
      return NextResponse.json(
        { error: 'Failed to update account', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      account: updated,
      message: 'Account updated successfully'
    })

  } catch (error) {
    console.error('Error updating marketing account:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// DELETE - Soft delete accounts
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

    // Verify account exists and user has permission
    const { data: account } = await supabase
      .from('marketing_accounts')
      .select('owner_id, owner_type')
      .eq('id', id)
      .single()

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    // Only owner can delete account
    if (account.owner_id !== userId) {
      return NextResponse.json(
        { error: 'Only the account owner can delete this account' },
        { status: 403 }
      )
    }

    // Check for active campaigns
    const { data: activeCampaigns } = await supabase
      .from('marketing_campaigns')
      .select('id')
      .eq('billing_account_id', id)
      .in('status', ['active', 'scheduled', 'pending_approval'])
      .limit(1)

    if (activeCampaigns && activeCampaigns.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete account with active campaigns' },
        { status: 400 }
      )
    }

    // Soft delete - deactivate account
    const { error } = await supabase
      .from('marketing_accounts')
      .update({ 
        is_active: false,
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) {
      console.error('Error deleting marketing account:', error)
      return NextResponse.json(
        { error: 'Failed to delete account', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Account deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting marketing account:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// Helper functions

async function ensureMarketingAccountsTable() {
  try {
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS marketing_accounts (
          id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
          owner_id UUID REFERENCES auth.users(id) NOT NULL,
          account_name TEXT NOT NULL,
          owner_type TEXT NOT NULL CHECK (owner_type IN ('barber', 'shop', 'enterprise')),
          barbershop_id UUID REFERENCES barbershops(id),
          enterprise_id UUID REFERENCES enterprises(id),
          authorized_users UUID[] DEFAULT '{}',
          require_approval_above DECIMAL(10,2) DEFAULT 100.00,
          stripe_customer_id TEXT,
          card_brand TEXT,
          card_last4 TEXT,
          is_active BOOLEAN DEFAULT TRUE,
          deleted_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Enable RLS
        ALTER TABLE marketing_accounts ENABLE ROW LEVEL SECURITY;

        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_marketing_accounts_owner_id ON marketing_accounts(owner_id);
        CREATE INDEX IF NOT EXISTS idx_marketing_accounts_barbershop_id ON marketing_accounts(barbershop_id);
        CREATE INDEX IF NOT EXISTS idx_marketing_accounts_enterprise_id ON marketing_accounts(enterprise_id);

        -- RLS Policies
        CREATE POLICY IF NOT EXISTS "Users can view accessible accounts" ON marketing_accounts
          FOR SELECT USING (
            owner_id = auth.uid() OR 
            auth.uid() = ANY(authorized_users) OR
            EXISTS (
              SELECT 1 FROM profiles 
              WHERE profiles.id = auth.uid() 
              AND (
                (profiles.role = 'shop_owner' AND profiles.barbershop_id = marketing_accounts.barbershop_id) OR
                (profiles.role = 'enterprise_owner' AND profiles.enterprise_id = marketing_accounts.enterprise_id)
              )
            )
          );

        CREATE POLICY IF NOT EXISTS "Users can create own accounts" ON marketing_accounts
          FOR INSERT WITH CHECK (auth.uid() = owner_id);

        CREATE POLICY IF NOT EXISTS "Account owners can update" ON marketing_accounts
          FOR UPDATE USING (
            owner_id = auth.uid() OR
            EXISTS (
              SELECT 1 FROM profiles 
              WHERE profiles.id = auth.uid() 
              AND (
                (profiles.role = 'shop_owner' AND profiles.barbershop_id = marketing_accounts.barbershop_id) OR
                (profiles.role = 'enterprise_owner' AND profiles.enterprise_id = marketing_accounts.enterprise_id)
              )
            )
          );
      `
    })

    if (error) {
      console.error('Error creating marketing_accounts table:', error)
    }
  } catch (err) {
    console.error('Error ensuring marketing_accounts table:', err)
  }
}

async function ensurePaymentMethodsTable() {
  try {
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS marketing_payment_methods (
          id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
          account_id UUID REFERENCES marketing_accounts(id) ON DELETE CASCADE NOT NULL,
          stripe_payment_method_id TEXT UNIQUE NOT NULL,
          stripe_customer_id TEXT NOT NULL,
          card_brand TEXT,
          card_last4 TEXT,
          card_exp_month INTEGER,
          card_exp_year INTEGER,
          is_default BOOLEAN DEFAULT FALSE,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Enable RLS
        ALTER TABLE marketing_payment_methods ENABLE ROW LEVEL SECURITY;

        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_payment_methods_account_id ON marketing_payment_methods(account_id);
        CREATE INDEX IF NOT EXISTS idx_payment_methods_stripe_pm_id ON marketing_payment_methods(stripe_payment_method_id);

        -- RLS Policies
        CREATE POLICY IF NOT EXISTS "Users can view account payment methods" ON marketing_payment_methods
          FOR SELECT USING (
            EXISTS (
              SELECT 1 FROM marketing_accounts 
              WHERE marketing_accounts.id = marketing_payment_methods.account_id
              AND (
                marketing_accounts.owner_id = auth.uid() OR 
                auth.uid() = ANY(marketing_accounts.authorized_users)
              )
            )
          );

        CREATE POLICY IF NOT EXISTS "Account owners can manage payment methods" ON marketing_payment_methods
          FOR ALL USING (
            EXISTS (
              SELECT 1 FROM marketing_accounts 
              WHERE marketing_accounts.id = marketing_payment_methods.account_id
              AND marketing_accounts.owner_id = auth.uid()
            )
          );
      `
    })

    if (error) {
      console.error('Error creating marketing_payment_methods table:', error)
    }
  } catch (err) {
    console.error('Error ensuring marketing_payment_methods table:', err)
  }
}

async function verifyAccountAccess(userId, accountId) {
  const { data: account } = await supabase
    .from('marketing_accounts')
    .select('owner_id, authorized_users, barbershop_id, enterprise_id')
    .eq('id', accountId)
    .single()

  if (!account) return false

  // Check if user is owner
  if (account.owner_id === userId) return true

  // Check if user is in authorized users
  if (account.authorized_users?.includes(userId)) return true

  // Check if user is shop/enterprise owner
  const { data: user } = await supabase
    .from('profiles')
    .select('role, barbershop_id, enterprise_id')
    .eq('id', userId)
    .single()

  if (!user) return false

  if (user.role === 'shop_owner' && user.barbershop_id === account.barbershop_id) {
    return true
  }

  if (user.role === 'enterprise_owner' && user.enterprise_id === account.enterprise_id) {
    return true
  }

  return false
}

async function addPaymentMethod(accountId, paymentMethodData) {
  const { payment_method_id, make_default = false } = paymentMethodData

  try {
    // Get account info
    const { data: account } = await supabase
      .from('marketing_accounts')
      .select('stripe_customer_id')
      .eq('id', accountId)
      .single()

    if (!account?.stripe_customer_id) {
      throw new Error('No Stripe customer ID found for account')
    }

    // Attach payment method to customer
    await stripe.paymentMethods.attach(payment_method_id, {
      customer: account.stripe_customer_id,
    })

    // Get payment method details
    const paymentMethod = await stripe.paymentMethods.retrieve(payment_method_id)

    // Store payment method in database
    const { data: storedPM, error } = await supabase
      .from('marketing_payment_methods')
      .insert([{
        account_id: accountId,
        stripe_payment_method_id: payment_method_id,
        stripe_customer_id: account.stripe_customer_id,
        card_brand: paymentMethod.card?.brand,
        card_last4: paymentMethod.card?.last4,
        card_exp_month: paymentMethod.card?.exp_month,
        card_exp_year: paymentMethod.card?.exp_year,
        is_default: make_default
      }])
      .select()
      .single()

    if (error) throw error

    // Set as default if requested
    if (make_default) {
      // Remove default from other methods
      await supabase
        .from('marketing_payment_methods')
        .update({ is_default: false })
        .eq('account_id', accountId)
        .neq('id', storedPM.id)

      // Set as default in Stripe
      await stripe.customers.update(account.stripe_customer_id, {
        invoice_settings: {
          default_payment_method: payment_method_id,
        },
      })
    }

    return NextResponse.json({
      payment_method: storedPM,
      message: 'Payment method added successfully'
    })

  } catch (error) {
    console.error('Error adding payment method:', error)
    return NextResponse.json(
      { error: 'Failed to add payment method', details: error.message },
      { status: 500 }
    )
  }
}

async function removePaymentMethod(accountId, paymentMethodId) {
  try {
    // Get payment method
    const { data: paymentMethod } = await supabase
      .from('marketing_payment_methods')
      .select('stripe_payment_method_id, is_default')
      .eq('id', paymentMethodId)
      .eq('account_id', accountId)
      .single()

    if (!paymentMethod) {
      throw new Error('Payment method not found')
    }

    // Detach from Stripe
    await stripe.paymentMethods.detach(paymentMethod.stripe_payment_method_id)

    // Remove from database
    const { error } = await supabase
      .from('marketing_payment_methods')
      .delete()
      .eq('id', paymentMethodId)

    if (error) throw error

    return NextResponse.json({
      message: 'Payment method removed successfully'
    })

  } catch (error) {
    console.error('Error removing payment method:', error)
    return NextResponse.json(
      { error: 'Failed to remove payment method', details: error.message },
      { status: 500 }
    )
  }
}

async function setDefaultPaymentMethod(accountId, paymentMethodId) {
  try {
    // Get payment method and account info
    const { data: paymentMethod } = await supabase
      .from('marketing_payment_methods')
      .select('stripe_payment_method_id, stripe_customer_id')
      .eq('id', paymentMethodId)
      .eq('account_id', accountId)
      .single()

    if (!paymentMethod) {
      throw new Error('Payment method not found')
    }

    // Remove default from other methods
    await supabase
      .from('marketing_payment_methods')
      .update({ is_default: false })
      .eq('account_id', accountId)

    // Set new default in database
    await supabase
      .from('marketing_payment_methods')
      .update({ is_default: true })
      .eq('id', paymentMethodId)

    // Set as default in Stripe
    await stripe.customers.update(paymentMethod.stripe_customer_id, {
      invoice_settings: {
        default_payment_method: paymentMethod.stripe_payment_method_id,
      },
    })

    return NextResponse.json({
      message: 'Default payment method updated successfully'
    })

  } catch (error) {
    console.error('Error setting default payment method:', error)
    return NextResponse.json(
      { error: 'Failed to set default payment method', details: error.message },
      { status: 500 }
    )
  }
}