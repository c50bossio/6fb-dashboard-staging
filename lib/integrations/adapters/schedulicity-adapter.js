/**
 * Schedulicity Data Adapter
 * 
 * Handles data transformation from Schedulicity CSV exports to universal schema.
 * Schedulicity is popular with salons and spas, focusing on simplicity.
 * 
 * Export Format Notes:
 * - Clients export: "Client Name", "Email", "Phone", "Birthday", etc.
 * - Appointments export: "Date", "Time", "Service", "Client Name", "Duration"
 * - Services export: "Service Name", "Duration", "Price", "Category"
 * - Limited custom fields support
 * - Exports typically don't include future appointments
 */

export class SchedulicityAdapter {
  constructor() {
    this.platform = 'schedulicity'
    this.version = '1.0.0'
  }

  /**
   * Get platform configuration
   */
  static getConfig() {
    return {
      platform: 'schedulicity',
      displayName: 'Schedulicity',
      supportedEntities: ['customers', 'appointments', 'services'],
      limitations: [
        'Must export each provider individually',
        'Limited future appointment data',
        'Custom fields support is minimal'
      ],
      exportInstructions: [
        'Go to My Business > Reports',
        'Export Schedule by Provider',
        'Export each barber separately',
        'Download client lists separately',
        'Upload all files here'
      ],
      expectedFileSize: '2-5MB per barber',
      estimatedTime: '15-30 minutes'
    }
  }

  /**
   * Identify if a CSV file is from Schedulicity
   */
  static identify(headers, metadata = {}) {
    const schedulicityFields = [
      'Client Name', 'Email', 'Phone', 'Birthday',
      'Date', 'Time', 'Service', 'Duration', 'Provider'
    ]
    
    const headerStr = headers.join(',').toLowerCase()
    const matchCount = schedulicityFields.filter(field => 
      headerStr.includes(field.toLowerCase())
    ).length
    
    return matchCount >= 5 // At least 5 Schedulicity-specific fields
  }

  /**
   * Detect entity type from CSV headers
   */
  detectEntityType(headers) {
    const headerStr = headers.join(',').toLowerCase()
    
    // Check for specific Schedulicity column patterns
    if (headerStr.includes('client name') && headerStr.includes('birthday')) {
      return 'customers'
    }
    if (headerStr.includes('service') && headerStr.includes('appointment') && headerStr.includes('date')) {
      return 'appointments'
    }
    if (headerStr.includes('service name') && headerStr.includes('duration') && headerStr.includes('price')) {
      return 'services'
    }
    
    // Fallback detection
    if (headerStr.includes('client') || headerStr.includes('customer')) {
      return 'customers'
    }
    if (headerStr.includes('appointment') || headerStr.includes('booking')) {
      return 'appointments'
    }
    if (headerStr.includes('service') || headerStr.includes('treatment')) {
      return 'services'
    }
    
    return 'unknown'
  }

  /**
   * Transform Schedulicity customers data
   */
  transformCustomers(data) {
    const transformed = []
    const errors = []
    const warnings = []
    
    data.forEach((row, index) => {
      try {
        // Handle various Schedulicity field variations
        const customer = {
          // Name handling (Schedulicity uses "Client Name")
          name: row['Client Name'] || row['Name'] || row['Full Name'] || '',
          
          // Contact info
          email: this.normalizeEmail(row['Email'] || row['Email Address'] || ''),
          phone: this.normalizePhone(row['Phone'] || row['Mobile'] || row['Cell Phone'] || ''),
          
          // Address (Schedulicity may split or combine)
          address: this.buildAddress(row),
          
          // Birthday/DOB
          birthdate: this.parseDate(row['Birthday'] || row['Birth Date'] || row['DOB']),
          
          // Additional fields
          notes: row['Notes'] || row['Comments'] || '',
          
          // Tags from various sources
          tags: this.extractTags(row),
          
          // Schedulicity-specific fields
          custom_fields: {
            preferred_staff: row['Preferred Staff'] || row['Preferred Provider'] || null,
            referral_source: row['How Heard'] || row['Referral'] || null,
            client_since: this.parseDate(row['Client Since'] || row['First Visit']),
            last_visit: this.parseDate(row['Last Visit'] || row['Last Appointment']),
            total_visits: parseInt(row['Total Visits'] || row['Visit Count'] || '0'),
            total_spent: parseFloat(row['Total Spent'] || row['Revenue'] || '0'),
            membership_type: row['Membership'] || row['Plan'] || null,
            allows_marketing: this.parseBoolean(row['Marketing Emails'] || row['Email Opt In']),
            allows_sms: this.parseBoolean(row['Text Messages'] || row['SMS Opt In']),
            emergency_contact: row['Emergency Contact'] || null,
            allergies: row['Allergies'] || row['Sensitivities'] || null,
            medical_notes: row['Medical Notes'] || row['Health Notes'] || null
          },
          
          // Import metadata
          import_id: row['Client ID'] || row['ID'] || null,
          created_at: this.parseDate(row['Created'] || row['Added']) || new Date().toISOString()
        }
        
        // Validate required fields
        if (!customer.name || customer.name.trim() === '') {
          errors.push({
            row: index + 2,
            field: 'name',
            message: 'Customer name is required',
            value: row['Client Name']
          })
          return
        }
        
        // Add warnings for important missing data
        if (!customer.email && !customer.phone) {
          warnings.push({
            row: index + 2,
            message: 'No contact information (email or phone) for customer',
            customer: customer.name
          })
        }
        
        // Warn about high-value customers
        if (customer.custom_fields.total_spent > 1000) {
          warnings.push({
            row: index + 2,
            message: `High-value customer: $${customer.custom_fields.total_spent} lifetime value`,
            customer: customer.name
          })
        }
        
        transformed.push(customer)
      } catch (error) {
        errors.push({
          row: index + 2,
          message: error.message,
          data: row
        })
      }
    })
    
    return { transformed, errors, warnings }
  }

