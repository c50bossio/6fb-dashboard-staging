'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from '../components/SupabaseAuthProvider'
import { createClient } from '../lib/supabase/client'

const TenantContext = createContext()

export const useTenant = () => {
  const context = useContext(TenantContext)
  if (!context) {
    // During build time or server-side rendering, return default values
    if (typeof window === 'undefined' || process.env.NODE_ENV === 'build') {
      return {
        tenant: null,
        loading: false,
        error: null,
        refreshTenant: () => {},
        updateTenant: () => {}
      }
    }
    throw new Error('useTenant must be used within a TenantProvider')
  }
  return context
}

const TenantProvider = ({ children }) => {
  const { user } = useAuth()
  const [tenant, setTenant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Load tenant information based on authenticated user
  useEffect(() => {
    // Guard against infinite loops - only run if user.id actually changed
    if (!user?.id) {
      setTenant(null)
      setLoading(false)
      return
    }

    const loadTenant = async () => {
      try {
        setLoading(true)
        setError(null)

        const supabase = createClient()

        // Get user's profile to find their barbershop_id
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('barbershop_id, role')
          .eq('id', user.id)
          .single()

        if (profileError) {
          console.error('❌ Error fetching profile:', profileError)
          setError(profileError.message)
          setLoading(false)
          return
        }

        // If user has a barbershop_id, load that specific barbershop
        if (profile?.barbershop_id) {
          const { data: barbershop, error: shopError } = await supabase
            .from('barbershops')
            .select('*')
            .eq('id', profile.barbershop_id)
            .single()

          if (shopError) {
            console.error('❌ Error fetching barbershop:', shopError)
            setError(shopError.message)
          } else if (barbershop) {
            setTenant(barbershop)
            console.log('🏢 Tenant loaded:', barbershop.name, `(${barbershop.id})`)
          }
        } else {
          // User has no barbershop_id - query all barbershops they own
          const { data: ownedShops, error: shopsError } = await supabase
            .from('barbershops')
            .select('*')
            .eq('owner_id', user.id)
            .order('created_at', { ascending: true })

          if (shopsError) {
            console.error('❌ Error fetching owned barbershops:', shopsError)
            setError(shopsError.message)
          } else if (ownedShops && ownedShops.length > 0) {
            // User owns barbershops - load the first one
            const firstShop = ownedShops[0]
            setTenant(firstShop)
            console.log('🏢 Tenant loaded (first owned shop):', firstShop.name, `(${firstShop.id})`)

            // Update profile with this barbershop_id for future loads
            await supabase
              .from('profiles')
              .update({ barbershop_id: firstShop.id })
              .eq('id', user.id)
          } else {
            // User has no barbershops - they need to complete onboarding
            console.log('🆕 New user detected - no barbershops found')
            setTenant(null)
          }
        }

      } catch (err) {
        console.error('❌ Error loading tenant:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadTenant()
  }, [user?.id]) // Only re-run when user ID actually changes

  // Tenant management functions
  const updateTenant = async (updates) => {
    if (!tenant) return

    try {
      setLoading(true)
      const supabase = createClient()

      // Update barbershop in Supabase
      const { data: updatedShop, error: updateError } = await supabase
        .from('barbershops')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', tenant.id)
        .select()
        .single()

      if (updateError) {
        console.error('❌ Error updating barbershop:', updateError)
        setError(updateError.message)
        throw updateError
      }

      setTenant(updatedShop)
      console.log('✅ Tenant updated:', updatedShop.name)

      return updatedShop
    } catch (err) {
      console.error('❌ Error updating tenant:', err)
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const setTenantData = (newTenant) => {
    setTenant(newTenant)
  }

  const updateIntegration = async (provider, integrationData) => {
    if (!tenant) return

    try {
      const updatedIntegrations = {
        ...tenant.integrations,
        [provider]: {
          ...tenant.integrations[provider],
          ...integrationData,
          updated_at: new Date().toISOString()
        }
      }

      await updateTenant({ integrations: updatedIntegrations })
      console.log(`🔗 ${provider} integration updated`)
      
    } catch (err) {
      console.error(`❌ Error updating ${provider} integration:`, err)
      throw err
    }
  }

  const getTenantFeature = (featureName) => {
    return tenant?.features?.[featureName] || false
  }

  const hasSubscriptionTier = (tierName) => {
    if (!tenant) return false
    
    const tiers = ['basic', 'professional', 'enterprise']
    const currentTierIndex = tiers.indexOf(tenant.subscription_tier)
    const requiredTierIndex = tiers.indexOf(tierName)
    
    return currentTierIndex >= requiredTierIndex
  }

  const value = {
    tenant,
    loading,
    error,
    setTenant: setTenantData,
    updateTenant,
    updateIntegration,
    getTenantFeature,
    hasSubscriptionTier,
    
    // Computed properties for easy access
    tenantId: tenant?.id,
    tenantName: tenant?.name,
    subscriptionTier: tenant?.subscription_tier,
    businessName: tenant?.settings?.business_name,
    isOwner: user?.id === tenant?.owner_id
  }

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
}

// Use only named export to avoid conflicts  
export { TenantProvider, TenantContext }