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
  console.log('🔧 Ensuring dev-enterprise profile exists...')
  
  try {
    // First, check if the user exists
    const { data: users, error: userError } = await supabase.auth.admin.listUsers()
    
    if (userError) {
      console.error('Error fetching users:', userError)
      return
    }
    
    const devUser = users.users.find(u => u.email === 'dev-enterprise@test.com')
    
    if (!devUser) {
      console.log('⚠️ Dev user not found in auth.users')
      console.log('Creating dev user...')
      
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
      
      console.log('✅ Dev user created:', newUser.user.id)
      devUser = newUser.user
    } else {
      console.log('✅ Dev user found:', devUser.id)
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
      console.log('📝 Creating new profile...')
      
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
      
      console.log('✅ Profile created successfully')
      console.log('Profile data:', newProfile)
    } else {
      console.log('✅ Profile already exists')
      
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
      
      console.log('✅ Profile updated with missing fields')
      console.log('Profile data:', updatedProfile)
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
    
    console.log('\n📊 Final Profile State:')
    console.log('- ID:', finalProfile.id)
    console.log('- Email:', finalProfile.email)
    console.log('- Role:', finalProfile.role)
    console.log('- Shop Name:', finalProfile.shop_name)
    console.log('- Onboarding Step:', finalProfile.onboarding_step)
    console.log('- Onboarding Progress:', finalProfile.onboarding_progress_percentage + '%')
    console.log('- Has Onboarding Data:', !!finalProfile.onboarding_data)
    
  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

ensureDevProfile()