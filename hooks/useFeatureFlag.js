'use client'

import { useState, useEffect } from 'react'
import { getFeatureFlag, getAllFeatureFlags, getUserFeatureFlags } from '@/lib/feature-flags'
import { useAuth } from '@/components/SupabaseAuthProvider'

// Hook for a single feature flag
export function useFeatureFlag(flagName) {
  const [isEnabled, setIsEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    const fetchFlag = async () => {
      try {
        setLoading(true)
        
        if (user?.id) {
          // Get user-specific flags
          const userFlags = await getUserFeatureFlags(user.id, {
            email: user.email,
            created_at: user.created_at,
            // Add more user properties as needed
          })
          setIsEnabled(userFlags[flagName] ?? false)
        } else {
          // Get general flag
          const value = await getFeatureFlag(flagName)
          setIsEnabled(value)
        }
      } catch (error) {
        console.error(`Error fetching feature flag ${flagName}:`, error)
        setIsEnabled(false)
      } finally {
        setLoading(false)
      }
    }

    fetchFlag()
  }, [flagName, user])

  return { isEnabled, loading }
}

// Hook for all feature flags
export function useFeatureFlags() {
  const [flags, setFlags] = useState({})
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    const fetchFlags = async () => {
      try {
        setLoading(true)
        
        if (user?.id) {
          // Get user-specific flags
          const userFlags = await getUserFeatureFlags(user.id, {
            email: user.email,
            created_at: user.created_at,
            // Add more user properties as needed
          })
          setFlags(userFlags)
        } else {
          // Get general flags
          const allFlags = await getAllFeatureFlags()
          setFlags(allFlags)
        }
      } catch (error) {
        console.error('Error fetching feature flags:', error)
        setFlags({})
      } finally {
        setLoading(false)
      }
    }

    fetchFlags()
  }, [user])

  return { flags, loading }
}

// Hook for A/B testing
export function useABTest(experimentName, variants = ['control', 'variant']) {
  const [variant, setVariant] = useState('control')
  const { user } = useAuth()

  useEffect(() => {
    if (!user?.id) {
      setVariant('control')
      return
    }

    // Simple hash-based assignment
    const hash = user.id.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc)
    }, 0)
    
    const index = Math.abs(hash) % variants.length
    setVariant(variants[index])
  }, [user, experimentName, variants])

  return variant
}