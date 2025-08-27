import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
dotenv.config({ path: join(__dirname, '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function ensureDevProfile() {
  // ⚠️  PRODUCTION WARNING CHECK
  if (process.env.NODE_ENV === 'production' || supabaseUrl.includes('supabase.co')) {

    :')

    if (!process.env.FORCE_TEST_DATA) {
      
      process.exit(1)
    }
  }

  try {
    // First, check if the user exists
    const { data: users, error: userError } = await supabase.auth.admin.listUsers()
    
    if (userError) {
      console.error('Error fetching users:', userError)
      return
    }
    
    const devUser = users.users.find(u => u.email === 'dev-enterprise@test.com')
    
    if (!devUser) {

      const { data: newUser, error: createUserError } = await supabase.auth.admin.createUser({
        email: 'dev-enterprise@test.com',
        password: 'dev123456',
        email_confirm: true,
        user_metadata: {
          full_name: 'Dev Enterprise User',
          role: 'ENTERPRISE_OWNER'
        }
      })
      
      if (createUserError) {
        console.error('Error creating user:', createUserError)
        return
      }

      devUser = newUser.user
    } else {
      
    }
    
    // Now ensure the profile exists
    const { data: existingProfile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', devUser.id)
      .maybeSingle()
    
    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Error fetching profile:', profileError)
      return
    }
    
    if (!existingProfile) {

      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: devUser.id,
          email: 'dev-enterprise@test.com',
          full_name: 'Dev Enterprise User',
          role: 'ENTERPRISE_OWNER',
          shop_name: 'Demo Barbershop',
          onboarding_step: 0,
          onboarding_data: {},
          onboarding_progress_percentage: 0,
          subscription_status: 'active',
          onboarding_completed: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()
      
      if (insertError) {
        console.error('Error creating profile:', insertError)
        return
      }

    } else {

      // Update to ensure all fields are present
      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update({
          role: existingProfile.role || 'ENTERPRISE_OWNER',
          shop_name: existingProfile.shop_name || 'Demo Barbershop',
          onboarding_step: existingProfile.onboarding_step ?? 0,
          onboarding_data: existingProfile.onboarding_data || {},
          onboarding_progress_percentage: existingProfile.onboarding_progress_percentage ?? 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', devUser.id)
        .select()
        .single()
      
      if (updateError) {
        console.error('Error updating profile:', updateError)
        return
      }

    }
    
    // Verify the final state
    const { data: finalProfile, error: finalError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', devUser.id)
      .single()
    
    if (finalError) {
      console.error('Error verifying profile:', finalError)
      return
    }

  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

ensureDevProfile()