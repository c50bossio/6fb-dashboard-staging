'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../components/SupabaseAuthProvider'

/**
 * Centralized onboarding state management hook
 * Single source of truth for onboarding status and flow
 */
export function useOnboarding() {
  const { user, profile, loading: authLoading, updateProfile } = useAuth()
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [onboardingStep, setOnboardingStep] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  
  // Determine onboarding status from profile
  const isOnboardingComplete = profile?.onboarding_completed === true
  const needsOnboarding = user && (!profile || !isOnboardingComplete)
  
  // Initialize onboarding visibility
  useEffect(() => {
    if (authLoading) return
    
    // Check URL params for demo/testing
    const urlParams = new URLSearchParams(window.location.search)
    const forceShow = urlParams.has('show_onboarding') || urlParams.has('onboarding')
    
    if (forceShow && !isOnboardingComplete) {
      setShowOnboarding(true)
      // Clean URL
      const url = new URL(window.location)
      url.searchParams.delete('show_onboarding')
      url.searchParams.delete('onboarding')
      window.history.replaceState({}, '', url.toString())
      return
    }
    
    // Show onboarding if needed
    if (needsOnboarding) {
      setShowOnboarding(true)
      setOnboardingStep(profile?.onboarding_step || 0)
    } else {
      setShowOnboarding(false)
    }
  }, [authLoading, user, profile, isOnboardingComplete, needsOnboarding])
  
  // Start onboarding manually (with optional force parameter for testing/demo)
  const startOnboarding = useCallback((force = false) => {
    if (!isOnboardingComplete || force) {
      console.log('🚀 Starting onboarding', { force, isOnboardingComplete })
      setShowOnboarding(true)
      setOnboardingStep(0) // Always start from beginning when forced
    } else {
      console.log('⚠️ Onboarding already complete, not starting', { isOnboardingComplete })
    }
  }, [isOnboardingComplete])
  
  // Hide onboarding (minimize/skip)
  const hideOnboarding = useCallback(async (reason = 'minimized') => {
    setShowOnboarding(false)
    
    if (profile && reason === 'skipped') {
      try {
        await updateProfile({ onboarding_status: 'skipped' })
      } catch (error) {
        console.error('Failed to update onboarding status:', error)
      }
    }
  }, [profile, updateProfile])
  
  // Complete onboarding
  const completeOnboarding = useCallback(async () => {
    if (isProcessing) return
    
    setIsProcessing(true)
    try {
      await updateProfile({
        onboarding_completed: true,
        onboarding_status: 'completed',
        onboarding_step: null
      })
      
      setShowOnboarding(false)
      
      // Refresh page after a short delay to ensure DB update
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    } catch (error) {
      console.error('Failed to complete onboarding:', error)
    } finally {
      setIsProcessing(false)
    }
  }, [isProcessing, updateProfile])
  
  // Update current step
  const updateStep = useCallback(async (step) => {
    setOnboardingStep(step)
    
    // Save progress to profile
    if (profile) {
      try {
        await updateProfile({ onboarding_step: step })
      } catch (error) {
        console.error('Failed to save onboarding step:', error)
      }
    }
  }, [profile, updateProfile])
  
  return {
    // State
    showOnboarding,
    needsOnboarding,
    isOnboardingComplete,
    currentStep: onboardingStep,
    isProcessing,
    
    // Actions
    startOnboarding,
    hideOnboarding,
    completeOnboarding,
    updateStep,
    
    // Data
    user,
    profile,
    loading: authLoading
  }
}