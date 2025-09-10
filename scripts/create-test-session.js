import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createTestSession() {
  try {
    // Create a test user if doesn't exist
    const testEmail = 'test@bookedbarber.com'
    const testPassword = 'TestPassword123!'

    // Try to get existing user first
    let userId
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
    
    const existingUser = users?.find(u => u.email === testEmail)
    
    if (existingUser) {
      userId = existingUser.id
      console.log('Using existing user:', testEmail)
    } else {
      // Create new user if doesn't exist
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: testEmail,
        password: testPassword,
        email_confirm: true,
        user_metadata: {
          full_name: 'Test User'
        }
      })

      if (authError) {
        console.error('Auth error:', authError)
        return
      }
      
      userId = authData?.user?.id
      console.log('Created new user:', testEmail)
    }
    console.log('User ID:', userId)

    // Create or update profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        email: testEmail,
        full_name: 'Test User',
        role: 'SHOP_OWNER',
        subscription_tier: 'professional',
        subscription_status: 'active',
        barbershop_id: 'test-shop-123',
        barbershop_id: 'test-shop-123'
      }, {
        onConflict: 'id'
      })
      .select()
      .single()

    if (profileError) {
      console.error('Profile error:', profileError)
    } else {
      console.log('Profile created/updated:', profile)
    }

    // Create test barbershop
    const { error: shopError } = await supabase
      .from('barbershops')
      .upsert({
        id: 'test-shop-123',
        name: 'Test Barbershop',
        owner_id: userId,
        address: '123 Test Street',
        phone: '555-0123',
        email: testEmail,
        business_hours: {
          monday: { open: '09:00', close: '18:00' },
          tuesday: { open: '09:00', close: '18:00' },
          wednesday: { open: '09:00', close: '18:00' },
          thursday: { open: '09:00', close: '18:00' },
          friday: { open: '09:00', close: '18:00' },
          saturday: { open: '10:00', close: '16:00' },
          sunday: { closed: true }
        }
      }, {
        onConflict: 'id'
      })

    if (shopError) {
      console.error('Shop error:', shopError)
    }

    // Create some test customers
    const testCustomers = [
      {
        barbershop_id: 'test-shop-123',
        full_name: 'John Doe',
        email: 'john@example.com',
        phone: '555-1234',
        total_visits: 15,
        total_spent: 450,
        last_visit_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        churn_probability: 25,
        health_score: 75,
        loyalty_points: 150
      },
      {
        barbershop_id: 'test-shop-123',
        full_name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '555-5678',
        total_visits: 8,
        total_spent: 240,
        last_visit_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        churn_probability: 65,
        health_score: 40,
        loyalty_points: 80
      },
      {
        barbershop_id: 'test-shop-123',
        full_name: 'Bob Johnson',
        email: 'bob@example.com',
        phone: '555-9012',
        total_visits: 25,
        total_spent: 750,
        last_visit_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        churn_probability: 10,
        health_score: 90,
        loyalty_points: 250
      },
      {
        barbershop_id: 'test-shop-123',
        full_name: 'Alice Brown',
        email: 'alice@example.com',
        phone: '555-3456',
        total_visits: 5,
        total_spent: 150,
        last_visit_date: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
        churn_probability: 85,
        health_score: 25,
        loyalty_points: 50
      },
      {
        barbershop_id: 'test-shop-123',
        full_name: 'Charlie Wilson',
        email: 'charlie@example.com',
        phone: '555-7890',
        total_visits: 20,
        total_spent: 600,
        last_visit_date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        churn_probability: 35,
        health_score: 65,
        loyalty_points: 200
      }
    ]

    const { error: customersError } = await supabase
      .from('customers')
      .upsert(testCustomers, {
        onConflict: 'email,barbershop_id'
      })

    if (customersError) {
      console.error('Customers error:', customersError)
    } else {
      console.log('Test customers created')
    }

    console.log('\n✅ Test data setup complete!')
    console.log('Test user email:', testEmail)
    console.log('Test user password:', testPassword)
    console.log('\nYou can now log in with these credentials.')

  } catch (error) {
    console.error('Error creating test session:', error)
  }
}

createTestSession()