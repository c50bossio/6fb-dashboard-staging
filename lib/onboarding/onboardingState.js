/**
 * Centralized onboarding state management using Supabase for cross-tab persistence
 * Replaces sessionStorage to ensure state is shared across all browser tabs
 */

import { createClient } from '@/lib/supabase/UNIFIED_CLIENT'

class OnboardingStateManager {
  constructor() {
    this.supabase = createClient()
    this.cache = null
    this.cacheExpiry = null
    this.cacheDuration = 5000 // 5 seconds cache
  }

  /**
   * Check if user is currently in onboarding flow
   * This is checked by the auth provider to prevent redirects
   */
  async isOnboardingActive(userId) {
    if (!userId) return false

    try {
      // Use cache if valid
      if (this.cache !== null && this.cacheExpiry > Date.now()) {
        return this.cache
      }

      // Check for any active (non-completed) onboarding sessions
      const { data, error } = await this.supabase
        .from('onboarding_sessions')
        .select('id, is_completed')
        .eq('user_id', userId)
        .eq('is_completed', false)
        .limit(1)

      if (error) {
        console.error('Error checking onboarding state:', error)
        // Fallback to sessionStorage if database fails
        return sessionStorage.getItem('onboarding_active') === 'true'
      }

      const isActive = data && data.length > 0
      
      // Update cache
      this.cache = isActive
      this.cacheExpiry = Date.now() + this.cacheDuration

      return isActive
    } catch (err) {
      console.error('Failed to check onboarding state:', err)
      // Fallback to sessionStorage
      return sessionStorage.getItem('onboarding_active') === 'true'
    }
  }

  /**
   * Get current onboarding step
   */
  async getCurrentStep(userId) {
    if (!userId) return null

    try {
      const { data, error } = await this.supabase
        .from('onboarding_sessions')
        .select('current_step, session_type')
        .eq('user_id', userId)
        .eq('is_completed', false)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single()

      if (error || !data) {
        // Fallback to sessionStorage
        return sessionStorage.getItem('onboarding_current_step')
      }

      return data.current_step
    } catch (err) {
      console.error('Failed to get current step:', err)
      return sessionStorage.getItem('onboarding_current_step')
    }
  }

  /**
   * Set onboarding as active (called when starting onboarding)
   */
  async setOnboardingActive(userId, sessionType, currentStep) {
    if (!userId) return

    try {
      // Check if session exists first
      const { data: existing } = await this.supabase
        .from('onboarding_sessions')
        .select('id')
        .eq('user_id', userId)
        .eq('session_type', sessionType)
        .single();
      
      if (existing) {
        // Update existing session
        const { error } = await this.supabase
          .from('onboarding_sessions')
          .update({
            current_step: currentStep,
            is_completed: false,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)
          .eq('session_type', sessionType);
        
        if (error) {
          console.error('Error updating onboarding session:', error);
        }
      } else {
        // Create new session
        const { error } = await this.supabase
          .from('onboarding_sessions')
          .insert({
            user_id: userId,
            session_type: sessionType,
            current_step: currentStep,
            is_completed: false,
            progress_percentage: 0,
            updated_at: new Date().toISOString()
          });
        
        if (error) {
          console.error('Error creating onboarding session:', error);
        }
      }

      // Clear cache to force refresh
      this.cache = null
      
      // Also set in sessionStorage as backup
      sessionStorage.setItem('onboarding_active', 'true')
      sessionStorage.setItem('onboarding_current_step', currentStep)
    } catch (err) {
      console.error('Failed to set onboarding active:', err)
      // Fallback to sessionStorage only
      sessionStorage.setItem('onboarding_active', 'true')
      sessionStorage.setItem('onboarding_current_step', currentStep)
    }
  }

  /**
   * Mark onboarding as complete
   */
  async completeOnboarding(userId, sessionType) {
    if (!userId) return

    try {
      const { error } = await this.supabase
        .from('onboarding_sessions')
        .update({
          is_completed: true,
          progress_percentage: 100,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('session_type', sessionType)

      if (error) {
        console.error('Error completing onboarding:', error)
      }

      // Clear cache
      this.cache = null
      
      // Clear sessionStorage
      sessionStorage.removeItem('onboarding_active')
      sessionStorage.removeItem('onboarding_current_step')
    } catch (err) {
      console.error('Failed to complete onboarding:', err)
      // Still clear sessionStorage
      sessionStorage.removeItem('onboarding_active')
      sessionStorage.removeItem('onboarding_current_step')
    }
  }

  /**
   * Clear all onboarding state (for logout)
   */
  clearState() {
    this.cache = null
    this.cacheExpiry = null
    sessionStorage.removeItem('onboarding_active')
    sessionStorage.removeItem('onboarding_current_step')
  }
}

// Export singleton instance
export const onboardingStateManager = new OnboardingStateManager()