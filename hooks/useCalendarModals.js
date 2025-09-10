'use client'

import { useState, useCallback } from 'react'

/**
 * Custom hook to manage all calendar modal states and actions
 * Extracts modal state management from the main calendar page
 */
export function useCalendarModals() {
  // Modal states
  const [showQRModal, setShowQRModal] = useState(false)
  const [showAppointmentModal, setShowAppointmentModal] = useState(false)
  const [showRescheduleModal, setShowRescheduleModal] = useState(false)
  const [showBookingConfirmation, setShowBookingConfirmation] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [showDiagnostics, setShowDiagnostics] = useState(false)

  // Related states for modals
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [pendingReschedule, setPendingReschedule] = useState(null)
  const [confirmedAppointment, setConfirmedAppointment] = useState(null)
  const [appointmentToCancel, setAppointmentToCancel] = useState(null)
  const [cancelling, setCancelling] = useState(false)
  
  // QR and sharing related states
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [copied, setCopied] = useState({})
  const [shareDropdownOpen, setShareDropdownOpen] = useState(false)

  // Modal actions
  const openQRModal = useCallback((url) => {
    setQrCodeUrl(url)
    setShowQRModal(true)
  }, [])

  const closeQRModal = useCallback(() => {
    setShowQRModal(false)
    setQrCodeUrl('')
  }, [])

  const openAppointmentModal = useCallback((slot) => {
    setSelectedSlot(slot)
    setShowAppointmentModal(true)
  }, [])

  const closeAppointmentModal = useCallback(() => {
    setShowAppointmentModal(false)
    setSelectedSlot(null)
  }, [])

  const openRescheduleModal = useCallback((event, newSlot = null) => {
    setSelectedEvent(event)
    setPendingReschedule(newSlot)
    setShowRescheduleModal(true)
  }, [])

  const closeRescheduleModal = useCallback(() => {
    setShowRescheduleModal(false)
    setSelectedEvent(null)
    setPendingReschedule(null)
  }, [])

  const openBookingConfirmation = useCallback((appointment) => {
    setConfirmedAppointment(appointment)
    setShowBookingConfirmation(true)
  }, [])

  const closeBookingConfirmation = useCallback(() => {
    setShowBookingConfirmation(false)
    setConfirmedAppointment(null)
  }, [])

  const openCancelModal = useCallback((appointment) => {
    setAppointmentToCancel(appointment)
    setShowCancelModal(true)
  }, [])

  const closeCancelModal = useCallback(() => {
    setShowCancelModal(false)
    setAppointmentToCancel(null)
    setCancelling(false)
  }, [])

  const toggleDiagnostics = useCallback(() => {
    setShowDiagnostics(prev => !prev)
  }, [])

  const toggleShareDropdown = useCallback(() => {
    setShareDropdownOpen(prev => !prev)
  }, [])

  const closeShareDropdown = useCallback(() => {
    setShareDropdownOpen(false)
  }, [])

  const setCopyStatus = useCallback((key, status) => {
    setCopied(prev => ({ ...prev, [key]: status }))
    if (status) {
      setTimeout(() => {
        setCopied(prev => ({ ...prev, [key]: false }))
      }, 2000)
    }
  }, [])

  // Close all modals utility
  const closeAllModals = useCallback(() => {
    setShowQRModal(false)
    setShowAppointmentModal(false)
    setShowRescheduleModal(false)
    setShowBookingConfirmation(false)
    setShowCancelModal(false)
    setShowDiagnostics(false)
    setShareDropdownOpen(false)
    
    // Reset related states
    setSelectedSlot(null)
    setSelectedEvent(null)
    setPendingReschedule(null)
    setConfirmedAppointment(null)
    setAppointmentToCancel(null)
    setCancelling(false)
    setQrCodeUrl('')
    setCopied({})
  }, [])

  return {
    // Modal states
    showQRModal,
    showAppointmentModal,
    showRescheduleModal,
    showBookingConfirmation,
    showCancelModal,
    showDiagnostics,
    
    // Related states
    selectedSlot,
    selectedEvent,
    pendingReschedule,
    confirmedAppointment,
    appointmentToCancel,
    cancelling,
    
    // QR and sharing states
    qrCodeUrl,
    copied,
    shareDropdownOpen,
    
    // Modal actions
    openQRModal,
    closeQRModal,
    openAppointmentModal,
    closeAppointmentModal,
    openRescheduleModal,
    closeRescheduleModal,
    openBookingConfirmation,
    closeBookingConfirmation,
    openCancelModal,
    closeCancelModal,
    toggleDiagnostics,
    toggleShareDropdown,
    closeShareDropdown,
    setCopyStatus,
    closeAllModals,
    
    // State setters (for direct access when needed)
    setCancelling,
    setPendingReschedule,
    setSelectedEvent,
    setSelectedSlot,
  }
}

export default useCalendarModals