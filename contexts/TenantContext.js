'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from '../components/SupabaseAuthProvider'

const TenantContext = createContext()

export const useTenant = () => {
  const context = useContext(TenantContext)
  if (!context) {
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

  useEffect(() => {
    const loadTenant = async () => {
      if (!user) {
        setTenant(null)
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        const storedTenant = localStorage.getItem(`tenant_${user.id}`)
        
        if (storedTenant) {
          const parsedTenant = JSON.parse(storedTenant)
          setTenant(parsedTenant)
        } else {
        }

        if (!storedTenant) {
          // No demo tenant - user must complete onboarding or have real barbershop data
          setTenant(null)
        }

      } catch (err) {
        console.error('❌ Error loading tenant:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadTenant()
  }, [user])

  const updateTenant = async (updates) => {
    if (!tenant) return

    try {
      setLoading(true)
      
      const updatedTenant = {
        ...tenant,
        ...updates,
        updated_at: new Date().toISOString()
      }
      
      setTenant(updatedTenant)
      
      localStorage.setItem(`tenant_${user.id}`, JSON.stringify(updatedTenant))
      
      
      return updatedTenant
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
    
    if (user && newTenant) {
      localStorage.setItem(`tenant_${user.id}`, JSON.stringify(newTenant))
    }
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
    
    tenantId: tenant?.id,
    tenantName: tenant?.name,
    subscriptionTier: tenant?.subscription_tier,
    businessName: tenant?.settings?.business_name,
    isOwner: user?.id === tenant?.owner_id
  }

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
}

export { TenantProvider, TenantContext }