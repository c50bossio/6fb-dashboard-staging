'use client'

import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon, CalendarIcon, ClockIcon, UserIcon, CurrencyDollarIcon, TrashIcon, ExclamationTriangleIcon, CheckIcon } from '@heroicons/react/24/outline'
import { useState, useEffect, useCallback, useRef } from 'react'
import { Fragment } from 'react'

import { useAuth } from '@/components/SupabaseAuthProvider'
import CustomerSearchModal from './CustomerSearchModal'

export default function AppointmentBookingModal({
  isOpen,
  onClose,
  selectedSlot,
  barbers,
  services,
  onBookingComplete,
  barbershopId,
  editingAppointment = null
}) {
  const { user } = useAuth()
  const isEditing = !!editingAppointment
  
  // Form state - Initialize with selectedSlot data
  const getInitialDateTime = () => {
    if (selectedSlot?.start) {
      // Handle both Date objects and ISO strings
      const date = selectedSlot.start instanceof Date ? selectedSlot.start : new Date(selectedSlot.start)
      // Convert to local time string for datetime-local input
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      return `${year}-${month}-${day}T${hours}:${minutes}`
    }
    return ''
  }
  
  const [formData, setFormData] = useState({
    barber_id: selectedSlot?.barberId || '',
    service_id: '',
    scheduled_at: getInitialDateTime(),
    duration_minutes: 60,
    service_price: 0,
    tip_amount: 0,
    client_name: '',
    client_phone: '',
    client_email: '',
    client_notes: '',
    is_walk_in: false,
    booking_source: 'online',
    priority: 0,
    // Recurring appointment fields
    is_recurring: false,
    recurrence_pattern: 'weekly', // daily, weekly, monthly
    recurrence_interval: 1, // every N weeks/months
    recurrence_days: [], // for weekly: [1,2,3] = Mon,Tue,Wed
    recurrence_end_type: 'count', // count, date, never
    recurrence_count: 4, // number of occurrences
    recurrence_end_date: ''
  })
  
  const [availability, setAvailability] = useState([])
  const [checkingAvailability, setCheckingAvailability] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [availabilityError, setAvailabilityError] = useState('')
  const [checkingConflicts, setCheckingConflicts] = useState(false)
  const [conflicts, setConflicts] = useState(null)
  const [conflictResolution, setConflictResolution] = useState('skip')
  const [showConversionConfirmation, setShowConversionConfirmation] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [isValidating, setIsValidating] = useState(false)
  
  // Customer management state
  const [customerMode, setCustomerMode] = useState('new') // 'new' or 'existing'
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [showCustomerSearch, setShowCustomerSearch] = useState(false)
  const [customerSearchLoading, setCustomerSearchLoading] = useState(false)
  
  // Notification preferences state
  const [notificationPreferences, setNotificationPreferences] = useState({
    sms: true,
    email: true,
    confirmations: true,
    reminders: true
  })
  
  // Delete/Cancel confirmation dialog state
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  const [deleteOption, setDeleteOption] = useState('single') // 'single' or 'all' for recurring
  const [deletingAppointment, setDeletingAppointment] = useState(false)
  const [actionType, setActionType] = useState('cancel') // 'cancel' or 'delete'

  // Populate form when modal opens with selectedSlot or when editing
  useEffect(() => {
    // PHASE 1 FIX: Reset delete option when modal opens
    setDeleteOption('single')
    setActionType('cancel')
    setShowDeleteConfirmation(false)
    
    if (isEditing && editingAppointment) {
      // Convert appointment time to local time for editing
      let scheduledAt = ''
      if (editingAppointment.scheduled_at) {
        const date = new Date(editingAppointment.scheduled_at)
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        const hours = String(date.getHours()).padStart(2, '0')
        const minutes = String(date.getMinutes()).padStart(2, '0')
        scheduledAt = `${year}-${month}-${day}T${hours}:${minutes}`
      }
      
      // Debug logging to see what IDs we're trying to set
      console.log('🔍 Modal - Setting form data for editing:', {
        barber_id: editingAppointment.barber_id,
        service_id: editingAppointment.service_id,
        editingAppointment: editingAppointment
      })
      
      setFormData({
        barber_id: editingAppointment.barber_id || '',
        service_id: editingAppointment.service_id || '',
        scheduled_at: scheduledAt,
        duration_minutes: editingAppointment.duration_minutes || 60,
        service_price: editingAppointment.service_price || 0,
        tip_amount: editingAppointment.tip_amount || 0,
        client_name: editingAppointment.client_name || editingAppointment.client?.name || '',
        client_phone: editingAppointment.client_phone || editingAppointment.client?.phone || '',
        client_email: editingAppointment.client_email || editingAppointment.client?.email || '',
        client_notes: editingAppointment.client_notes || '',
        is_walk_in: editingAppointment.is_walk_in || false,
        booking_source: editingAppointment.booking_source || 'online',
        priority: editingAppointment.priority || 0,
        // Recurring fields - only show for parent recurring events
        is_recurring: !!editingAppointment.recurrence_rule,
        recurrence_pattern: 'weekly',
        recurrence_interval: 1,
        recurrence_days: [],
        recurrence_end_type: 'count',
        recurrence_count: 4,
        recurrence_end_date: ''
      })
    } else if (selectedSlot && !isEditing) {
      // Update form when opening with a new selected slot
      let dateTime
      const slotDate = selectedSlot.start instanceof Date 
        ? selectedSlot.start 
        : new Date(selectedSlot.start)
      
      // Handle different view types
      if (selectedSlot.needsTimePicker) {
        // Month view: Use selected date with suggested time
        const year = slotDate.getFullYear()
        const month = String(slotDate.getMonth() + 1).padStart(2, '0')
        const day = String(slotDate.getDate()).padStart(2, '0')
        const time = selectedSlot.suggestedTime || '09:00'
        dateTime = `${year}-${month}-${day}T${time}`
      } else {
        // Other views: Use exact time from slot - convert to local time
        const year = slotDate.getFullYear()
        const month = String(slotDate.getMonth() + 1).padStart(2, '0')
        const day = String(slotDate.getDate()).padStart(2, '0')
        const hours = String(slotDate.getHours()).padStart(2, '0')
        const minutes = String(slotDate.getMinutes()).padStart(2, '0')
        dateTime = `${year}-${month}-${day}T${hours}:${minutes}`
      }
      
      setFormData(prev => ({
        ...prev,
        barber_id: selectedSlot.barberId || '',
        scheduled_at: dateTime
      }))
    }
  }, [isEditing, editingAppointment, selectedSlot])

  // Calculate end time based on start time and duration
  const calculateEndTime = useCallback(() => {
    if (formData.scheduled_at && formData.duration_minutes) {
      const start = new Date(formData.scheduled_at)
      const end = new Date(start.getTime() + formData.duration_minutes * 60000)
      return end
    }
    return null
  }, [formData.scheduled_at, formData.duration_minutes])

  // Format time range for display
  const getTimeRangeDisplay = useCallback(() => {
    if (formData.scheduled_at && formData.duration_minutes) {
      const start = new Date(formData.scheduled_at)
      const end = calculateEndTime()
      if (end) {
        const startTime = start.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        })
        const endTime = end.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        })
        return `${startTime} - ${endTime}`
      }
    }
    return null
  }, [formData.scheduled_at, formData.duration_minutes, calculateEndTime])

  // Update service details when service is selected
  useEffect(() => {
    if (formData.service_id) {
      const selectedService = services.find(s => s.id === formData.service_id)
      if (selectedService) {
        // Only update if values are actually different to prevent infinite loop
        if (formData.duration_minutes !== selectedService.duration_minutes ||
            formData.service_price !== parseFloat(selectedService.price)) {
          setFormData(prev => ({
            ...prev,
            duration_minutes: selectedService.duration_minutes,
            service_price: parseFloat(selectedService.price)
          }))
        }
      }
    }
  }, [formData.service_id, formData.duration_minutes, formData.service_price, services])

  // Check availability when barber, date, or duration changes
  const checkAvailability = useCallback(async () => {
    if (!formData.barber_id || !formData.scheduled_at || !formData.duration_minutes) return
    
    setCheckingAvailability(true)
    setAvailabilityError('')
    
    try {
      const appointmentDate = new Date(formData.scheduled_at)
      const dateStr = appointmentDate.toISOString().split('T')[0]
      
      const params = new URLSearchParams({
        barber_id: formData.barber_id,
        date: dateStr,
        duration_minutes: formData.duration_minutes.toString()
      })
      
      if (isEditing && editingAppointment?.id) {
        params.append('exclude_appointment_id', editingAppointment.id)
      }
      
      const response = await fetch(`/api/appointments/availability?${params}`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to check availability')
      }
      
      setAvailability(data.available_slots || [])
      
      // Check if selected time is available
      const selectedTime = appointmentDate.toTimeString().slice(0, 5)
      const isAvailable = data.available_slots?.some(slot => 
        slot.start_time === selectedTime && slot.available
      )
      
      if (!isAvailable && data.available_slots?.length > 0) {
        setAvailabilityError('Selected time slot is not available. Please choose from available times below.')
      }
      
    } catch (error) {
      console.error('Error checking availability:', error)
      setAvailabilityError('Failed to check availability: ' + error.message)
    } finally {
      setCheckingAvailability(false)
    }
  }, [formData.barber_id, formData.scheduled_at, formData.duration_minutes, isEditing, editingAppointment?.id])

  // Use useRef for the timer to avoid dependency issues
  const availabilityTimerRef = useRef(null)

  // Debounced availability check
  const debouncedAvailabilityCheck = useCallback(() => {
    // Clear existing timer
    if (availabilityTimerRef.current) {
      clearTimeout(availabilityTimerRef.current)
    }
    
    // Set new timer
    availabilityTimerRef.current = setTimeout(() => {
      checkAvailability()
    }, 800) // Wait 800ms after user stops typing/changing
  }, [checkAvailability])

  useEffect(() => {
    debouncedAvailabilityCheck()
    
    // Cleanup timer on unmount
    return () => {
      if (availabilityTimerRef.current) {
        clearTimeout(availabilityTimerRef.current)
      }
    }
  }, [debouncedAvailabilityCheck])

  // Validation function
  const validateField = (name, value) => {
    const errors = {}
    
    switch (name) {
      case 'client_name':
        if (!value.trim()) {
          errors.client_name = 'Customer name is required'
        } else if (value.trim().length < 2) {
          errors.client_name = 'Name must be at least 2 characters'
        }
        break
      case 'client_phone':
        if (!value.trim()) {
          errors.client_phone = 'Phone number is required'
        } else if (!/^[\+]?[\d\s\-\(\)]{10,}$/.test(value.trim())) {
          errors.client_phone = 'Please enter a valid phone number'
        }
        break
      case 'client_email':
        if (value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
          errors.client_email = 'Please enter a valid email address'
        }
        break
      case 'scheduled_at':
        if (!value) {
          errors.scheduled_at = 'Appointment time is required'
        } else {
          const appointmentDate = new Date(value)
          const now = new Date()
          if (appointmentDate < now) {
            errors.scheduled_at = 'Appointment must be in the future'
          }
        }
        break
      case 'barber_id':
        if (!value) {
          errors.barber_id = 'Please select a barber'
        }
        break
      case 'service_id':
        if (!value) {
          errors.service_id = 'Please select a service'
        }
        break
    }
    
    return errors
  }

  // Validate all required fields
  const validateForm = () => {
    const requiredFields = ['client_name', 'client_phone', 'scheduled_at', 'barber_id', 'service_id']
    let allErrors = {}
    
    requiredFields.forEach(field => {
      const fieldValue = formData[field]
      const fieldErrors = validateField(field, fieldValue)
      allErrors = { ...allErrors, ...fieldErrors }
    })
    
    // Validate email if provided
    if (formData.client_email) {
      const emailErrors = validateField('client_email', formData.client_email)
      allErrors = { ...allErrors, ...emailErrors }
    }
    
    setFieldErrors(allErrors)
    return Object.keys(allErrors).length === 0
  }

  // Customer management functions
  const handleCustomerModeChange = (mode) => {
    setCustomerMode(mode)
    if (mode === 'new') {
      setSelectedCustomer(null)
      // Clear form fields when switching to new customer
      setFormData(prev => ({
        ...prev,
        client_name: '',
        client_phone: '',
        client_email: ''
      }))
    } else if (mode === 'existing') {
      setShowCustomerSearch(true)
    }
  }

  const handleSelectCustomer = async (customer) => {
    setSelectedCustomer(customer)
    setCustomerMode('existing')
    
    // Populate form with customer data
    setFormData(prev => ({
      ...prev,
      client_name: customer.name || '',
      client_phone: customer.phone || '',
      client_email: customer.email || '',
      customer_id: customer.id
    }))
    
    // Load customer notification preferences
    if (customer.notification_preferences) {
      setNotificationPreferences(customer.notification_preferences)
    }
    
    // Clear any existing field errors for customer fields
    setFieldErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors.client_name
      delete newErrors.client_phone
      delete newErrors.client_email
      return newErrors
    })
  }

  const handleCreateNewCustomer = () => {
    setCustomerMode('new')
    setSelectedCustomer(null)
    setShowCustomerSearch(false)
  }

  // Quick customer lookup by phone/email
  const quickCustomerLookup = async (phone, email) => {
    if (!phone && !email) return

    setCustomerSearchLoading(true)
    try {
      const response = await fetch('/api/customers/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phone,
          email,
          barbershop_id: barbershopId
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.found && data.customer) {
          // Auto-select found customer
          handleSelectCustomer(data.customer)
        }
      }
    } catch (error) {
      console.error('Error in quick customer lookup:', error)
    } finally {
      setCustomerSearchLoading(false)
    }
  }

  const handleInputChange = async (e) => {
    const { name, value, type, checked } = e.target
    
    // Special handling for converting to recurring
    if (name === 'is_recurring' && checked && isEditing && !editingAppointment?.recurrence_rule) {
      // Preserve the original day and time when converting to recurring
      const appointmentDate = new Date(formData.scheduled_at)
      const dayOfWeek = appointmentDate.getDay()
      
      console.log('Converting to recurring - preserving time:', {
        originalTime: formData.scheduled_at,
        dayOfWeek: dayOfWeek,
        appointmentDate: appointmentDate.toString()
      })
      
      setFormData(prev => ({
        ...prev,
        is_recurring: true,
        recurrence_pattern: 'weekly', // Default to weekly
        recurrence_interval: 1,
        recurrence_days: [dayOfWeek], // Set the day to match original appointment
        recurrence_end_type: 'count',
        recurrence_count: 10
        // Note: scheduled_at is NOT changed, preserving the original time
      }))
      
      setShowConversionConfirmation(true)
      
      // Check for conflicts when converting to recurring
      setTimeout(() => checkRecurringConflicts(), 500)
    } else if (name === 'is_recurring' && !checked) {
      setShowConversionConfirmation(false)
      setConflicts(null)
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }))
      
      // Real-time validation for individual fields
      if (['client_name', 'client_phone', 'client_email', 'scheduled_at', 'barber_id', 'service_id'].includes(name)) {
        const fieldErrors = validateField(name, type === 'checkbox' ? checked : value)
        setFieldErrors(prev => ({
          ...prev,
          ...fieldErrors,
          // Clear error if field is now valid
          ...(Object.keys(fieldErrors).length === 0 ? { [name]: undefined } : {})
        }))
      }
    }
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setIsValidating(true)
    
    // Validate form before submission
    if (!validateForm()) {
      setIsValidating(false)
      setLoading(false)
      setError('Please fix the errors above before submitting.')
      return
    }
    
    try {
      // Validate required fields
      if (!formData.barber_id || !formData.service_id || !formData.scheduled_at) {
        throw new Error('Please fill in all required fields')
      }
      
      if (!formData.client_name && !user) {
        throw new Error('Customer name is required')
      }
      
      // Prepare appointment data with customer and notification information
      const appointmentData = {
        ...formData,
        barbershop_id: barbershopId,
        client_id: user?.id || null,
        total_amount: formData.service_price + (formData.tip_amount || 0),
        scheduled_at: new Date(formData.scheduled_at).toISOString(),
        recurrence_rule: generateRRule(),
        
        // Customer management data
        customer_id: selectedCustomer?.id || null,
        customer_mode: customerMode,
        is_new_customer: customerMode === 'new',
        
        // Notification preferences
        notification_preferences: notificationPreferences,
        send_notifications: notificationPreferences.confirmations || notificationPreferences.reminders,
        
        // Customer data for API compatibility
        customer_name: formData.client_name,
        customer_phone: formData.client_phone, 
        customer_email: formData.client_email
      }
      
      if (isEditing) {
        // Check if converting to recurring appointment
        if (formData.is_recurring && !editingAppointment.recurrence_rule) {
          // Don't proceed if user selected cancel for conflicts
          if (conflicts && conflicts.has_conflicts && conflictResolution === 'cancel') {
            throw new Error('Conversion cancelled due to conflicts')
          }
          
          // Convert existing appointment to recurring
          const response = await fetch(`/api/calendar/appointments/${editingAppointment.id}/convert-recurring`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              ...appointmentData,
              conflict_resolution: conflictResolution,
              skip_dates: conflicts?.conflict_dates || []
            })
          })
          
          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || 'Failed to convert to recurring appointment')
          }
          
          const data = await response.json()
          console.log('Convert recurring response:', data)
          // Pass the appointment data properly
          if (data && data.appointment) {
            onBookingComplete(data.appointment)
          } else {
            console.error('Invalid response from convert-recurring:', data)
            throw new Error('Invalid response from server')
          }
        } else {
          // Update existing appointment normally
          const response = await fetch(`/api/calendar/appointments/${editingAppointment.id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(appointmentData)
          })
          
          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || 'Failed to update appointment')
          }
          
          const data = await response.json()
          onBookingComplete(data.appointment)
        }
      } else {
        // Create new appointment
        const response = await fetch('/api/calendar/appointments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(appointmentData)
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to create appointment')
        }
        
        const data = await response.json()
        console.log('New appointment created:', data)
        onBookingComplete(data.appointment || data)
      }
      
    } catch (error) {
      console.error('Error submitting appointment:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }
  
  // Handle appointment uncancellation (reactivate cancelled appointment)
  const handleUncancel = async () => {
    if (!editingAppointment || !editingAppointment.id) {
      console.error('No appointment to uncancel', editingAppointment)
      setError('No appointment ID found. This may be demo data that cannot be uncancelled.')
      return
    }
    
    console.log('Attempting to uncancel appointment:', editingAppointment.id)
    
    setDeletingAppointment(true)
    setError('')
    
    try {
      const response = await fetch('/api/calendar/appointments/uncancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appointmentId: editingAppointment.id
        })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to uncancel appointment')
      }
      
      console.log('Uncancel successful:', data)
      
      // Close the modal and refresh the calendar
      setShowDeleteConfirmation(false)
      onClose()
      
      // Call the booking complete callback to refresh the calendar
      if (onBookingComplete) {
        await onBookingComplete({ isUncancelled: true })
      }
      
    } catch (error) {
      console.error('Error uncancelling appointment:', error)
      setError('Failed to uncancel appointment: ' + error.message)
    } finally {
      setDeletingAppointment(false)
    }
  }

  // Handle appointment cancellation (soft delete - marks as cancelled, stays visible)
  const handleCancel = async () => {
    if (!editingAppointment || !editingAppointment.id) {
      console.error('No appointment to cancel', editingAppointment)
      setError('No appointment ID found. This may be demo data that cannot be cancelled.')
      return
    }
    
    console.log('Attempting to cancel appointment:', editingAppointment.id)
    
    setDeletingAppointment(true)
    setError('')
    
    try {
      const response = await fetch('/api/calendar/appointments/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appointmentId: editingAppointment.id
        })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel appointment')
      }
      
      console.log('Cancel successful:', data)
      
      // Close the modal and refresh the calendar
      setShowDeleteConfirmation(false)
      onClose()
      
      // Call the booking complete callback to refresh the calendar
      if (onBookingComplete) {
        await onBookingComplete({ isCancelled: true })
      }
      
    } catch (error) {
      console.error('Error cancelling appointment:', error)
      setError('Failed to cancel appointment: ' + error.message)
    } finally {
      setDeletingAppointment(false)
    }
  }

  // Handle appointment deletion (hard delete - completely removes from calendar and history)
  const handleDelete = async () => {
    if (!editingAppointment || !editingAppointment.id) {
      console.error('No appointment to delete', editingAppointment)
      setError('No appointment ID found. This may be demo data that cannot be deleted.')
      return
    }
    
    console.log('🔴 DELETE ATTEMPT - Appointment Details:', {
      id: editingAppointment.id,
      status: editingAppointment.extendedProps?.status,
      isRecurring: editingAppointment.isRecurring,
      extendedProps: editingAppointment.extendedProps,
      fullAppointment: editingAppointment
    })
    
    setDeletingAppointment(true)
    setError('')
    
    try {
      // Build delete URL with appropriate parameters
      let deleteUrl = `/api/calendar/appointments/${editingAppointment.id}`
      const params = new URLSearchParams()
      
      // PHASE 1 ENHANCED: Explicitly check for cancelled status FIRST
      const isCancelled = editingAppointment.extendedProps?.status === 'cancelled'
      
      if (isCancelled) {
        // PHASE 1 FIX: Cancelled appointments NEVER get parameters
        console.log('🔴 DELETE - CANCELLED APPOINTMENT - NO PARAMETERS WILL BE SENT')
        console.log('🔴 DELETE - Status:', editingAppointment.extendedProps?.status)
        // Do NOT add any parameters - just use base URL
      } else {
        // Only check recurring logic for NON-cancelled appointments
        const isActuallyRecurring = editingAppointment.isRecurring || editingAppointment.extendedProps?.isRecurring
        
        console.log('🔴 DELETE - Non-Cancelled Appointment Check:', {
          isRecurring: editingAppointment.isRecurring,
          extendedPropsRecurring: editingAppointment.extendedProps?.isRecurring,
          status: editingAppointment.extendedProps?.status,
          isActuallyRecurring,
          deleteOption
        })
        
        // Only add parameters for actual recurring appointments that are NOT cancelled
        if (isActuallyRecurring) {
          if (deleteOption === 'all') {
            params.append('deleteAll', 'true')
          } else if (deleteOption === 'single' && editingAppointment.start) {
            // Get the date of this specific occurrence
            const occurrenceDate = new Date(editingAppointment.start)
            params.append('cancelDate', occurrenceDate.toISOString().split('T')[0])
          }
        }
      }
      
      if (params.toString()) {
        deleteUrl += `?${params.toString()}`
      }
      
      console.log('🔴 DELETE URL:', deleteUrl)
      console.log('🔴 URL PARAMS:', params.toString() || 'NONE')
      
      // Use DELETE method to actually remove from database
      const response = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete appointment')
      }
      
      console.log('Delete successful:', data)
      
      // Close the modal and refresh the calendar
      setShowDeleteConfirmation(false)
      onClose()
      
      // Call the booking complete callback to refresh the calendar
      // Pass a special flag to indicate this was a deletion
      if (onBookingComplete) {
        await onBookingComplete({ isDeleted: true })
      }
      
    } catch (error) {
      console.error('Error deleting appointment:', error)
      setError('Failed to delete appointment: ' + error.message)
    } finally {
      setDeletingAppointment(false)
    }
  }

  const handleTimeSlotSelect = (slot) => {
    if (!slot.available) return
    
    const appointmentDate = new Date(formData.scheduled_at)
    const [hours, minutes] = slot.start_time.split(':')
    
    appointmentDate.setHours(parseInt(hours), parseInt(minutes), 0, 0)
    
    setFormData(prev => ({
      ...prev,
      scheduled_at: appointmentDate.toISOString().slice(0, 16)
    }))
    setAvailabilityError('')
  }

  // Check for conflicts when converting to recurring
  const checkRecurringConflicts = async () => {
    if (!formData.is_recurring || !formData.barber_id) return
    
    setCheckingConflicts(true)
    setConflicts(null)
    
    try {
      const rrule = generateRRule()
      if (!rrule) return
      
      const response = await fetch('/api/calendar/appointments/check-conflicts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          appointment_id: editingAppointment?.id,
          barber_id: formData.barber_id,
          start_time: formData.scheduled_at,
          end_time: new Date(new Date(formData.scheduled_at).getTime() + formData.duration_minutes * 60000).toISOString(),
          rrule: rrule,
          check_count: formData.recurrence_count || 10
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setConflicts(data)
      }
    } catch (error) {
      console.error('Error checking conflicts:', error)
    } finally {
      setCheckingConflicts(false)
    }
  }
  
  // Helper function to generate RRule string
  const generateRRule = () => {
    if (!formData.is_recurring) return null
    
    const startDate = new Date(formData.scheduled_at)
    let freq = 'WEEKLY'
    let interval = formData.recurrence_interval
    
    switch (formData.recurrence_pattern) {
      case 'daily':
        freq = 'DAILY'
        break
      case 'weekly':
        freq = 'WEEKLY'
        break
      case 'monthly':
        freq = 'MONTHLY'
        break
    }
    
    let rrule = `FREQ=${freq};INTERVAL=${interval}`
    
    // Add end condition
    if (formData.recurrence_end_type === 'count') {
      rrule += `;COUNT=${formData.recurrence_count}`
    } else if (formData.recurrence_end_type === 'date' && formData.recurrence_end_date) {
      const endDate = new Date(formData.recurrence_end_date)
      const until = endDate.toISOString().replace(/[:\-]/g, '').split('.')[0] + 'Z'
      rrule += `;UNTIL=${until}`
    }
    
    // Add days of week for weekly pattern
    if (formData.recurrence_pattern === 'weekly' && formData.recurrence_days.length > 0) {
      const days = formData.recurrence_days.map(day => {
        const weekdays = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']
        return weekdays[day]
      }).join(',')
      rrule += `;BYDAY=${days}`
    }
    
    return rrule
  }

  const selectedBarber = barbers.find(b => b.id === formData.barber_id)
  const selectedService = services.find(s => s.id === formData.service_id)

  return (
    <>
      <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                  <button
                    type="button"
                    className="min-h-[44px] min-w-[44px] p-3 rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center justify-center"
                    onClick={onClose}
                  >
                    <span className="sr-only">Close</span>
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>
                
                <div className="px-4 pb-4 pt-5 sm:p-6">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                    <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-gray-900 mb-6">
                      {isEditing ? 'Edit Appointment' : 'Book New Appointment'}
                      {isEditing && editingAppointment?.recurrence_rule && (
                        <div className="mt-2 text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-md p-3">
                          🔄 This is a recurring appointment. Changes will only apply to this specific occurrence.
                        </div>
                      )}
                    </Dialog.Title>
                    
                    <form onSubmit={handleSubmit} className="space-y-6">
                      {/* Error Display */}
                      {error && (
                        <div className="rounded-md bg-red-50 p-4">
                          <div className="text-sm text-red-700">{error}</div>
                        </div>
                      )}
                      
                      {/* Barber Selection */}
                      <div>
                        <label htmlFor="barber_id" className="block text-sm font-medium text-gray-700">
                          Barber <span className="text-red-500">*</span>
                        </label>
                        <select
                          id="barber_id"
                          name="barber_id"
                          value={formData.barber_id}
                          onChange={handleInputChange}
                          className={`mt-1 block w-full rounded-md shadow-sm ${
                            fieldErrors.barber_id 
                              ? 'border-red-300 focus:border-red-500 focus:ring-red-500 ring-red-500 ring-1' 
                              : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                          } ${loading ? 'bg-gray-50' : ''}`}
                          disabled={loading}
                          required
                        >
                          <option value="">Select a barber</option>
                          {barbers.map(barber => (
                            <option key={barber.id} value={barber.id}>
                              {barber.name}
                            </option>
                          ))}
                        </select>
                        {fieldErrors.barber_id && (
                          <p className="mt-1 text-sm text-red-600">{fieldErrors.barber_id}</p>
                        )}
                      </div>

                      {/* Service Selection */}
                      <div>
                        <label htmlFor="service_id" className="block text-sm font-medium text-gray-700">
                          Service <span className="text-red-500">*</span>
                        </label>
                        <select
                          id="service_id"
                          name="service_id"
                          value={formData.service_id}
                          onChange={handleInputChange}
                          className={`mt-1 block w-full rounded-md shadow-sm ${
                            fieldErrors.service_id 
                              ? 'border-red-300 focus:border-red-500 focus:ring-red-500 ring-red-500 ring-1' 
                              : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                          } ${loading ? 'bg-gray-50' : ''}`}
                          disabled={loading}
                          required
                        >
                          <option value="">Select a service</option>
                          {services.map(service => (
                            <option key={service.id} value={service.id}>
                              {service.name} - ${service.price} ({service.duration_minutes}min)
                            </option>
                          ))}
                        </select>
                        {fieldErrors.service_id && (
                          <p className="mt-1 text-sm text-red-600">{fieldErrors.service_id}</p>
                        )}
                        {selectedService && (
                          <p className="mt-1 text-sm text-gray-500">
                            {selectedService.description}
                          </p>
                        )}
                      </div>

                      {/* Time Slot Display - Shows when service and time are selected */}
                      {formData.scheduled_at && formData.service_id && getTimeRangeDisplay() && (
                        <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                          <div className="flex items-center">
                            <ClockIcon className="h-5 w-5 text-blue-600 mr-2" />
                            <div>
                              <p className="text-sm font-medium text-blue-900">
                                Appointment Time Slot
                              </p>
                              <p className="text-lg font-semibold text-blue-700">
                                {getTimeRangeDisplay()}
                              </p>
                              <p className="text-xs text-blue-600 mt-1">
                                Duration: {formData.duration_minutes} minutes
                                {selectedService && ` • ${selectedService.name}`}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Date and Time */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="scheduled_at" className="block text-sm font-medium text-gray-700">
                            Date & Time <span className="text-red-500">*</span>
                            {selectedSlot?.needsTimePicker && (
                              <span className="ml-2 text-xs text-blue-600 font-normal">
                                (Please select a time for {selectedSlot.selectedDate})
                              </span>
                            )}
                          </label>
                          <input
                            type="datetime-local"
                            id="scheduled_at"
                            name="scheduled_at"
                            value={formData.scheduled_at}
                            onChange={handleInputChange}
                            className={`mt-1 block w-full rounded-md shadow-sm ${
                              fieldErrors.scheduled_at 
                                ? 'border-red-300 focus:border-red-500 focus:ring-red-500 ring-red-500 ring-1' 
                                : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                            } ${loading ? 'bg-gray-50' : ''}`}
                            disabled={loading}
                            required
                          />
                          {fieldErrors.scheduled_at && (
                            <p className="mt-1 text-sm text-red-600">{fieldErrors.scheduled_at}</p>
                          )}
                        </div>
                        
                        <div>
                          <label htmlFor="duration_minutes" className="block text-sm font-medium text-gray-700">
                            Duration (minutes)
                          </label>
                          <input
                            type="number"
                            id="duration_minutes"
                            name="duration_minutes"
                            value={formData.duration_minutes}
                            onChange={handleInputChange}
                            min="5"
                            max="480"
                            step="5"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      {/* Available Time Slots */}
                      {availability.length > 0 && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-3">
                            Available Time Slots
                          </label>
                          {checkingAvailability ? (
                            <div className="flex items-center justify-center py-4">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                              <span className="ml-2 text-sm text-gray-600">
                                Checking availability...
                              </span>
                            </div>
                          ) : (
                            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-32 overflow-y-auto">
                              {availability.map((slot, index) => (
                                <button
                                  key={index}
                                  type="button"
                                  onClick={() => handleTimeSlotSelect(slot)}
                                  disabled={!slot.available}
                                  className={`min-h-[44px] px-3 py-2 text-xs rounded-md border transition-colors ${
                                    slot.available
                                      ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
                                      : 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                                  }`}
                                >
                                  {slot.start_time}
                                </button>
                              ))}
                            </div>
                          )}
                          {availabilityError && (
                            <p className="mt-2 text-sm text-red-600">{availabilityError}</p>
                          )}
                        </div>
                      )}

                      {/* Enhanced Customer Management */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-gray-900">Customer Information</h4>
                          {customerSearchLoading && (
                            <div className="flex items-center text-xs text-blue-600">
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-1"></div>
                              Finding customer...
                            </div>
                          )}
                        </div>
                        
                        {/* Customer Mode Toggle */}
                        <div className="flex items-center space-x-4">
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name="customer_mode"
                              value="new"
                              checked={customerMode === 'new'}
                              onChange={() => handleCustomerModeChange('new')}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                            />
                            <span className="ml-2 text-sm text-gray-700">New Customer</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name="customer_mode"
                              value="existing"
                              checked={customerMode === 'existing'}
                              onChange={() => handleCustomerModeChange('existing')}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                            />
                            <span className="ml-2 text-sm text-gray-700">Existing Customer</span>
                          </label>
                        </div>

                        {/* Existing Customer Display */}
                        {customerMode === 'existing' && selectedCustomer && (
                          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <UserIcon className="h-5 w-5 text-blue-600" />
                                  <span className="font-medium text-gray-900">{selectedCustomer.name}</span>
                                  {selectedCustomer.vip_status && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                      VIP
                                    </span>
                                  )}
                                </div>
                                <div className="space-y-1 text-sm text-gray-600">
                                  {selectedCustomer.phone && (
                                    <div className="flex items-center gap-1">
                                      <span>📱 {selectedCustomer.phone}</span>
                                    </div>
                                  )}
                                  {selectedCustomer.email && (
                                    <div className="flex items-center gap-1">
                                      <span>✉️ {selectedCustomer.email}</span>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-4 text-xs text-gray-500">
                                    <span>Last visit: {selectedCustomer.last_visit_display}</span>
                                    <span>{selectedCustomer.total_visits} visit{selectedCustomer.total_visits !== 1 ? 's' : ''}</span>
                                  </div>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => setShowCustomerSearch(true)}
                                className="ml-3 text-sm text-blue-600 hover:text-blue-700"
                              >
                                Change
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Existing Customer Search Button */}
                        {customerMode === 'existing' && !selectedCustomer && (
                          <button
                            type="button"
                            onClick={() => setShowCustomerSearch(true)}
                            className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg text-center hover:border-blue-500 hover:bg-blue-50 transition-colors"
                          >
                            <UserIcon className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                            <span className="text-sm text-gray-600">Click to search for existing customer</span>
                          </button>
                        )}

                        {/* New Customer Fields */}
                        {customerMode === 'new' && (
                          <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <label htmlFor="client_name" className="block text-sm font-medium text-gray-700">
                                  Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  id="client_name"
                                  name="client_name"
                                  value={formData.client_name}
                                  onChange={handleInputChange}
                                  onBlur={() => {
                                    // Quick lookup when user enters phone/email
                                    if (formData.client_phone || formData.client_email) {
                                      quickCustomerLookup(formData.client_phone, formData.client_email)
                                    }
                                  }}
                                  className={`mt-1 block w-full rounded-md shadow-sm ${
                                    fieldErrors.client_name 
                                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500 ring-red-500 ring-1' 
                                      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                                  } ${loading ? 'bg-gray-50' : ''}`}
                                  disabled={loading}
                                  required
                                />
                                {fieldErrors.client_name && (
                                  <p className="mt-1 text-sm text-red-600">{fieldErrors.client_name}</p>
                                )}
                              </div>
                              
                              <div>
                                <label htmlFor="client_phone" className="block text-sm font-medium text-gray-700">
                                  Phone <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="tel"
                                  id="client_phone"
                                  name="client_phone"
                                  value={formData.client_phone}
                                  onChange={handleInputChange}
                                  onBlur={() => {
                                    // Quick lookup when user enters phone
                                    if (formData.client_phone) {
                                      quickCustomerLookup(formData.client_phone, formData.client_email)
                                    }
                                  }}
                                  className={`mt-1 block w-full rounded-md shadow-sm ${
                                    fieldErrors.client_phone 
                                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500 ring-red-500 ring-1' 
                                      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                                  } ${loading ? 'bg-gray-50' : ''}`}
                                  disabled={loading}
                                  required
                                />
                                {fieldErrors.client_phone && (
                                  <p className="mt-1 text-sm text-red-600">{fieldErrors.client_phone}</p>
                                )}
                              </div>
                            </div>
                            
                            <div>
                              <label htmlFor="client_email" className="block text-sm font-medium text-gray-700">
                                Email
                              </label>
                              <input
                                type="email"
                                id="client_email"
                                name="client_email"
                                value={formData.client_email}
                                onChange={handleInputChange}
                                onBlur={() => {
                                  // Quick lookup when user enters email
                                  if (formData.client_email) {
                                    quickCustomerLookup(formData.client_phone, formData.client_email)
                                  }
                                }}
                                className={`mt-1 block w-full rounded-md shadow-sm ${
                                  fieldErrors.client_email 
                                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500 ring-red-500 ring-1' 
                                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                                } ${loading ? 'bg-gray-50' : ''}`}
                                disabled={loading}
                              />
                              {fieldErrors.client_email && (
                                <p className="mt-1 text-sm text-red-600">{fieldErrors.client_email}</p>
                              )}
                            </div>
                          </>
                        )}
                        
                        <div>
                          <label htmlFor="client_notes" className="block text-sm font-medium text-gray-700">
                            Notes
                          </label>
                          <textarea
                            id="client_notes"
                            name="client_notes"
                            value={formData.client_notes}
                            onChange={handleInputChange}
                            rows={3}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            placeholder="Any special requests or preferences..."
                          />
                        </div>

                        {/* Customer Notification Preferences */}
                        {(customerMode === 'new' || selectedCustomer) && (
                          <div className="pt-4 border-t border-gray-200">
                            <h5 className="text-sm font-medium text-gray-900 mb-3">Notify Customer</h5>
                            <div className="space-y-2">
                              <label className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={notificationPreferences.confirmations}
                                  onChange={(e) => setNotificationPreferences(prev => ({
                                    ...prev,
                                    confirmations: e.target.checked
                                  }))}
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <span className="ml-2 text-sm text-gray-700">Send booking confirmation</span>
                              </label>
                              
                              <label className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={notificationPreferences.reminders}
                                  onChange={(e) => setNotificationPreferences(prev => ({
                                    ...prev,
                                    reminders: e.target.checked
                                  }))}
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <span className="ml-2 text-sm text-gray-700">Send reminder (24h before)</span>
                              </label>
                              
                              {formData.client_phone && (
                                <label className="flex items-center ml-6">
                                  <input
                                    type="checkbox"
                                    checked={notificationPreferences.sms}
                                    onChange={(e) => setNotificationPreferences(prev => ({
                                      ...prev,
                                      sms: e.target.checked
                                    }))}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                  />
                                  <span className="ml-2 text-sm text-gray-600">📱 Text message (SMS)</span>
                                </label>
                              )}
                              
                              {formData.client_email && (
                                <label className="flex items-center ml-6">
                                  <input
                                    type="checkbox"
                                    checked={notificationPreferences.email}
                                    onChange={(e) => setNotificationPreferences(prev => ({
                                      ...prev,
                                      email: e.target.checked
                                    }))}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                  />
                                  <span className="ml-2 text-sm text-gray-600">✉️ Email notification</span>
                                </label>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Pricing */}
                      <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-gray-900">Pricing</h4>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <label htmlFor="service_price" className="block text-sm font-medium text-gray-700">
                              Service Price
                            </label>
                            <input
                              type="number"
                              id="service_price"
                              name="service_price"
                              value={formData.service_price}
                              onChange={handleInputChange}
                              min="0"
                              step="0.01"
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            />
                          </div>
                          
                          <div>
                            <label htmlFor="tip_amount" className="block text-sm font-medium text-gray-700">
                              Tip Amount
                            </label>
                            <input
                              type="number"
                              id="tip_amount"
                              name="tip_amount"
                              value={formData.tip_amount}
                              onChange={handleInputChange}
                              min="0"
                              step="0.01"
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700">
                              Total Amount
                            </label>
                            <div className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-900 font-medium">
                              ${(formData.service_price + (formData.tip_amount || 0)).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Recurring Appointments */}
                      <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-gray-900">Recurring Schedule</h4>
                        
                        {isEditing && editingAppointment?.recurrence_rule && (
                          <div className="mb-4 text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded-md p-3">
                            ℹ️ This appointment is already part of a recurring series. Converting will create a new series starting from this appointment.
                          </div>
                        )}
                        
                        {/* Conversion Confirmation */}
                        {showConversionConfirmation && formData.is_recurring && isEditing && (
                          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-start">
                              <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-green-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                              </div>
                              <div className="ml-3">
                                <h3 className="text-sm font-medium text-green-800">
                                  Converting to Recurring Appointment
                                </h3>
                                <div className="mt-2 text-sm text-green-700">
                                  <p>This will create appointments:</p>
                                  <ul className="list-disc list-inside mt-1">
                                    <li>Every {formData.recurrence_interval} {formData.recurrence_pattern === 'daily' ? 'day(s)' : formData.recurrence_pattern === 'weekly' ? 'week(s)' : 'month(s)'}</li>
                                    <li>On {new Date(formData.scheduled_at).toLocaleDateString('en-US', { weekday: 'long' })} at {new Date(formData.scheduled_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</li>
                                    <li>For {formData.recurrence_count} occurrences</li>
                                  </ul>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Conflict Detection Results */}
                        {conflicts && conflicts.has_conflicts && (
                          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                            <div className="flex items-start">
                              <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-amber-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                              </div>
                              <div className="ml-3 flex-1">
                                <h3 className="text-sm font-medium text-amber-800">
                                  {conflicts.conflicts_found} Scheduling Conflict{conflicts.conflicts_found !== 1 ? 's' : ''} Found
                                </h3>
                                <div className="mt-2 text-sm text-amber-700">
                                  <p className="mb-2">The following dates have conflicts:</p>
                                  <div className="max-h-32 overflow-y-auto space-y-1">
                                    {conflicts.conflicts.slice(0, 5).map((conflict, index) => (
                                      <div key={index} className="text-xs bg-amber-100 rounded px-2 py-1">
                                        {new Date(conflict.date).toLocaleDateString('en-US', { 
                                          month: 'short', 
                                          day: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })}
                                        {conflict.conflicting_appointments[0] && (
                                          <span className="text-amber-600"> - {conflict.conflicting_appointments[0].customer_name}</span>
                                        )}
                                      </div>
                                    ))}
                                    {conflicts.conflicts.length > 5 && (
                                      <div className="text-xs text-amber-600 italic">
                                        ... and {conflicts.conflicts.length - 5} more
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="mt-3">
                                  <label className="block text-sm font-medium text-amber-800 mb-2">
                                    How would you like to handle conflicts?
                                  </label>
                                  <select
                                    value={conflictResolution}
                                    onChange={(e) => setConflictResolution(e.target.value)}
                                    className="block w-full text-sm rounded-md border-amber-300 shadow-sm focus:border-amber-500 focus:ring-amber-500"
                                  >
                                    <option value="skip">Skip conflicting dates ({conflicts.available_slots} appointments will be created)</option>
                                    <option value="overwrite">Replace existing appointments (requires confirmation)</option>
                                    <option value="cancel">Don't convert to recurring</option>
                                  </select>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-center">
                          <input
                            id="is_recurring"
                            name="is_recurring"
                            type="checkbox"
                            checked={formData.is_recurring}
                            onChange={handleInputChange}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label htmlFor="is_recurring" className="ml-2 block text-sm text-gray-900">
                            {isEditing ? 'Convert to recurring appointment' : 'Make this a recurring appointment'}
                          </label>
                        </div>
                        
                        {formData.is_recurring && (
                          <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {/* Recurrence Pattern */}
                              <div>
                                <label htmlFor="recurrence_pattern" className="block text-sm font-medium text-gray-700">
                                  Repeat
                                </label>
                                <select
                                  id="recurrence_pattern"
                                  name="recurrence_pattern"
                                  value={formData.recurrence_pattern}
                                  onChange={handleInputChange}
                                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                >
                                  <option value="daily">Daily</option>
                                  <option value="weekly">Weekly</option>
                                  <option value="monthly">Monthly</option>
                                </select>
                              </div>
                              
                              {/* Recurrence Interval */}
                              <div>
                                <label htmlFor="recurrence_interval" className="block text-sm font-medium text-gray-700">
                                  Every
                                </label>
                                <div className="mt-1 flex items-center space-x-2">
                                  <input
                                    type="number"
                                    id="recurrence_interval"
                                    name="recurrence_interval"
                                    value={formData.recurrence_interval}
                                    onChange={handleInputChange}
                                    min="1"
                                    max="12"
                                    className="block w-20 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                  />
                                  <span className="text-sm text-gray-600">
                                    {formData.recurrence_pattern === 'daily' ? 'day(s)' :
                                     formData.recurrence_pattern === 'weekly' ? 'week(s)' : 'month(s)'}
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Days of week for weekly pattern */}
                            {formData.recurrence_pattern === 'weekly' && (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Repeat on
                                </label>
                                <div className="flex space-x-2">
                                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                                    <button
                                      key={day}
                                      type="button"
                                      onClick={() => {
                                        const newDays = formData.recurrence_days.includes(index)
                                          ? formData.recurrence_days.filter(d => d !== index)
                                          : [...formData.recurrence_days, index]
                                        setFormData(prev => ({ ...prev, recurrence_days: newDays }))
                                      }}
                                      className={`w-10 h-10 rounded-full text-xs font-medium transition-colors ${
                                        formData.recurrence_days.includes(index)
                                          ? 'bg-blue-600 text-white'
                                          : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                      }`}
                                    >
                                      {day.charAt(0)}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* End condition */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                End
                              </label>
                              <div className="space-y-2">
                                <div className="flex items-center">
                                  <input
                                    type="radio"
                                    id="recurrence_end_count"
                                    name="recurrence_end_type"
                                    value="count"
                                    checked={formData.recurrence_end_type === 'count'}
                                    onChange={handleInputChange}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                                  />
                                  <label htmlFor="recurrence_end_count" className="ml-2 text-sm text-gray-900">
                                    After
                                  </label>
                                  <input
                                    type="number"
                                    name="recurrence_count"
                                    value={formData.recurrence_count}
                                    onChange={handleInputChange}
                                    min="1"
                                    max="52"
                                    disabled={formData.recurrence_end_type !== 'count'}
                                    className="ml-2 w-16 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100"
                                  />
                                  <span className="ml-1 text-sm text-gray-600">appointments</span>
                                </div>
                                
                                <div className="flex items-center">
                                  <input
                                    type="radio"
                                    id="recurrence_end_date"
                                    name="recurrence_end_type"
                                    value="date"
                                    checked={formData.recurrence_end_type === 'date'}
                                    onChange={handleInputChange}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                                  />
                                  <label htmlFor="recurrence_end_date" className="ml-2 text-sm text-gray-900">
                                    On
                                  </label>
                                  <input
                                    type="date"
                                    name="recurrence_end_date"
                                    value={formData.recurrence_end_date}
                                    onChange={handleInputChange}
                                    disabled={formData.recurrence_end_type !== 'date'}
                                    className="ml-2 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100"
                                  />
                                </div>
                                
                                <div className="flex items-center">
                                  <input
                                    type="radio"
                                    id="recurrence_end_never"
                                    name="recurrence_end_type"
                                    value="never"
                                    checked={formData.recurrence_end_type === 'never'}
                                    onChange={handleInputChange}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                                  />
                                  <label htmlFor="recurrence_end_never" className="ml-2 text-sm text-gray-900">
                                    Never
                                  </label>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Options */}
                      <div className="space-y-3">
                        <div className="flex items-center">
                          <input
                            id="is_walk_in"
                            name="is_walk_in"
                            type="checkbox"
                            checked={formData.is_walk_in}
                            onChange={handleInputChange}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label htmlFor="is_walk_in" className="ml-2 block text-sm text-gray-900">
                            This is a walk-in appointment
                          </label>
                        </div>
                        
                        <div>
                          <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
                            Priority
                          </label>
                          <select
                            id="priority"
                            name="priority"
                            value={formData.priority}
                            onChange={handleInputChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          >
                            <option value={0}>Normal</option>
                            <option value={1}>High</option>
                            <option value={2}>Urgent</option>
                          </select>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="mt-6 flex flex-col sm:flex-row sm:justify-between gap-3">
                        {/* Cancel/Uncancel/Delete buttons (left side) - only show when editing */}
                        {isEditing && (
                          <div className="flex flex-col sm:flex-row gap-2">
                            {/* Show different first button based on appointment status */}
                            {editingAppointment?.extendedProps?.status === 'cancelled' ? (
                              // Restore button for cancelled appointments
                              <button
                                type="button"
                                onClick={() => {
                                  setActionType('uncancel')
                                  setShowDeleteConfirmation(true)
                                }}
                                className="inline-flex items-center justify-center rounded-lg border-2 border-green-600 bg-white px-4 py-2 text-sm font-medium text-green-600 shadow-sm hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                              >
                                <CheckIcon className="h-5 w-5 mr-2" />
                                Restore
                              </button>
                            ) : (
                              // Cancel button for active appointments
                              <button
                                type="button"
                                onClick={() => {
                                  setActionType('cancel')
                                  setShowDeleteConfirmation(true)
                                }}
                                className="inline-flex items-center justify-center rounded-lg border-2 border-orange-600 bg-white px-4 py-2 text-sm font-medium text-orange-600 shadow-sm hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                              >
                                <XMarkIcon className="h-5 w-5 mr-2" />
                                Cancel
                              </button>
                            )}
                            
                            {/* Delete button - always show for both active and cancelled appointments */}
                            <button
                              type="button"
                              onClick={() => {
                                setActionType('delete')
                                setShowDeleteConfirmation(true)
                              }}
                              className="inline-flex items-center justify-center rounded-lg border-2 border-red-600 bg-white px-4 py-2 text-sm font-medium text-red-600 shadow-sm hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                            >
                              <TrashIcon className="h-5 w-5 mr-2" />
                              Delete
                            </button>
                          </div>
                        )}
                        
                        {/* Right side buttons */}
                        <div className="flex flex-col sm:flex-row gap-2">
                          <button
                            type="button"
                            onClick={onClose}
                            className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                          disabled={loading || checkingAvailability || (conflicts && conflicts.has_conflicts && conflictResolution === 'cancel')}
                          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {loading ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              {isEditing ? 'Updating...' : 'Booking...'}
                            </>
                          ) : (
                            <>
                              {showConversionConfirmation && formData.is_recurring && isEditing && (
                                <svg className="h-4 w-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                              )}
                              {isEditing ? (
                                showConversionConfirmation && formData.is_recurring ? 'Convert to Recurring' : 'Update Appointment'
                              ) : 'Book Appointment'}
                            </>
                          )}
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>
                </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
    
    {/* Delete Confirmation Dialog */}
    {showDeleteConfirmation && (
      <Transition.Root show={showDeleteConfirmation} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={() => setShowDeleteConfirmation(false)}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <ExclamationTriangleIcon className="h-6 w-6 text-red-600" aria-hidden="true" />
                  </div>
                  <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                    <Dialog.Title as="h3" className="text-base font-semibold leading-6 text-gray-900">
                      {actionType === 'cancel' ? 'Cancel Appointment' : actionType === 'uncancel' ? 'Uncancel Appointment' : 'Delete Appointment'}
                    </Dialog.Title>
                    <div className="mt-2">
                      {editingAppointment?.isRecurring || editingAppointment?.extendedProps?.isRecurring ? (
                        <div className="space-y-3">
                          <p className="text-sm text-gray-500">
                            This is a recurring appointment. How would you like to delete it?
                          </p>
                          <div className="space-y-2">
                            <div className="flex items-center">
                              <input
                                id="delete-single"
                                type="radio"
                                value="single"
                                checked={deleteOption === 'single'}
                                onChange={(e) => setDeleteOption(e.target.value)}
                                className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300"
                              />
                              <label htmlFor="delete-single" className="ml-2 block text-sm text-gray-700">
                                Delete only this occurrence
                              </label>
                            </div>
                            <div className="flex items-center">
                              <input
                                id="delete-all"
                                type="radio"
                                value="all"
                                checked={deleteOption === 'all'}
                                onChange={(e) => setDeleteOption(e.target.value)}
                                className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300"
                              />
                              <label htmlFor="delete-all" className="ml-2 block text-sm text-gray-700">
                                Delete all occurrences (entire series)
                              </label>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">
                          {actionType === 'cancel' ? (
                            <div className="space-y-2">
                              <p>
                                Are you sure you want to <strong>cancel</strong> this appointment?
                              </p>
                              <p>
                                • The appointment will be marked as cancelled
                              </p>
                              <p>
                                • It will appear as a red block in the calendar
                              </p>
                              <p>
                                • It will remain in your appointment history
                              </p>
                            </div>
                          ) : actionType === 'uncancel' ? (
                            <div className="space-y-2">
                              <p>
                                Are you sure you want to <strong>uncancel</strong> this appointment?
                              </p>
                              <p>
                                • The appointment will be reactivated
                              </p>
                              <p>
                                • It will return to its normal color in the calendar
                              </p>
                              <p>
                                • It will be restored to confirmed status
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <p>
                                Are you sure you want to <strong>permanently delete</strong> this appointment?
                              </p>
                              <p>
                                • The appointment will be completely removed
                              </p>
                              <p>
                                • It will disappear from the calendar
                              </p>
                              <p>
                                • It will be removed from your appointment history
                              </p>
                              <p className="text-red-600 font-semibold">
                                • This action cannot be undone
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    disabled={deletingAppointment}
                    onClick={
                      actionType === 'cancel' ? handleCancel : 
                      actionType === 'uncancel' ? handleUncancel : 
                      handleDelete
                    }
                    className={`inline-flex w-full justify-center rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm sm:ml-3 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed ${
                      actionType === 'cancel' 
                        ? 'bg-orange-600 hover:bg-orange-500' 
                        : actionType === 'uncancel'
                        ? 'bg-green-600 hover:bg-green-500'
                        : 'bg-red-600 hover:bg-red-500'
                    }`}
                  >
                    {deletingAppointment ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        {actionType === 'cancel' ? 'Cancelling...' : actionType === 'uncancel' ? 'Uncancelling...' : 'Deleting...'}
                      </>
                    ) : (
                      actionType === 'cancel' ? 'Cancel Appointment' : actionType === 'uncancel' ? 'Uncancel Appointment' : 'Delete Permanently'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirmation(false)}
                    className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                  >
                    Cancel
                  </button>
                </div>
                {error && (
                  <div className="mt-4 rounded-md bg-red-50 p-3">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
    )}

    {/* Customer Search Modal */}
    <CustomerSearchModal
      isOpen={showCustomerSearch}
      onClose={() => setShowCustomerSearch(false)}
      onSelectCustomer={handleSelectCustomer}
      onCreateNewCustomer={handleCreateNewCustomer}
      barbershopId={barbershopId}
    />
    </>
  )
}