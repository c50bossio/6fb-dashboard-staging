/**
 * Centralized exports for React Query data hooks
 * Simplified context system using React Query + Supabase service layer
 */

// Core data hooks
export * from './useAppointments'
export * from './useStaffQuery'
export * from './useServicesQuery'
export * from './useCustomersQuery'
// Note: useRealtimeAppointments conflicts with useAppointments, use selective imports if needed

// Composite hooks
export * from './useShopData'
export * from './useBusinessContext'

// Utility hooks  
export { useToast } from './use-toast'
export { default as useDebounce } from './useDebounce'
export { useNetworkStatus } from './useNetworkStatus'

// Feature hooks
export * from './useAnalytics'
export * from './useOnboarding'
export * from './useNotifications'

// Legacy compatibility (marked for future removal) - temporarily commented out due to conflicts
// export * from './useAppointmentsLegacy'

/**
 * Migration Guide:
 * 
 * Old Context Pattern:
 * ```javascript
 * import { useGlobalDashboard } from '@/contexts/GlobalDashboardContext'
 * const { appointments, staff, isLoading } = useGlobalDashboard()
 * ```
 * 
 * New Hook Pattern:
 * ```javascript
 * import { useShopDashboard } from '@/hooks'
 * const { appointments, staff, isLoading } = useShopDashboard(shopId)
 * ```
 * 
 * Benefits:
 * - Automatic caching and deduplication
 * - Background refetch
 * - Optimistic updates
 * - Better error handling
 * - Real-time subscriptions
 * - TypeScript support (when migrated)
 */