  /**
   * Transform Schedulicity appointments data
   */
  transformAppointments(data) {
    const transformed = []
    const errors = []
    const warnings = []
    const needsResolution = {
      customers: new Set(),
      services: new Set(),
      staff: new Set()
    }
    
    data.forEach((row, index) => {
      try {
        // Parse date and time
        const appointmentDate = this.parseDate(row['Date'] || row['Appointment Date'])
        const appointmentTime = row['Time'] || row['Start Time'] || ''
        
        if (!appointmentDate) {
          errors.push({
            row: index + 2,
            field: 'date',
            message: 'Invalid or missing appointment date'
          })
          return
        }
        
        const appointment = {
          // Date and time
          date: appointmentDate,
          time: this.normalizeTime(appointmentTime),
          datetime: this.combineDatetime(appointmentDate, appointmentTime),
          
          // Duration (Schedulicity uses minutes)
          duration: parseInt(row['Duration'] || row['Length'] || '60'),
          
          // Service info
          service_name: row['Service'] || row['Treatment'] || '',
          service_id: null, // Will need resolution
          
          // Customer info
          customer_name: row['Client Name'] || row['Client'] || '',
          customer_email: this.normalizeEmail(row['Client Email'] || ''),
          customer_phone: this.normalizePhone(row['Client Phone'] || ''),
          customer_id: null, // Will need resolution
          
          // Staff/provider
          staff_name: row['Staff'] || row['Provider'] || row['Technician'] || '',
          staff_id: null, // Will need resolution
          
          // Status (Schedulicity statuses)
          status: this.mapStatus(row['Status'] || row['Appointment Status'] || 'Completed'),
          
          // Financial
          price: parseFloat(row['Price'] || row['Amount'] || '0'),
          paid: this.parseBoolean(row['Paid'] || row['Payment Status']),
          tip: parseFloat(row['Tip'] || row['Gratuity'] || '0'),
          
          // Notes
          notes: row['Notes'] || row['Comments'] || '',
          
          // Schedulicity-specific
          custom_fields: {
            confirmation_sent: this.parseBoolean(row['Confirmed']),
            reminder_sent: this.parseBoolean(row['Reminder Sent']),
            checked_in: this.parseBoolean(row['Checked In']),
            checkout_time: row['Checkout Time'] || null,
            room: row['Room'] || row['Station'] || null,
            booking_source: row['Booked Via'] || row['Source'] || 'schedulicity',
            package_name: row['Package'] || null,
            membership_applied: this.parseBoolean(row['Membership Applied']),
            forms_completed: this.parseBoolean(row['Forms Complete']),
            color_service: row['Color Formula'] || null
          },
          
          // Import metadata
          import_id: row['Appointment ID'] || row['ID'] || null,
          created_at: this.parseDate(row['Booked On'] || row['Created']) || new Date().toISOString()
        }
        
        // Track entities that need resolution
        if (appointment.customer_name && !appointment.customer_id) {
          needsResolution.customers.add(appointment.customer_name)
        }
        if (appointment.service_name && !appointment.service_id) {
          needsResolution.services.add(appointment.service_name)
        }
        if (appointment.staff_name && !appointment.staff_id) {
          needsResolution.staff.add(appointment.staff_name)
        }
        
        // Add warnings for missing associations
        if (!appointment.customer_name) {
          warnings.push({
            row: index + 2,
            message: 'Appointment has no customer associated'
          })
        }
        
        // Warn about no-shows
        if (appointment.status === 'no_show') {
          warnings.push({
            row: index + 2,
            message: `No-show appointment for ${appointment.customer_name}`,
            date: appointment.date
          })
        }
        
        transformed.push(appointment)
      } catch (error) {
        errors.push({
          row: index + 2,
          message: error.message,
          data: row
        })
      }
    })
    
    // Add resolution requirements to warnings
    if (needsResolution.customers.size > 0) {
      warnings.push({
        type: 'resolution_needed',
        entity: 'customers',
        count: needsResolution.customers.size,
        message: `${needsResolution.customers.size} customer names need to be matched to customer records`
      })
    }
    
    return { transformed, errors, warnings, needsResolution }
  }

