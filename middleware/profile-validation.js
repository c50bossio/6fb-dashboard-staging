/**
 * Profile Validation Middleware
 * 
 * Prevents future subscription tier inconsistencies by validating 
 * profile updates and ensuring role/tier synchronization.
 */

import { NextResponse } from 'next/server'
import { validateProfileTierConsistency, getTierForRole } from '../lib/profile-sync-service'
import { SUBSCRIPTION_TIERS, normalizeTierName } from '../lib/subscription-tiers'

/**
 * Middleware to validate profile consistency on updates
 * @param {object} profileData - Profile data being updated
 * @returns {object} Validation result with any fixes applied
 */
export function validateProfileUpdate(profileData) {
  const validation = validateProfileTierConsistency(profileData)
  
  if (validation.valid) {
    return { 
      valid: true, 
      data: profileData 
    }
  }

  // Auto-fix common inconsistencies
  const fixedData = { ...profileData }
  
  if (profileData.role) {
    // If role is being updated, sync the subscription_tier
    const correctTier = getTierForRole(profileData.role)
    if (profileData.subscription_tier !== correctTier) {
      fixedData.subscription_tier = correctTier
      
      // Set subscription_status to active for paid tiers
      if (correctTier !== SUBSCRIPTION_TIERS.FREE && !profileData.subscription_status) {
        fixedData.subscription_status = 'active'
      }
    }
  } else if (profileData.subscription_tier) {
    // If subscription_tier is being updated, validate it's normalized
    fixedData.subscription_tier = normalizeTierName(profileData.subscription_tier)
  }

  return {
    valid: true,
    data: fixedData,
    fixes: validation.suggestions,
    originalIssues: validation.issues
  }
}

/**
 * API route wrapper that enforces profile validation
 * @param {function} handler - Original API route handler
 * @returns {function} Wrapped handler with validation
 */
export function withProfileValidation(handler) {
  return async function validatedHandler(request, context) {
    try {
      // Get the request body if it's a mutation
      if (request.method !== 'GET') {
        const body = await request.json()
        
        // Check if this is a profile update
        if (body && (body.role || body.subscription_tier || body.subscription_status)) {
          const validation = validateProfileUpdate(body)
          
          if (!validation.valid) {
            return NextResponse.json({
              error: 'Invalid profile data',
              issues: validation.issues,
              suggestions: validation.suggestions
            }, { status: 400 })
          }

          // If fixes were applied, use the fixed data
          if (validation.fixes?.length > 0) {
            // Create new request with fixed data
            const fixedRequest = new Request(request.url, {
              method: request.method,
              headers: request.headers,
              body: JSON.stringify(validation.data)
            })
            
            console.log('Profile validation applied fixes:', {
              original: body,
              fixed: validation.data,
              fixes: validation.fixes
            })
            
            return handler(fixedRequest, context)
          }
        }
      }

      // Call original handler
      return handler(request, context)
      
    } catch (error) {
      console.error('Profile validation middleware error:', error)
      // Continue with original request if validation fails
      return handler(request, context)
    }
  }
}

/**
 * Supabase RLS policy helper for consistent validation
 * @param {object} user - Current user
 * @param {object} profileUpdate - Profile data being updated
 * @returns {boolean} Whether update should be allowed
 */
export function validateRLSProfileUpdate(user, profileUpdate) {
  // Users can only update their own profile
  if (profileUpdate.id && profileUpdate.id !== user.id) {
    return false
  }

  // Validate role transitions
  if (profileUpdate.role) {
    const allowedRoleTransitions = {
      'CLIENT': ['BARBER'], // Clients can upgrade to barber
      'BARBER': ['SHOP_OWNER'], // Barbers can become shop owners
      'SHOP_OWNER': ['ENTERPRISE_OWNER'], // Shop owners can become enterprise
      'ENTERPRISE_OWNER': [], // Enterprise owners can't change role
      'SUPER_ADMIN': [] // Admins can't change via API
    }

    const currentRole = user.role || 'CLIENT'
    const newRole = profileUpdate.role
    
    if (currentRole !== newRole) {
      const allowed = allowedRoleTransitions[currentRole] || []
      if (!allowed.includes(newRole)) {
        console.warn(`Blocked role transition: ${currentRole} → ${newRole}`)
        return false
      }
    }
  }

  return true
}

