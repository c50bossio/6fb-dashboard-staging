import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Simple retry utility for database operations
async function retryDatabaseOperation(operation, maxRetries = 2, delay = 1000) {
  let lastError
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // // Debug log removed for production
const result = await operation()
      // // Debug log removed for production
return result
    } catch (error) {
      lastError = error
      console.warn(`⚠️ Attempt ${attempt} failed:`, error.message)
      
      // Don't retry on authentication or permission errors
      if (error.message?.includes('authentication') || 
          error.message?.includes('permission') || 
          error.message?.includes('unauthorized')) {
        // // Debug log removed for production
throw error
      }
      
      // Don't retry if this is the last attempt
      if (attempt === maxRetries) {
        // // Debug log removed for production
throw error
      }
      
      // Wait before retry
      // // Debug log removed for production
await new Promise(resolve => setTimeout(resolve, delay))
      delay *= 1.5 // Exponential backoff
    }
  }
  
  throw lastError
}

export async function GET(request) {
  // // Debug log removed for production
try {
    // Step 1: Create Supabase client with detailed logging
    // // Debug log removed for production
const supabase = await createClient()
    
    if (!supabase) {
      console.error('❌ Staff API: Supabase client creation failed - client is null')
      return NextResponse.json({ 
        error: 'Database connection failed', 
        details: 'Supabase client could not be created' 
      }, { status: 500 })
    }
    // // Debug log removed for production
// Step 1.5: Health check - test database connection
    // // Debug log removed for production
try {
      const healthCheck = await supabase
        .from('profiles')
        .select('id')
        .limit(1)
        .single()
      
      // Even if no profiles exist, this should return a proper error, not a connection error
      if (healthCheck.error && healthCheck.error.code !== 'PGRST116') {
        console.error('❌ Staff API: Database health check failed:', {
          code: healthCheck.error.code,
          message: healthCheck.error.message
        })
        
        // Check for common connection issues
        if (healthCheck.error.message?.includes('connection') || 
            healthCheck.error.message?.includes('timeout') ||
            healthCheck.error.message?.includes('network')) {
          return NextResponse.json({ 
            error: 'Database connection failed', 
            details: 'Cannot connect to database server' 
          }, { status: 503 }) // Service Unavailable
        }
        
        if (healthCheck.error.message?.includes('authentication') ||
            healthCheck.error.message?.includes('permission')) {
          return NextResponse.json({ 
            error: 'Database authentication failed', 
            details: 'Invalid database credentials' 
          }, { status: 500 })
        }
      }
      
      // // Debug log removed for production
} catch (healthError) {
      console.error('❌ Staff API: Database health check exception:', healthError)
      return NextResponse.json({ 
        error: 'Database connection failed', 
        details: 'Cannot establish database connection' 
      }, { status: 503 })
    }
    
    // Step 2: Get authenticated user with detailed logging
    // // Debug log removed for production
const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError) {
      console.error('❌ Staff API: Authentication error:', authError)
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
    }
    
    if (!user) {
      console.warn('⚠️ Staff API: No authenticated user found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // // Debug log removed for production
// Step 3: Get user profile with retry logic
    // // Debug log removed for production
const profile = await retryDatabaseOperation(async () => {
      return await getUserProfile(supabase, user)
    })
    
    if (!profile) {
      console.error('❌ Staff API: Profile not found for user:', user.id)
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }
    // // Debug log removed for production
// Step 4: Get barbershop ID with retry logic
    // // Debug log removed for production
const barbershopId = await retryDatabaseOperation(async () => {
      return await getUserBarbershop(supabase, profile)
    })
    
    if (!barbershopId) {
      console.error('❌ Staff API: No barbershop found for user profile:', { 
        profileId: profile.id, 
        shopId: profile.shop_id,
        barbershopId: profile.barbershop_id 
      })
      return NextResponse.json({ error: 'No barbershop found for user' }, { status: 404 })
    }
    // // Debug log removed for production
// Step 5: Get staff with profiles using retry logic
    // // Debug log removed for production
const staffWithProfiles = await retryDatabaseOperation(async () => {
      return await fetchStaffWithProfiles(supabase, barbershopId)
    })
    // // Debug log removed for production
// // Debug log removed for production
return NextResponse.json({
      success: true,
      staff: staffWithProfiles,
      barbershop_id: barbershopId,
      count: staffWithProfiles.length
    })

  } catch (error) {
    console.error('💥 Staff API: Unexpected error occurred:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      cause: error.cause
    })
    
    // Return detailed error information for debugging
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error.message,
        type: error.name,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// Production-ready helper functions with enhanced error handling
async function getUserProfile(supabase, user) {
  try {
    // // Debug log removed for production
if (!supabase) {
      console.error('❌ getUserProfile: Supabase client is null')
      throw new Error('Database client not available')
    }
    
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        console.warn('⚠️ getUserProfile: No profile found for user (404):', user.id)
        return null // Not found is acceptable
      } else {
        console.error('❌ getUserProfile: Database error:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        })
        throw new Error(`Profile lookup failed: ${error.message}`)
      }
    }
    
    if (profile) {
      // // Debug log removed for production
}
    
    return profile
  } catch (error) {
    console.error('💥 getUserProfile: Unexpected error:', error)
    throw error // Re-throw to be caught by main function
  }
}

async function getUserBarbershop(supabase, profile) {
  try {
    // // Debug log removed for production
if (!supabase) {
      console.error('❌ getUserBarbershop: Supabase client is null')
      throw new Error('Database client not available')
    }
    
    if (!profile) {
      console.error('❌ getUserBarbershop: Profile is null')
      throw new Error('Profile is required')
    }
    
    // FIXED: Single source of truth - only check barbershop_id field
    if (profile.barbershop_id) {
      console.log('User barbershop_id from profile:', profile.barbershop_id)
      return profile.barbershop_id
    }
    
    // Legacy support during migration period
    if (profile.shop_id) {
      // // Debug log removed for production
return profile.shop_id
    }
    
    // // Debug log removed for production
// Check if user is staff at a barbershop (employee via barbershop_staff)
    const { data: staffRecord, error } = await supabase
      .from('barbershop_staff')
      .select('barbershop_id')
      .eq('user_id', profile.id)
      .eq('is_active', true)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        console.warn('⚠️ getUserBarbershop: No staff record found (user not an employee)')
        return null // Not found is acceptable - user isn't staff
      } else {
        console.error('❌ getUserBarbershop: Database error:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        })
        throw new Error(`Staff lookup failed: ${error.message}`)
      }
    }
    
    const barbershopId = staffRecord?.barbershop_id || null
    if (barbershopId) {
      // // Debug log removed for production
} else {
      console.warn('⚠️ getUserBarbershop: No barbershop found for user')
    }
    
    return barbershopId
  } catch (error) {
    console.error('💥 getUserBarbershop: Unexpected error:', error)
    throw error // Re-throw to be caught by main function
  }
}