  /**
   * Transform Schedulicity services data
   */
  transformServices(data) {
    const transformed = []
    const errors = []
    const warnings = []
    
    data.forEach((row, index) => {
      try {
        const service = {
          // Basic info
          name: row['Service Name'] || row['Service'] || row['Treatment'] || '',
          description: row['Description'] || row['Details'] || '',
          
          // Duration (convert to minutes if needed)
          duration: this.parseDuration(row['Duration'] || row['Length'] || '60'),
          
          // Pricing
          price: parseFloat(row['Price'] || row['Cost'] || '0'),
          
          // Category
          category: row['Category'] || row['Type'] || row['Service Category'] || 'General',
          
          // Schedulicity-specific fields
          custom_fields: {
            buffer_time: parseInt(row['Buffer Time'] || row['Cleanup Time'] || '0'),
            requires_patch_test: this.parseBoolean(row['Patch Test Required']),
            commission_rate: parseFloat(row['Commission'] || row['Commission Rate'] || '0'),
            taxable: this.parseBoolean(row['Taxable'] !== 'false'),
            active: this.parseBoolean(row['Active'] !== 'false'),
            online_booking: this.parseBoolean(row['Online Booking'] !== 'false'),
            max_per_day: parseInt(row['Max Per Day'] || '0'),
            prep_time: parseInt(row['Prep Time'] || '0'),
            processing_time: parseInt(row['Processing Time'] || '0'),
            equipment_needed: row['Equipment'] || null,
            products_used: row['Products'] || null,
            staff_qualified: row['Qualified Staff'] || null,
            membership_discount: parseFloat(row['Member Discount'] || '0'),
            addon_services: row['Add-ons'] || null,
            contraindications: row['Contraindications'] || null
          },
          
          // Import metadata
          import_id: row['Service ID'] || row['ID'] || null,
          created_at: new Date().toISOString(),
          active: row['Active'] !== 'false' && row['Status'] !== 'Inactive'
        }
        
        // Validate required fields
        if (!service.name || service.name.trim() === '') {
          errors.push({
            row: index + 2,
            field: 'name',
            message: 'Service name is required'
          })
          return
        }
        
        // Add warnings for unusual configurations
        if (service.duration > 480) { // More than 8 hours
          warnings.push({
            row: index + 2,
            message: `Unusually long service duration: ${service.duration} minutes`,
            service: service.name
          })
        }
        
        if (service.price === 0) {
          warnings.push({
            row: index + 2,
            message: `Service has no price set`,
            service: service.name
          })
        }
        
        transformed.push(service)
      } catch (error) {
        errors.push({
          row: index + 2,
          message: error.message,
          data: row
        })
      }
    })
    
    return { transformed, errors, warnings }
  }

  /**
   * Helper method to build address from Schedulicity fields
   */
  buildAddress(row) {
    const parts = []
    
    if (row['Address'] || row['Street Address']) {
      parts.push(row['Address'] || row['Street Address'])
    } else if (row['Address 1']) {
      parts.push(row['Address 1'])
      if (row['Address 2']) parts.push(row['Address 2'])
    }
    
    const cityStateZip = []
    if (row['City']) cityStateZip.push(row['City'])
    if (row['State']) cityStateZip.push(row['State'])
    if (row['Zip'] || row['Postal Code']) cityStateZip.push(row['Zip'] || row['Postal Code'])
    
    if (cityStateZip.length > 0) {
      parts.push(cityStateZip.join(', '))
    }
    
    return parts.join(', ') || null
  }