/**
 * Database trigger helper to maintain consistency
 * This would be used in a PostgreSQL trigger function
 */
export const PROFILE_CONSISTENCY_TRIGGER = `
-- PostgreSQL trigger function to maintain profile consistency
CREATE OR REPLACE FUNCTION enforce_profile_consistency()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-sync subscription_tier when role changes
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    NEW.subscription_tier := CASE 
      WHEN NEW.role = 'SHOP_OWNER' THEN 'PROFESSIONAL'
      WHEN NEW.role = 'BARBER' THEN 'INDIVIDUAL'
      WHEN NEW.role = 'ENTERPRISE_OWNER' THEN 'ENTERPRISE'
      WHEN NEW.role = 'CLIENT' THEN 'FREE'
      ELSE 'FREE'
    END;
    
    -- Set subscription_status for paid tiers
    IF NEW.subscription_tier != 'FREE' AND NEW.subscription_status IS NULL THEN
      NEW.subscription_status := 'active';
    END IF;
  END IF;

  -- Validate tier changes
  IF NEW.subscription_tier IS DISTINCT FROM OLD.subscription_tier THEN
    -- Normalize tier names
    NEW.subscription_tier := CASE 
      WHEN NEW.subscription_tier IN ('shop', 'shop_owner', 'professional') THEN 'PROFESSIONAL'
      WHEN NEW.subscription_tier IN ('barber', 'individual') THEN 'INDIVIDUAL'
      WHEN NEW.subscription_tier IN ('enterprise') THEN 'ENTERPRISE'
      WHEN NEW.subscription_tier IN ('free', 'client') THEN 'FREE'
      ELSE UPPER(NEW.subscription_tier)
    END;
  END IF;

  -- Update timestamp
  NEW.updated_at := NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to profiles table
DROP TRIGGER IF EXISTS profile_consistency_trigger ON profiles;
CREATE TRIGGER profile_consistency_trigger
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION enforce_profile_consistency();
`;

/**
 * Admin utility to check system-wide profile consistency
 * @returns {Promise<object>} Consistency report
 */
export async function generateConsistencyReport() {
  try {
    const { createClient } = await import('../lib/supabase-client')
    const supabase = createClient()
    
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, email, role, subscription_tier, subscription_status')
    
    if (error) {
      return { success: false, error: error.message }
    }

    const report = {
      total: profiles.length,
      consistent: 0,
      inconsistent: 0,
      issues: [],
      byRole: {},
      recommendations: []
    }

    profiles.forEach(profile => {
      const validation = validateProfileTierConsistency(profile)
      
      const role = profile.role || 'UNKNOWN'
      if (!report.byRole[role]) {
        report.byRole[role] = { total: 0, consistent: 0, inconsistent: 0 }
      }
      
      report.byRole[role].total++
      
      if (validation.valid) {
        report.consistent++
        report.byRole[role].consistent++
      } else {
        report.inconsistent++
        report.byRole[role].inconsistent++
        report.issues.push({
          id: profile.id,
          email: profile.email,
          issues: validation.issues,
          suggestions: validation.suggestions
        })
      }
    })

    // Generate recommendations
    if (report.inconsistent > 0) {
      report.recommendations.push(
        `Run database migration to fix ${report.inconsistent} inconsistent profiles`,
        'Consider implementing profile consistency triggers',
        'Add validation to profile update forms'
      )
    }

    if (report.inconsistent > report.total * 0.1) {
      report.recommendations.push(
        'High inconsistency rate detected - investigate root cause',
        'Consider adding profile validation middleware'
      )
    }

    return { 
      success: true, 
      report,
      healthScore: Math.round((report.consistent / report.total) * 100)
    }

  } catch (error) {
    return { 
      success: false, 
      error: `Failed to generate consistency report: ${error.message}` 
    }
  }
}