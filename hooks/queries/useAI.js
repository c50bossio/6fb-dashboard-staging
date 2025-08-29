/**
 * React Query Hooks for AI Scheduling Features
 * Phase 5-6: AI-powered scheduling intelligence
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-client'
import aiSchedulingAgent from '@/services/ai-scheduling-agent'

/**
 * Get AI scheduling suggestions for optimal time slots
 */
export function useAISchedulingSuggestions(shopId, duration, date) {
  return useQuery({
    queryKey: queryKeys.ai.schedulingSuggestions(shopId, duration, date),
    queryFn: () => aiSchedulingAgent.suggestOptimalSlots(shopId, date, duration),
    enabled: !!shopId && !!date,
    staleTime: 5 * 60 * 1000, // 5 minutes - suggestions can change based on new bookings
  })
}

/**
 * Predict no-show risk for an appointment
 */
export function useNoShowPrediction(appointment) {
  return useQuery({
    queryKey: queryKeys.ai.noShowPrediction(appointment?.id),
    queryFn: () => aiSchedulingAgent.predictNoShowRisk(appointment),
    enabled: !!appointment?.id,
    staleTime: 30 * 60 * 1000, // 30 minutes - risk doesn't change frequently
  })
}

/**
 * Optimize schedule for a specific date
 */
export function useScheduleOptimization() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ shopId, date }) => 
      aiSchedulingAgent.optimizeSchedule(shopId, date),
    onSuccess: (data, { shopId }) => {
      // Invalidate appointments after optimization
      queryClient.invalidateQueries({
        queryKey: queryKeys.appointments.byShop(shopId)
      })
    }
  })
}

/**
 * Get booking pattern analysis
 */
export function useBookingPatterns(shopId) {
  return useQuery({
    queryKey: [...queryKeys.ai.all(), 'patterns', shopId],
    queryFn: () => aiSchedulingAgent.analyzeBookingPatterns(shopId),
    enabled: !!shopId,
    staleTime: 60 * 60 * 1000, // 1 hour - patterns don't change frequently
  })
}

/**
 * Get customer preferences analysis
 */
export function useCustomerPreferences(shopId) {
  return useQuery({
    queryKey: [...queryKeys.ai.all(), 'preferences', shopId],
    queryFn: () => aiSchedulingAgent.getCustomerPreferences(shopId),
    enabled: !!shopId,
    staleTime: 60 * 60 * 1000, // 1 hour
  })
}

/**
 * Generate smart reminders based on no-show risk
 */
export function useSmartReminders() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ appointmentId, riskLevel }) => {
      // This would call an API to schedule smart reminders
      const response = await fetch('/api/ai/smart-reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentId, riskLevel })
      })
      
      if (!response.ok) {
        throw new Error('Failed to schedule smart reminders')
      }
      
      return response.json()
    },
    onSuccess: (data, { appointmentId }) => {
      // Update the appointment with reminder status
      queryClient.setQueryData(
        [...queryKeys.appointments.all(), appointmentId],
        (old) => ({
          ...old,
          smart_reminders_scheduled: true,
          reminder_strategy: data.strategy
        })
      )
    }
  })
}

/**
 * Get AI-powered availability analysis
 */
export function useAvailabilityAnalysis(shopId, dateRange) {
  return useQuery({
    queryKey: [...queryKeys.ai.all(), 'availability', shopId, dateRange],
    queryFn: async () => {
      const dates = []
      const current = new Date(dateRange.start)
      const end = new Date(dateRange.end)
      
      while (current <= end) {
        dates.push(current.toISOString().split('T')[0])
        current.setDate(current.getDate() + 1)
      }
      
      const availabilityPromises = dates.map(date => 
        aiSchedulingAgent.getAvailability(shopId, date)
      )
      
      const results = await Promise.all(availabilityPromises)
      
      return dates.map((date, index) => ({
        date,
        slots: results[index],
        utilization: calculateUtilization(results[index])
      }))
    },
    enabled: !!shopId && !!dateRange?.start && !!dateRange?.end,
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

/**
 * Prefetch AI suggestions for smooth navigation
 */
export function usePrefetchAISuggestions() {
  const queryClient = useQueryClient()
  
  return (shopId, duration, date) => {
    return queryClient.prefetchQuery({
      queryKey: queryKeys.ai.schedulingSuggestions(shopId, duration, date),
      queryFn: () => aiSchedulingAgent.suggestOptimalSlots(shopId, date, duration),
      staleTime: 5 * 60 * 1000,
    })
  }
}

// Helper function to calculate utilization
function calculateUtilization(slots) {
  if (!slots || slots.length === 0) return 0
  
  const totalSlots = slots.length
  const availableSlots = slots.filter(slot => slot.available).length
  const bookedSlots = totalSlots - availableSlots
  
  return Math.round((bookedSlots / totalSlots) * 100)
}