async function fetchStaffWithProfiles(supabase, barbershopId) {
  try {
    // // Debug log removed for production
if (!supabase) {
      console.error('❌ fetchStaffWithProfiles: Supabase client is null')
      throw new Error('Database client not available')
    }
    
    if (!barbershopId) {
      console.error('❌ fetchStaffWithProfiles: Barbershop ID is required')
      throw new Error('Barbershop ID is required')
    }

    // Step 1: Get staff records for the barbershop
    // // Debug log removed for production
const { data: staff, error: staffError } = await supabase
      .from('barbershop_staff')
      .select('*')
      .eq('barbershop_id', barbershopId)
      .eq('is_active', true)
      .order('created_at', { ascending: true })

    if (staffError) {
      console.error('❌ fetchStaffWithProfiles: Error fetching staff:', {
        code: staffError.code,
        message: staffError.message,
        details: staffError.details,
        hint: staffError.hint
      })
      throw new Error(`Staff fetch failed: ${staffError.message}`)
    }

    // // Debug log removed for production
if (!staff || staff.length === 0) {
      console.warn('⚠️ fetchStaffWithProfiles: No active staff found for barbershop')
      return []
    }

    // Step 2: Get profiles for all staff members
    const userIds = staff.map(s => s.user_id)
    // // Debug log removed for production
const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .in('id', userIds)

    if (profilesError) {
      console.error('❌ fetchStaffWithProfiles: Error fetching staff profiles:', {
        code: profilesError.code,
        message: profilesError.message,
        details: profilesError.details,
        hint: profilesError.hint
      })
      throw new Error(`Profile fetch failed: ${profilesError.message}`)
    }

    // // Debug log removed for production
// Step 3: Merge staff data with profiles
    // // Debug log removed for production
const staffWithProfiles = staff.map(staffMember => {
      const profile = profiles?.find(p => p.id === staffMember.user_id) || {}
      
      const mergedRecord = {
        id: staffMember.id,
        user_id: staffMember.user_id,
        barbershop_id: staffMember.barbershop_id,
        role: staffMember.role,
        is_active: staffMember.is_active,
        created_at: staffMember.created_at,
        updated_at: staffMember.updated_at,
        // Profile information
        email: profile.email || '',
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        full_name: profile.full_name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Staff Member',
        phone: profile.phone || '',
        avatar_url: profile.avatar_url || null,
        // Staff-specific fields
        title: staffMember.role === 'OWNER' ? 'Owner' : 'Barber',
        specialties: profile.specialties || [],
        bio: profile.bio || '',
        experience_years: profile.experience_years || 0,
        hourly_rate: staffMember.hourly_rate || null,
        commission_rate: staffMember.commission_rate || null
      }
      
      console.log(`Staff profile merged successfully`)
      return mergedRecord
    })

    console.log(`Returning ${staffWithProfiles.length} staff members with profiles`)
    return staffWithProfiles
  } catch (error) {
    console.error('💥 fetchStaffWithProfiles: Unexpected error:', error)
    throw error // Re-throw to be caught by main function
  }
}