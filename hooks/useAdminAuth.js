'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../lib/supabase/client'

/**
 * Client-side React hook for admin authentication
 * Checks if the current user has SUPER_ADMIN role
 */
export function useAdminAuth() {
  const [adminAuth, setAdminAuth] = useState({ 
    isAdmin: false, 
    loading: true, 
    error: null,
    role: null,
    isActive: false
  })
  
  const supabase = createClient()

  useEffect(() => {
    async function checkAuth() {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        
        if (error || !user) {
          setAdminAuth({
            isAdmin: false, 
            loading: false, 
            error: 'Not authenticated',
            role: null,
            isActive: false
          })
          return
        }

        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('role, is_active')
          .eq('id', user.id)
          .single()

        if (profileError) {
          setAdminAuth({
            isAdmin: false, 
            loading: false, 
            error: 'Failed to fetch user profile',
            role: null,
            isActive: false
          })
          return
        }

        setAdminAuth({
          isAdmin: profile.role === 'SUPER_ADMIN' && profile.is_active,
          role: profile.role,
          isActive: profile.is_active,
          loading: false,
          error: null
        })
      } catch (error) {
        setAdminAuth({
          isAdmin: false,
          loading: false,
          error: error.message,
          role: null,
          isActive: false
        })
      }
    }

    checkAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkAuth()
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  return adminAuth
}