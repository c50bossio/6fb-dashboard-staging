import { ReactNode } from 'react'

// Core booking types
export interface BookingSlot {
  time: string
  endTime: string
  available: boolean
  display: string
  duration: number
  isPopular: boolean
  hasBuffer: boolean
  bufferTime?: number
  conflictingBooking?: ConflictingBooking | null
}

export interface ConflictingBooking {
  id: string
  customer: string
  start: string
  duration: number
}

export interface AvailabilityData {
  slots: BookingSlot[]
  conflicts: BookingSlot[]
  lastChecked: Date | null
  loading: boolean
  error: string | null
}

export interface RealtimeStatus {
  connected: boolean
  lastUpdate: Date | null
  subscriptionActive: boolean
  error: string | null
}

export interface NetworkStatus {
  online: boolean
  effectiveType: string
  downlink: number | null
  rtt: number | null
}

export interface BookingState {
  selectedDateTime: string | null
  validatingSlot: boolean
  optimisticBooking: OptimisticBooking | null
  conflictWarning: string | null
}

export interface OptimisticBooking {
  id: string
  status: 'pending' | 'confirmed' | 'failed'
  scheduled_at: string
  service_name: string
  customer_name: string
}

export interface ValidationResult {
  valid: boolean
  error?: string
  conflicts?: ConflictingBooking[]
  businessHoursError?: string
}

export interface SlotConflictEvent {
  datetime: string
  error: string
  conflicts: ConflictingBooking[]
}

export interface BusinessHours {
  [key: string]: {
    open: string
    close: string
  } | null
}

export interface BookingSettings {
  min_advance_booking?: number
  max_advance_booking?: number
  slot_duration?: number
  buffer_time?: number
  requireAuth?: boolean
}

// Component Props
export interface RealtimeBookingWrapperProps {
  // Core booking props
  barbershopId: string
  barbershopSlug?: string
  preselectedBarber?: string | null
  preselectedService?: string | null
  
  // Wrapper-specific configuration
  enableRealtime?: boolean
  enableConflictPrevention?: boolean
  enableBusinessHoursValidation?: boolean
  enableLoadingStates?: boolean
  refreshInterval?: number
  conflictCheckDelay?: number
  
  // Component selection
  flowComponent?: 'auto' | 'public' | 'enhanced' | 'orchestrator'
  fallbackComponent?: 'public' | 'enhanced'
  
  // Event handlers
  onSlotConflict?: (event: SlotConflictEvent) => void
  onRealtimeError?: (error: Error) => void
  onAvailabilityUpdate?: (data: AvailabilityData) => void
  onBookingAttempt?: (bookingData: any) => void
  onNetworkStatusChange?: (status: NetworkStatus) => void
  
  // Advanced features
  enableOptimisticUpdates?: boolean
  enablePrefetch?: boolean
  enableAnalytics?: boolean
  debugMode?: boolean
  
  // Pass-through props
  [key: string]: any
}

// Enhanced props passed to wrapped components
export interface EnhancedBookingProps {
  // Original props
  barbershopId: string
  barbershopSlug?: string
  preselectedBarber?: string | null
  preselectedService?: string | null
  
  // Real-time availability data
  availableSlots: BookingSlot[]
  conflictedSlots: BookingSlot[]
  slotsLoading: boolean
  slotsError: string | null
  lastUpdated: Date | null
  
  // Real-time status
  realtimeConnected: boolean
  realtimeStatus: RealtimeStatus
  networkStatus: NetworkStatus
  
  // Enhanced callbacks
  onDateTimeSelect: (
    datetime: string,
    service?: any,
    duration?: number
  ) => Promise<ValidationResult>
  onBookingAttempt: (bookingData: any) => Promise<any>
  refreshAvailability: (date?: Date, service?: any, duration?: number) => Promise<BookingSlot[]>
  validateSlot: (timeSlot: string, duration?: number) => Promise<ValidationResult>
  
  // Other props passed through
  [key: string]: any
}

// Hook types
export interface UseRealtimeBookingOptions {
  barbershopId: string
  barberId?: string | null
  serviceId?: string | null
  enableRealtime?: boolean
  enableConflictPrevention?: boolean
}

export interface UseRealtimeBookingReturn {
  availableSlots: BookingSlot[]
  conflicts: BookingSlot[]
  loading: boolean
  error: string | null
  realtimeConnected: boolean
  lastUpdated: Date | null
  checkAvailability: (date: Date, duration?: number) => Promise<BookingSlot[]>
  validateSlot: (datetime: string, duration?: number) => Promise<ValidationResult>
  refreshAvailability: (date: Date, duration?: number) => Promise<BookingSlot[]>
}

// Component exports
declare const RealtimeBookingWrapper: React.FC<RealtimeBookingWrapperProps>
export default RealtimeBookingWrapper

export function useRealtimeBooking(options: UseRealtimeBookingOptions): UseRealtimeBookingReturn

// Utility types for business logic
export interface ShopData {
  id: string
  name: string
  business_hours: BusinessHours
  timezone?: string
  booking_settings?: BookingSettings
}

export interface ExistingBooking {
  id: string
  start_time: string
  duration_minutes: number
  status: 'confirmed' | 'checked_in' | 'cancelled'
  customer_name: string
}

export interface BookingData {
  barbershop_id: string
  barber_id?: string
  service_id: string
  service_name: string
  scheduled_at: string
  duration_minutes: number
  price: number
  customer_name: string
  customer_phone?: string
  customer_email?: string
  customer_notes?: string
  addOns?: AddOn[]
  source?: string
  sms_opt_in?: boolean
  email_opt_in?: boolean
}

export interface AddOn {
  id: string
  name: string
  price: number
  duration_minutes: number
}