  /**
   * Extract tags from various Schedulicity fields
   */
  extractTags(row) {
    const tags = []
    
    // Add membership as tag
    if (row['Membership'] && row['Membership'] !== 'None') {
      tags.push(`member:${row['Membership'].toLowerCase()}`)
    }
    
    // Add preferred staff as tag
    if (row['Preferred Staff']) {
      tags.push(`prefers:${row['Preferred Staff'].toLowerCase()}`)
    }
    
    // Add VIP status
    if (row['VIP'] === 'Yes' || row['VIP'] === 'true') {
      tags.push('vip')
    }
    
    // Add referral source as tag
    if (row['How Heard'] && row['How Heard'] !== 'Unknown') {
      tags.push(`source:${row['How Heard'].toLowerCase()}`)
    }
    
    // Parse any existing tags
    if (row['Tags']) {
      const existingTags = row['Tags'].split(/[,;]/).map(t => t.trim()).filter(t => t)
      tags.push(...existingTags)
    }
    
    return tags.length > 0 ? tags : null
  }

  /**
   * Map Schedulicity status to universal status
   */
  mapStatus(schedulicityStatus) {
    const status = schedulicityStatus.toLowerCase()
    
    const statusMap = {
      'completed': 'completed',
      'confirmed': 'confirmed',
      'pending': 'pending',
      'cancelled': 'cancelled',
      'no show': 'no_show',
      'no-show': 'no_show',
      'rescheduled': 'rescheduled',
      'in progress': 'in_progress',
      'checked in': 'confirmed',
      'checked out': 'completed'
    }
    
    return statusMap[status] || 'pending'
  }

  /**
   * Parse duration from Schedulicity format (might be "1h 30m" or "90" or "90 minutes")
   */
  parseDuration(duration) {
    if (!duration) return 60
    
    // If it's already a number, assume minutes
    const num = parseInt(duration)
    if (!isNaN(num)) return num
    
    // Parse "1h 30m" format
    let totalMinutes = 0
    const hours = duration.match(/(\d+)\s*h/i)
    const minutes = duration.match(/(\d+)\s*m/i)
    
    if (hours) totalMinutes += parseInt(hours[1]) * 60
    if (minutes) totalMinutes += parseInt(minutes[1])
    
    return totalMinutes || 60
  }

  /**
   * Normalize email
   */
  normalizeEmail(email) {
    if (!email) return null
    return email.toLowerCase().trim()
  }

  /**
   * Normalize phone to E.164 format
   */
  normalizePhone(phone) {
    if (!phone) return null
    
    // Remove all non-numeric characters
    const cleaned = phone.replace(/\D/g, '')
    
    // Handle US numbers
    if (cleaned.length === 10) {
      return `+1${cleaned}`
    } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+${cleaned}`
    }
    
    // Return cleaned number for other formats
    return cleaned || null
  }

  /**
   * Parse date from various formats
   */
  parseDate(dateStr) {
    if (!dateStr) return null
    
    // Try various date formats
    const date = new Date(dateStr)
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0]
    }
    
    // Try MM/DD/YYYY format
    const mdy = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
    if (mdy) {
      return `${mdy[3]}-${mdy[1].padStart(2, '0')}-${mdy[2].padStart(2, '0')}`
    }
    
    return null
  }

  /**
   * Normalize time to HH:MM format
   */
  normalizeTime(timeStr) {
    if (!timeStr) return '00:00'
    
    // Remove AM/PM and convert to 24h
    const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i)
    if (match) {
      let hours = parseInt(match[1])
      const minutes = match[2]
      const period = match[3]
      
      if (period) {
        if (period.toUpperCase() === 'PM' && hours !== 12) {
          hours += 12
        } else if (period.toUpperCase() === 'AM' && hours === 12) {
          hours = 0
        }
      }
      
      return `${hours.toString().padStart(2, '0')}:${minutes}`
    }
    
    return '00:00'
  }

  /**
   * Combine date and time into ISO datetime
   */
  combineDatetime(date, time) {
    if (!date) return null
    const normalizedTime = this.normalizeTime(time)
    return `${date}T${normalizedTime}:00`
  }

  /**
   * Parse boolean from various formats
   */
  parseBoolean(value) {
    if (!value) return false
    const v = value.toString().toLowerCase()
    return v === 'yes' || v === 'true' || v === '1' || v === 'on'
  }
}

export default SchedulicityAdapter