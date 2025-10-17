/**
 * Shared Wizard State Management Hook
 * Feature: 001-complete-feature-011
 *
 * Provides reusable state management for multi-step wizards
 * Based on existing BookingWizard pattern
 */

import { useState, useCallback } from 'react'

/**
 * Custom hook for managing wizard state
 *
 * @param {Object} initialData - Initial wizard data
 * @param {number} initialStep - Starting step number (default: 0)
 * @param {Object[]} steps - Array of step configurations
 * @returns {Object} Wizard state and navigation methods
 */
export function useWizardState(initialData = {}, initialStep = 0, steps = []) {
  const [currentStep, setCurrentStep] = useState(initialStep)
  const [wizardData, setWizardData] = useState(initialData)
  const [completedSteps, setCompletedSteps] = useState(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  /**
   * Update wizard data (partial update)
   */
  const updateData = useCallback((stepData) => {
    setWizardData(prev => ({ ...prev, ...stepData }))
  }, [])

  /**
   * Replace entire wizard data
   */
  const setData = useCallback((data) => {
    setWizardData(data)
  }, [])

  /**
   * Navigate to next step
   */
  const goToNext = useCallback((stepData = null) => {
    if (stepData) {
      updateData(stepData)
    }

    // Mark current step as completed
    setCompletedSteps(prev => new Set([...prev, currentStep]))

    // Move to next step
    setCurrentStep(prev => Math.min(prev + 1, steps.length - 1))
  }, [currentStep, steps.length, updateData])

  /**
   * Navigate to previous step
   */
  const goToPrevious = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 0))
  }, [])

  /**
   * Jump to specific step (only if already completed)
   */
  const goToStep = useCallback((stepNumber) => {
    // Only allow going back to completed steps or current step
    if (stepNumber <= currentStep || completedSteps.has(stepNumber)) {
      setCurrentStep(stepNumber)
    }
  }, [currentStep, completedSteps])

  /**
   * Check if step is completed
   */
  const isStepCompleted = useCallback((stepNumber) => {
    return completedSteps.has(stepNumber)
  }, [completedSteps])

  /**
   * Check if current step can proceed
   * Uses validation function from step configuration
   */
  const canProceed = useCallback(() => {
    const step = steps[currentStep]
    if (!step || !step.validate) {
      return true // No validation defined, allow proceed
    }

    return step.validate(wizardData)
  }, [currentStep, steps, wizardData])

  /**
   * Reset wizard to initial state
   */
  const reset = useCallback(() => {
    setCurrentStep(initialStep)
    setWizardData(initialData)
    setCompletedSteps(new Set())
    setIsLoading(false)
    setError(null)
  }, [initialData, initialStep])

  /**
   * Set loading state
   */
  const setLoadingState = useCallback((loading) => {
    setIsLoading(loading)
  }, [])

  /**
   * Set error state
   */
  const setErrorState = useCallback((errorMessage) => {
    setError(errorMessage)
  }, [])

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    // State
    currentStep,
    wizardData,
    completedSteps,
    isLoading,
    error,

    // Data methods
    updateData,
    setData,

    // Navigation methods
    goToNext,
    goToPrevious,
    goToStep,

    // Validation
    canProceed,
    isStepCompleted,

    // Utility methods
    reset,
    setLoadingState,
    setErrorState,
    clearError,

    // Computed values
    isFirstStep: currentStep === 0,
    isLastStep: currentStep === steps.length - 1,
    progress: steps.length > 0 ? ((currentStep + 1) / steps.length) * 100 : 0,
    totalSteps: steps.length,
  }
}

/**
 * Helper function to create step configuration
 *
 * @param {string} title - Step title
 * @param {string} description - Step description
 * @param {Function} validate - Validation function (receives wizardData, returns boolean)
 * @param {React.Component} component - Step component
 * @returns {Object} Step configuration
 */
export function createStep(title, description, validate = null, component = null) {
  return {
    title,
    description,
    validate,
    component,
  }
}

/**
 * Example usage:
 *
 * const steps = [
 *   createStep('Basic Info', 'Name, email, and bio',
 *     (data) => data.firstName && data.lastName && data.email,
 *     BasicInfoStep
 *   ),
 *   createStep('Services', 'Select services to offer',
 *     (data) => data.selectedServices && data.selectedServices.length > 0,
 *     ServicesStep
 *   ),
 * ]
 *
 * const wizard = useWizardState({
 *   firstName: '',
 *   lastName: '',
 *   email: '',
 *   selectedServices: []
 * }, 0, steps)
 *
 * // In component:
 * wizard.updateData({ firstName: 'John' })
 * wizard.goToNext()
 * console.log(wizard.currentStep) // 1
 * console.log(wizard.progress) // 50
 */
