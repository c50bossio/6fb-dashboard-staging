import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTenant } from '@/lib/tenant-resolver'

// Simple retry utility for database operations
async function retryDatabaseOperation(operation, maxRetries = 2, delay = 1000) {
  let lastError
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔄 Staff API: Retry attempt ${attempt}/${maxRetries}`)
      }
      const result = await operation()
      if (process.env.NODE_ENV === 'development') {
        console.log(`✅ Staff API: Operation succeeded on attempt ${attempt}`)
      }
      return result
    } catch (error) {
      lastError = error
      console.warn(`⚠️ Attempt ${attempt} failed:`, error.message)
      
      // Don't retry on authentication or permission errors
      if (error.message?.includes('authentication') || 
          error.message?.includes('permission') || 
          error.message?.includes('unauthorized')) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`🚫 Staff API: Not retrying auth/permission error: ${error.message}`)
        }
        throw error
      }
      
      // Don't retry if this is the last attempt
      if (attempt === maxRetries) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`❌ Staff API: Final attempt failed: ${error.message}`)
        }
        throw error
      }
      
      // Wait before retry
      if (process.env.NODE_ENV === 'development') {
        console.log(`⏳ Staff API: Waiting ${delay}ms before retry...`)
      }
      await new Promise(resolve => setTimeout(resolve, delay))
      delay *= 1.5 // Exponential backoff
    }
  }
  
  throw lastError
}

export async function GET(request) {
  if (process.env.NODE_ENV === 'development') {
    console.log('🏁 Staff API: Starting request processing')
  }
  try {
    // Get format parameter for FullCalendar resource format support
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') // 'resources' for FullCalendar

    // Step 1: Create Supabase client with detailed logging
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 Staff API: Creating Supabase client...')
    }
    const supabase = await createClient()
    
    if (!supabase) {
      console.error('❌ Staff API: Supabase client creation failed - client is null')
      return NextResponse.json({ 
        error: 'Database connection failed', 
        details: 'Supabase client could not be created' 
      }, { status: 500 })
    }
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Staff API: Supabase client created successfully')
    }
    
    // Step 1.5: Health check - test database connection
    if (process.env.NODE_ENV === 'development') {
      console.log('🏥 Staff API: Performing database health check...')
    }
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
      
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Staff API: Database health check passed')
      }
    } catch (healthError) {
      console.error('❌ Staff API: Database health check exception:', healthError)
      return NextResponse.json({ 
        error: 'Database connection failed', 
        details: 'Cannot establish database connection' 
      }, { status: 503 })
    }
    
    // Step 2: Enhanced authentication with session retry logic
    if (process.env.NODE_ENV === 'development') {
      console.log('🔐 Staff API: Starting enhanced authentication check...')
    }
    
    let session = null
    let user = null
    let authError = null
    
    // Enhanced session retrieval with multiple strategies
    for (let attempt = 1; attempt <= 3; attempt++) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔍 Staff API: Authentication attempt ${attempt}/3`)
      }
      
      try {
        // Try getSession first (more reliable for server-side)
        const sessionResult = await supabase.auth.getSession()
        session = sessionResult.data?.session
        authError = sessionResult.error
        
        if (session) {
          user = session.user
          if (process.env.NODE_ENV === 'development') {
            console.log(`✅ Staff API: Session authenticated on attempt ${attempt}:`, {
              id: user.id,
              email: user.email,
              provider: user.app_metadata?.provider,
              hasAccessToken: !!session.access_token,
              sessionExpiry: session.expires_at
            })
          }
          break
        }
        
        // If no session, try getUser as fallback
        if (!session && attempt <= 2) {
          const userResult = await supabase.auth.getUser()
          user = userResult.data?.user
          authError = userResult.error || authError
          
          if (user) {
            if (process.env.NODE_ENV === 'development') {
              console.log(`✅ Staff API: User authenticated via getUser on attempt ${attempt}:`, {
                id: user.id,
                email: user.email
              })
            }
            break
          }
        }
        
        if (authError) {
          console.warn(`⚠️ Staff API: Auth error on attempt ${attempt}:`, authError.message)
          
          // Don't retry certain errors
          if (authError.message?.includes('JWT') || 
              authError.message?.includes('expired') ||
              authError.message?.includes('malformed') ||
              authError.message?.includes('unauthorized')) {
            console.log('🚫 Staff API: Not retrying auth error:', authError.message)
            break
          }
        }
        
        // Wait before retry with increasing delay
        if (attempt < 3) {
          const delay = 500 * attempt
          if (process.env.NODE_ENV === 'development') {
            console.log(`⏳ Staff API: Waiting ${delay}ms before retry...`)
          }
          await new Promise(resolve => setTimeout(resolve, delay))
        }
        
      } catch (error) {
        console.error(`❌ Staff API: Exception during auth attempt ${attempt}:`, error.message)
        authError = error
        
        if (attempt < 3) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
        }
      }
    }
    
    if (authError) {
      console.error('❌ Staff API: Authentication failed after all retries:', authError.message)
      return NextResponse.json({ 
        error: 'Authentication failed', 
        details: authError.message,
        hint: 'Please refresh the page and try again'
      }, { status: 401 })
    }
    
    if (!user) {
      console.warn('⚠️ Staff API: No authenticated user found after all attempts')
      return NextResponse.json({ 
        error: 'Unauthorized',
        hint: 'Please log in again'
      }, { status: 401 })
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`👤 Staff API: Fetching profile for user ${user.id}...`)
    }
    
    // Step 3: Get user profile with retry logic
    const profile = await retryDatabaseOperation(async () => {
      return await getUserProfile(supabase, user)
    })
    
    if (!profile) {
      console.error('❌ Staff API: Profile not found for user:', user.id)
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ Staff API: Profile found:`, {
        id: profile.id,
        role: profile.role,
        email: profile.email
      })
    }
    
    // Step 4: Get barbershop ID - check URL parameter first, then fall back to tenant resolver
    if (process.env.NODE_ENV === 'development') {
      console.log(`🏪 Staff API: Determining barbershop for user...`)
    }

    // Check for explicit barbershop_id in URL (shop switching bypass cache)
    let barbershopId = searchParams.get('barbershop_id')
    let source = 'URL parameter'

    // If no explicit barbershop_id, use tenant resolver with caching
    if (!barbershopId) {
      barbershopId = await retryDatabaseOperation(async () => {
        const { barbershopId } = await getTenant(profile.id, { supabase })
        return barbershopId
      })
      source = 'tenant resolver'
    }

    if (!barbershopId) {
      console.error('❌ Staff API: No barbershop found for user profile:', {
        profileId: profile.id,
        message: 'Neither URL parameter nor tenant resolver provided barbershop'
      })
      return NextResponse.json({ error: 'No barbershop found for user' }, { status: 404 })
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ Staff API: Barbershop ID determined: ${barbershopId} (source: ${source})`)
    }
    
    // Step 5: Get staff with profiles using retry logic
    if (process.env.NODE_ENV === 'development') {
      console.log(`👥 Staff API: Fetching staff for barbershop ${barbershopId}...`)
    }
    
    const staffWithProfiles = await retryDatabaseOperation(async () => {
      return await fetchStaffWithProfiles(supabase, barbershopId)
    })
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ Staff API: Found ${staffWithProfiles.length} staff members`)
    }

    // Transform to FullCalendar resource format if requested
    if (format === 'resources') {
      const resources = staffWithProfiles
        .filter(member => member.can_take_appointments !== false) // Only include staff who can take appointments
        .map((member) => {
          // Generate consistent color based on ID
          const colors = ['#10b981', '#546355', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#C5A35B', '#B8913A']
          const colorIndex = member.id ? parseInt(member.id.slice(-2), 16) % colors.length : 0

          return {
            // FIX: Use user_id to match appointments.barber_id (foreign key to profiles.id)
            // This allows calendar appointments to map correctly to staff resources
            id: member.user_id || member.id,
            title: member.full_name || member.display_name || 'Staff Member',
            eventColor: colors[colorIndex],
            extendedProps: {
              staff_id: member.id,
              user_id: member.user_id,
              email: member.email,
              phone: member.phone,
              avatar_url: member.avatar_url,
              role: member.role,
              commission_rate: member.commission_rate,
              is_active: member.is_active,
              can_take_appointments: member.can_take_appointments,
              is_visible_for_booking: member.is_visible_for_booking
            }
          }
        })

      if (process.env.NODE_ENV === 'development') {
        console.log(`✅ Staff API: Returning ${resources.length} calendar resources`)
      }

      return NextResponse.json({
        success: true,
        resources,
        barbershop_id: barbershopId,
        total: resources.length
      })
    }

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
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔍 getUserProfile: Looking up profile for user ${user.id}`)
    }
    
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
      if (process.env.NODE_ENV === 'development') {
        console.log(`✅ getUserProfile: Profile found for ${user.id}`)
      }
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.log(`⚠️ getUserProfile: No profile found for ${user.id}`)
      }
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
    if (profile.barbershop_id) {
      // // Debug log removed for production
return profile.barbershop_id
    }
    
    // // Debug log removed for production
    // Skip barbershop_staff table to avoid 406 errors
    // Staff associations should be managed through profiles table
    // For now, return null if no barbershop_id in profile
    const barbershopId = null
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
    if (!supabase) {
      console.error('❌ fetchStaffWithProfiles: Supabase client is null')
      throw new Error('Database client not available')
    }

    if (!barbershopId) {
      console.error('❌ fetchStaffWithProfiles: Barbershop ID is required')
      throw new Error('Barbershop ID is required')
    }

    // ACTUAL DATABASE ARCHITECTURE: barbershop_staff + profiles join
    if (process.env.NODE_ENV === 'development') {
      console.log('👥 fetchStaffWithProfiles: Querying barbershop_staff + profiles...')
    }

    // Query barbershop_staff with profiles join to get full staff details
    const { data: staffMembers, error: staffError } = await retryDatabaseOperation(async () => {
      return await supabase
        .from('barbershop_staff')
        .select(`
          *,
          profile:profiles!barbershop_staff_user_id_fkey(
            id,
            email,
            full_name,
            first_name,
            last_name,
            phone,
            avatar_url,
            role
          )
        `)
        .eq('barbershop_id', barbershopId)
        .eq('is_active', true)
        .order('created_at', { ascending: true })
    })

    // Handle query error
    if (staffError) {
      console.error('❌ fetchStaffWithProfiles: Error fetching staff:', {
        code: staffError.code,
        message: staffError.message,
        details: staffError.details,
        hint: staffError.hint
      })
      throw new Error(`Staff fetch failed: ${staffError.message}`)
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`👥 fetchStaffWithProfiles: Found ${staffMembers?.length || 0} staff members`)
    }

    // Return empty array if no staff found
    if (!staffMembers || staffMembers.length === 0) {
      return []
    }

    // Transform to frontend format (barbershop_staff + profile data)
    const staffWithProfiles = staffMembers.map(member => {
      // Extract profile data from join
      const profile = member.profile || {}

      // Determine role from barbershop_staff.role OR profile.role
      const effectiveRole = member.role || profile.role || 'BARBER'

      // Set role-based defaults for appointment capabilities
      const defaultCanTakeAppointments = member.can_take_appointments ?? (
        effectiveRole === 'BARBER' ? true :
        effectiveRole === 'ENTERPRISE_OWNER' ? true :
        effectiveRole === 'SHOP_OWNER' ? true :
        effectiveRole === 'MANAGER' ? false :
        false // STAFF role defaults to false
      )

      return {
        // Core staff fields (from barbershop_staff table)
        id: member.id,
        user_id: member.user_id,
        barbershop_id: member.barbershop_id,
        role: effectiveRole,
        is_active: member.is_active ?? true,
        created_at: member.created_at,
        updated_at: member.updated_at,

        // Appointment capability fields
        can_take_appointments: defaultCanTakeAppointments,
        is_visible_for_booking: member.is_visible_for_booking ?? true,
        service_provider_since: member.service_provider_since || member.created_at,

        // Personal information (from profiles table)
        email: profile.email || '',
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        full_name: profile.full_name ||
          `${profile.first_name || ''} ${profile.last_name || ''}`.trim() ||
          profile.email || 'Staff Member',
        phone: profile.phone || '',
        avatar_url: profile.avatar_url || null,

        // Professional information
        title: effectiveRole === 'SHOP_OWNER' ? 'Owner' :
               effectiveRole === 'ENTERPRISE_OWNER' ? 'Enterprise Owner' :
               effectiveRole === 'MANAGER' ? 'Manager' : 'Barber',
        specialties: member.specialties || [],
        bio: member.bio || '',
        experience_years: member.experience_years || 0,

        // Financial fields (from barbershop_staff)
        commission_rate: member.commission_rate || null,
        hourly_rate: member.hourly_rate || null,
        booth_rent_amount: member.booth_rent_amount || null,
        employment_type: member.employment_type || 'commission',

        // Legacy compatibility fields
        display_name: profile.full_name || profile.email || 'Staff Member',
        metadata: member.metadata || {},

        // Profile reference for backward compatibility
        profile: {
          id: member.user_id,
          email: profile.email,
          first_name: profile.first_name,
          last_name: profile.last_name,
          full_name: profile.full_name,
          phone: profile.phone,
          avatar_url: profile.avatar_url,
          role: effectiveRole
        }
      }
    })

    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ fetchStaffWithProfiles: Returning ${staffWithProfiles.length} staff members from unified staff table`)
    }

    return staffWithProfiles
  } catch (error) {
    console.error('💥 fetchStaffWithProfiles: Unexpected error:', error)
    throw error // Re-throw to be caught by main function
  }
}