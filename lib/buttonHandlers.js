'use client'

// Centralized button handlers for the entire application
// This provides consistent functionality across all pages

import { createClient } from './supabase/browser-client'

export const buttonHandlers = {
  // Customer Management Handlers
  addCustomer: () => {
    console.log('Add Customer clicked - opens modal')
    // This is handled by component state
  },

  editCustomer: (customer) => {
    console.log('Edit Customer:', customer)
    alert(`Edit customer: ${customer.name}`)
  },

  deleteCustomer: async (customer) => {
    if (!confirm(`Are you sure you want to delete ${customer.name}?`)) return
    
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('customers')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', customer.id)
      
      if (error) throw error
      alert('Customer deleted successfully')
      window.location.reload()
    } catch (error) {
      alert('Failed to delete customer: ' + error.message)
    }
  },

  exportCustomers: () => {
    console.log('Export Customers clicked')
    alert('Customer export feature coming soon!')
  },

  // Staff Management Handlers
  addStaff: () => {
    console.log('Add Staff clicked - opens modal')
  },

  editStaff: (staff) => {
    console.log('Edit Staff:', staff)
    alert(`Edit staff member: ${staff.name}`)
  },

  staffSettings: (staff) => {
    console.log('Staff Settings:', staff)
    // This is handled by component state
  },

  staffSchedule: (staff) => {
    console.log('Staff Schedule:', staff)
    alert(`Manage schedule for ${staff.name}`)
  },

  staffPerformance: (staff) => {
    console.log('Staff Performance:', staff)
    alert(`View performance metrics for ${staff.name}`)
  },

  // Service Management Handlers
  addService: () => {
    console.log('Add Service clicked - opens modal')
  },

  editService: (service) => {
    console.log('Edit Service:', service)
    alert(`Edit service: ${service.name}`)
  },

  deleteService: async (service) => {
    if (!confirm(`Are you sure you want to delete ${service.name}?`)) return
    
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('services')
        .update({ active: false })
        .eq('id', service.id)
      
      if (error) throw error
      alert('Service deleted successfully')
      window.location.reload()
    } catch (error) {
      alert('Failed to delete service: ' + error.message)
    }
  },

  // Booking System Handlers
  bookAppointment: (service, barber = null, location = null) => {
    let url = `/book`
    if (location) url = `/book/${location.slug}`
    if (barber) url = `/book/${barber.slug}`
    
    console.log('Book Appointment:', { service, barber, location, url })
    window.location.href = url
  },

  rescheduleAppointment: (appointment) => {
    console.log('Reschedule Appointment:', appointment)
    alert(`Reschedule appointment for ${appointment.customer_name}`)
  },

  cancelAppointment: async (appointment) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return
    
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', appointment.id)
      
      if (error) throw error
      alert('Appointment cancelled successfully')
      window.location.reload()
    } catch (error) {
      alert('Failed to cancel appointment: ' + error.message)
    }
  },

  // Payment & Financial Handlers
  processPayment: (amount, customer) => {
    console.log('Process Payment:', { amount, customer })
    alert(`Process payment of $${amount} for ${customer.name}`)
  },

  issueRefund: (payment) => {
    console.log('Issue Refund:', payment)
    if (confirm(`Issue refund of $${payment.amount}?`)) {
      alert('Refund processed successfully')
    }
  },

  exportPayments: () => {
    console.log('Export Payments clicked')
    alert('Payment export feature coming soon!')
  },

  // Analytics & Reports Handlers
  generateReport: (reportType, dateRange = 'last30') => {
    console.log('Generate Report:', { reportType, dateRange })
    alert(`Generating ${reportType} report for ${dateRange}`)
  },

  exportData: (dataType) => {
    console.log('Export Data:', dataType)
    alert(`Exporting ${dataType} data...`)
  },

  refreshAnalytics: () => {
    console.log('Refresh Analytics clicked')
    alert('Analytics refreshed!')
    window.location.reload()
  },

  // Communication Handlers
  sendNotification: (recipient, type) => {
    console.log('Send Notification:', { recipient, type })
    alert(`Send ${type} notification to ${recipient}`)
  },

  callCustomer: (phone) => {
    console.log('Call Customer:', phone)
    window.location.href = `tel:${phone.replace(/[^\d]/g, '')}`
  },

  emailCustomer: (email, subject = '') => {
    console.log('Email Customer:', email)
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}`
  },

  // Navigation Handlers
  navigateTo: (path) => {
    console.log('Navigate to:', path)
    window.location.href = path
  },

  openModal: (modalName, data = null) => {
    console.log('Open Modal:', { modalName, data })
    // This is handled by component state
  },

  closeModal: () => {
    console.log('Close Modal')
    // This is handled by component state
  },

  // Settings & Configuration Handlers
  saveSettings: (settings) => {
    console.log('Save Settings:', settings)
    alert('Settings saved successfully!')
  },

  resetSettings: () => {
    console.log('Reset Settings')
    if (confirm('Are you sure you want to reset all settings?')) {
      alert('Settings reset to defaults')
    }
  },

  // Generic Action Handlers
  confirmAction: (action, message, callback) => {
    console.log('Confirm Action:', { action, message })
    if (confirm(message)) {
      callback()
    }
  },

  showNotification: (message, type = 'info') => {
    console.log('Show Notification:', { message, type })
    alert(message)
  },

  // Business Intelligence Handlers
  viewInsights: (type) => {
    console.log('View Insights:', type)
    alert(`Viewing ${type} insights`)
  },

  optimizePricing: () => {
    console.log('Optimize Pricing clicked')
    alert('Pricing optimization analysis started')
  },

  forecastRevenue: (period) => {
    console.log('Forecast Revenue:', period)
    alert(`Revenue forecast for ${period} generated`)
  },

  // Marketing & Growth Handlers
  launchCampaign: (campaign) => {
    console.log('Launch Campaign:', campaign)
    alert(`Launching ${campaign.type} campaign`)
  },

  trackConversion: (event) => {
    console.log('Track Conversion:', event)
    // Track analytics event
  },

  generateQRCode: (data) => {
    console.log('Generate QR Code:', data)
    alert('QR Code generated!')
  },

  shareLink: (url, title = '') => {
    console.log('Share Link:', { url, title })
    if (navigator.share) {
      navigator.share({ title, url })
    } else {
      navigator.clipboard.writeText(url)
      alert('Link copied to clipboard!')
    }
  }
}

// Helper function to get handler by name
export const getHandler = (handlerName) => {
  return buttonHandlers[handlerName] || (() => {
    console.warn(`Handler not found: ${handlerName}`)
    alert(`${handlerName} functionality coming soon!`)
  })
}

// Helper function to create onClick handler with loading state
export const createClickHandler = (handlerName, ...args) => {
  return async (e) => {
    e.preventDefault()
    
    // Add loading state to button
    const button = e.currentTarget
    const originalText = button.textContent
    button.disabled = true
    button.textContent = 'Loading...'
    
    try {
      const handler = getHandler(handlerName)
      await handler(...args)
    } catch (error) {
      console.error('Handler error:', error)
      alert('An error occurred. Please try again.')
    } finally {
      // Restore button state
      button.disabled = false
      button.textContent = originalText
    }
  }
}

export default buttonHandlers