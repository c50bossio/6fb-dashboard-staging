/**
 * Trafft Adapter - Handles Trafft.com CSV exports
 * Trafft is a modern booking platform with good export capabilities
 */

export class TrafftAdapter {
  constructor(options = {}) {
    this.options = {
      dateFormat: 'YYYY-MM-DD', // Trafft uses ISO format
      timeFormat: '24h',
      delimiter: options.delimiter || ',', // Can be comma or semicolon
      ...options
    }
  }

  /**
   * Get platform configuration
   */
  static getConfig() {
    return {
      platform: 'trafft',
      displayName: 'Trafft',
      supportedEntities: ['customers', 'appointments', 'services'],
      advantages: [
        'Clean CSV export format',
        'Custom fields are preserved',
        'Flexible delimiter choice',
        'Includes online meeting links',
        'Recurring appointment support'
      ],
      limitations: [
        'API still in development',
        'Export limited to selected date range',
        'Custom fields need manual mapping'
      ],
      exportInstructions: [
        'Navigate to the Appointments tab in Trafft',
        'Select your desired date range',
        'Click on "Export Data"',
        'Choose delimiter (comma or semicolon)',
        'Select which columns to include',
        'Download CSV file',
        'For customers: Go to Customers tab and repeat process'
      ],
      expectedFileSize: '5-20MB',
      estimatedTime: '5-10 minutes'
    }
  }

  /**
   * Identify if a CSV file is from Trafft
   * @param {Array} headers - CSV headers
   * @param {Object} metadata - File metadata
   * @returns {boolean} True if likely from Trafft
   */
  static identify(headers, metadata = {}) {
    const trafftAppointmentFields = [
      'Appointment ID', 'Service', 'Customer', 'Employee',
      'Date', 'Time', 'Duration', 'Status', 'Price',
      'Online Meeting Link', 'Recurring'
    ]
    
    const trafftCustomerFields = [
      'Customer ID', 'First Name', 'Last Name', 'Full Name',
      'Email', 'Phone', 'Date of Birth', 'Gender',
      'Address', 'City', 'Country', 'Note'
    ]
    
    const headerLower = headers.map(h => h.toLowerCase())
    
    // Check for Trafft-specific fields
    const hasOnlineMeeting = headerLower.some(h => 
      h.includes('online meeting') || h.includes('zoom') || h.includes('google meet')
    )
    
    const hasRecurring = headerLower.some(h => 
      h.includes('recurring') || h.includes('repeat')
    )
    
    // Count matches
    const appointmentMatches = trafftAppointmentFields.filter(field => 
      headerLower.includes(field.toLowerCase())
    ).length
    
    const customerMatches = trafftCustomerFields.filter(field =>
      headerLower.includes(field.toLowerCase())
    ).length
    
    // Trafft is likely if we have online meeting fields or good field matches
    return hasOnlineMeeting || hasRecurring || appointmentMatches >= 4 || customerMatches >= 4
  }

  /**
   * Detect entity type from Trafft CSV
   * @param {Array} headers - CSV headers
   * @returns {string} Entity type
   */
  detectEntityType(headers) {
    const headerLower = headers.map(h => h.toLowerCase())
    
    if (headerLower.some(h => h.includes('appointment')) || 
        headerLower.some(h => h.includes('service')) && 
        headerLower.some(h => h.includes('employee'))) {
      return 'appointments'
    }
    
    if (headerLower.some(h => h.includes('customer')) && 
        !headerLower.some(h => h.includes('appointment'))) {
      return 'customers'
    }
    
    if (headerLower.some(h => h.includes('service')) && 
        headerLower.some(h => h.includes('duration')) &&
        headerLower.some(h => h.includes('price'))) {
      return 'services'
    }
    
    return 'unknown'
  }

  /**
   * Transform Trafft customer data to universal schema
   * @param {Array} data - Raw Trafft customer data
   * @returns {Object} Transformed data
   */
  transformCustomers(data) {
    const transformed = []
    const errors = []
    const warnings = []
    const customFields = new Set()
    
    data.forEach((row, index) => {
      try {
        // Identify custom fields (fields that don't match standard patterns)
        const standardFields = new Set([
          'customer id', 'id', 'first name', 'last name', 'full name',
          'email', 'phone', 'mobile', 'date of birth', 'dob', 'gender',
          'address', 'street', 'city', 'state', 'country', 'zip',
          'postal code', 'note', 'notes', 'created', 'updated'
        ])
        
        Object.keys(row).forEach(key => {
          const keyLower = key.toLowerCase()
          if (!Array.from(standardFields).some(std => keyLower.includes(std))) {
            customFields.add(key)
          }
        })
        
        const customer = {
          // Name handling - Trafft may have separate or combined fields
          name: this.extractName(row),
          
          email: this.normalizeEmail(
            row['Email'] || row['Email Address'] || row['E-mail'] || ''
          ),
          
          phone: this.normalizePhone(
            row['Phone'] || row['Phone Number'] || row['Mobile'] || ''
          ),
          
          // Address handling
          address: this.buildAddress(row),
          
          // Optional fields
          birthdate: this.parseDate(
            row['Date of Birth'] || row['DOB'] || row['Birthday']
          ),
          
          gender: row['Gender'] || null,
          
          notes: row['Note'] || row['Notes'] || row['Description'] || null,
          
          // Trafft specific
          trafft_customer_id: row['Customer ID'] || row['ID'],
          
          // Timestamps
          created_at: this.parseDate(row['Created'] || row['Created At']),
          updated_at: this.parseDate(row['Updated'] || row['Updated At']),
          
          // Collect custom fields
          custom_fields: this.extractCustomFields(row, customFields)
        }
        
        // Validate required fields
        if (!customer.name && !customer.email && !customer.phone) {
          errors.push({
            row: index + 2,
            message: 'Customer must have name, email, or phone'
          })
        } else {
          transformed.push(customer)
        }
        
        // Warnings for custom fields
        if (customer.custom_fields && Object.keys(customer.custom_fields).length > 0) {
          warnings.push({
            row: index + 2,
            type: 'custom_fields',
            message: `Found ${Object.keys(customer.custom_fields).length} custom fields`,
            fields: Object.keys(customer.custom_fields)
          })
        }
        
      } catch (error) {
        errors.push({
          row: index + 2,
          message: `Failed to transform: ${error.message}`
        })
      }
    })
    
    return { transformed, errors, warnings, customFields: Array.from(customFields) }
  }

  /**
   * Transform Trafft appointment data to universal schema
   * @param {Array} data - Raw Trafft appointment data
   * @returns {Object} Transformed data
   */
  transformAppointments(data) {
    const transformed = []
    const errors = []
    const warnings = []
    
    data.forEach((row, index) => {
      try {
        const appointment = {
          // Date and time - Trafft usually provides these separately
          date: this.parseDate(row['Date'] || row['Appointment Date']),
          
          time: this.parseTime(row['Time'] || row['Start Time']),
          
          // Service information
          service: row['Service'] || row['Service Name'] || '',
          
          // Customer reference
          customer_ref: row['Customer'] || row['Customer Name'] || row['Client'] || '',
          
          // Staff/Employee
          barber: row['Employee'] || row['Staff'] || row['Provider'] || null,
          
          // Duration (Trafft provides in minutes)
          duration: this.parseDuration(row['Duration']),
          
          end_time: this.parseTime(row['End Time']) || 
                   this.calculateEndTime(row['Time'], row['Duration']),
          
          // Pricing
          price: this.parsePrice(row['Price'] || row['Total Price']),
          
          // Status
          status: this.normalizeStatus(row['Status']),
          
          // Notes
          notes: row['Note'] || row['Notes'] || row['Internal Note'] || null,
          
          // Online meeting info (Trafft special feature)
          online_meeting_link: row['Online Meeting Link'] || row['Meeting Link'] || null,
          online_meeting_type: this.detectMeetingType(row['Online Meeting Link']),
          
          // Recurring appointment info
          is_recurring: this.parseBoolean(row['Recurring'] || row['Is Recurring']),
          recurring_id: row['Recurring ID'] || row['Series ID'] || null,
          
          // Trafft specific
          trafft_appointment_id: row['Appointment ID'] || row['ID'],
          
          // Payment status
          payment_status: row['Payment Status'] || null,
          paid_amount: this.parsePrice(row['Paid Amount']),
          
          // Location info if available
          location: row['Location'] || row['Branch'] || null,
          
          // Timestamps
          created_at: this.parseDate(row['Created'] || row['Booked At']),
          updated_at: this.parseDate(row['Updated'] || row['Modified At']),
          
          // Custom fields (if any)
          custom_fields: this.extractAppointmentCustomFields(row)
        }
        
        // Validate required fields
        if (!appointment.date || !appointment.service || !appointment.customer_ref) {
          errors.push({
            row: index + 2,
            message: 'Appointment must have date, service, and customer'
          })
        } else {
          transformed.push(appointment)
        }
        
        // Add warnings for online meetings
        if (appointment.online_meeting_link) {
          warnings.push({
            row: index + 2,
            type: 'online_meeting',
            message: 'Online meeting detected - ensure virtual service setup'
          })
        }
        
        // Add warnings for recurring appointments
        if (appointment.is_recurring) {
          warnings.push({
            row: index + 2,
            type: 'recurring',
            message: 'Recurring appointment - series will need to be recreated'
          })
        }
        
      } catch (error) {
        errors.push({
          row: index + 2,
          message: `Failed to transform: ${error.message}`
        })
      }
    })
    
    return { transformed, errors, warnings }
  }

  /**
   * Transform Trafft service data to universal schema
   * @param {Array} data - Raw Trafft service data
   * @returns {Object} Transformed data
   */
  transformServices(data) {
    const transformed = []
    const errors = []
    const warnings = []
    
    data.forEach((row, index) => {
      try {
        const service = {
          name: row['Service'] || row['Service Name'] || row['Name'] || '',
          
          duration: this.parseDuration(
            row['Duration'] || row['Service Duration'] || row['Length']
          ),
          
          price: this.parsePrice(
            row['Price'] || row['Service Price'] || row['Cost']
          ),
          
          // Optional fields
          description: row['Description'] || row['Details'] || null,
          
          category: row['Category'] || row['Service Category'] || null,
          
          // Capacity (for group services)
          capacity: this.parseNumber(row['Capacity'] || row['Max Capacity']),
          
          // Buffer time
          buffer_before: this.parseDuration(row['Buffer Before']),
          buffer_after: this.parseDuration(row['Buffer After']),
          
          // Availability
          active: this.parseBoolean(
            row['Active'] || row['Available'] || row['Enabled']
          ),
          
          // Online service capability
          online_service: this.parseBoolean(row['Online Service'] || row['Virtual']),
          
          // Trafft specific
          trafft_service_id: row['Service ID'] || row['ID'],
          
          // Color coding (for calendar display)
          color: row['Color'] || row['Service Color'] || null
        }
        
        // Validate required fields
        if (!service.name || !service.duration || service.price === null) {
          errors.push({
            row: index + 2,
            message: 'Service must have name, duration, and price'
          })
        } else {
          transformed.push(service)
        }
        
        // Warnings for online services
        if (service.online_service) {
          warnings.push({
            row: index + 2,
            type: 'online_service',
            message: 'Online service capability detected'
          })
        }
        
      } catch (error) {
        errors.push({
          row: index + 2,
          message: `Failed to transform: ${error.message}`
        })
      }
    })
    
    return { transformed, errors, warnings }
  }

  // Helper methods

  extractName(row) {
    // Try full name first
    if (row['Full Name']) {
      return row['Full Name'].trim()
    }
    
    // Combine first and last name
    const firstName = row['First Name'] || row['Given Name'] || ''
    const lastName = row['Last Name'] || row['Family Name'] || row['Surname'] || ''
    
    const combined = [firstName, lastName].filter(n => n).join(' ').trim()
    
    // Fall back to any name field
    return combined || row['Name'] || row['Customer'] || row['Client'] || ''
  }

  buildAddress(row) {
    const parts = [
      row['Address'] || row['Street Address'] || row['Address Line 1'],
      row['Address Line 2'],
      row['City'],
      row['State'] || row['Province'],
      row['Zip'] || row['Postal Code'] || row['ZIP Code'],
      row['Country']
    ].filter(p => p && p.trim())
    
    return parts.length > 0 ? parts.join(', ') : null
  }

  extractCustomFields(row, knownCustomFields) {
    const customData = {}
    
    knownCustomFields.forEach(field => {
      if (row[field] !== undefined && row[field] !== null && row[field] !== '') {
        customData[field] = row[field]
      }
    })
    
    return Object.keys(customData).length > 0 ? customData : null
  }

  extractAppointmentCustomFields(row) {
    // Common Trafft custom fields for appointments
    const customFieldPatterns = [
      /^custom_/i,
      /^cf_/i,
      /^extra_/i,
      /^additional_/i
    ]
    
    const customData = {}
    
    Object.keys(row).forEach(key => {
      if (customFieldPatterns.some(pattern => pattern.test(key))) {
        if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
          customData[key] = row[key]
        }
      }
    })
    
    return Object.keys(customData).length > 0 ? customData : null
  }

  detectMeetingType(link) {
    if (!link) return null
    
    const linkLower = link.toLowerCase()
    
    if (linkLower.includes('zoom')) return 'zoom'
    if (linkLower.includes('meet.google')) return 'google_meet'
    if (linkLower.includes('teams.microsoft')) return 'ms_teams'
    
    return 'other'
  }

  normalizeEmail(email) {
    return email ? email.toLowerCase().trim() : null
  }

  normalizePhone(phone) {
    if (!phone) return null
    
    // Remove all non-digits
    const digits = phone.replace(/\D/g, '')
    
    // Format based on length
    if (digits.length === 10) {
      return `+1${digits}` // US number
    }
    
    if (digits.length === 11 && digits[0] === '1') {
      return `+${digits}`
    }
    
    // Return as-is for international numbers
    return digits
  }

  parseDate(dateStr) {
    if (!dateStr) return null
    
    // Trafft typically uses ISO format
    if (dateStr.includes('T') || dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const parsed = new Date(dateStr)
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString()
      }
    }
    
    // Try other formats
    const parsed = new Date(dateStr)
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString()
    }
    
    return null
  }

  parseTime(timeStr) {
    if (!timeStr) return null
    
    // Handle 24-hour format (HH:MM or HH:MM:SS)
    const match24 = timeStr.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
    if (match24) {
      const [_, hours, minutes, seconds = '00'] = match24
      return `${hours.padStart(2, '0')}:${minutes}:${seconds}`
    }
    
    // Handle 12-hour format if present
    const match12 = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
    if (match12) {
      let [_, hours, minutes, meridiem] = match12
      hours = parseInt(hours)
      
      if (meridiem.toUpperCase() === 'PM' && hours < 12) hours += 12
      if (meridiem.toUpperCase() === 'AM' && hours === 12) hours = 0
      
      return `${hours.toString().padStart(2, '0')}:${minutes}:00`
    }
    
    return timeStr
  }

  parseDuration(duration) {
    if (!duration) return 60
    
    // If it's already a number, assume minutes
    if (!isNaN(duration)) {
      return parseInt(duration)
    }
    
    const str = String(duration).toLowerCase()
    
    // Parse various formats
    if (str.includes('h')) {
      const hours = parseFloat(str.match(/(\d+(?:\.\d+)?)\s*h/)?.[1] || 0)
      const minutes = parseFloat(str.match(/(\d+)\s*m/)?.[1] || 0)
      return hours * 60 + minutes
    }
    
    if (str.includes('min')) {
      return parseFloat(str.match(/(\d+)/)?.[1] || 60)
    }
    
    // Default
    return 60
  }

  calculateEndTime(startTime, duration) {
    if (!startTime || !duration) return null
    
    const time = this.parseTime(startTime)
    if (!time) return null
    
    const [hours, minutes] = time.split(':').map(Number)
    const durationMinutes = this.parseDuration(duration)
    
    const totalMinutes = hours * 60 + minutes + durationMinutes
    const endHours = Math.floor(totalMinutes / 60) % 24
    const endMinutes = totalMinutes % 60
    
    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}:00`
  }

  parsePrice(price) {
    if (price === null || price === undefined) return null
    
    // Remove currency symbols
    const cleaned = String(price).replace(/[^0-9.-]/g, '')
    const parsed = parseFloat(cleaned)
    
    return isNaN(parsed) ? null : Math.round(parsed * 100) / 100
  }

  parseNumber(value) {
    if (!value) return null
    const parsed = parseInt(value)
    return isNaN(parsed) ? null : parsed
  }

  parseBoolean(value) {
    if (!value) return false
    
    const str = String(value).toLowerCase().trim()
    return str === 'true' || str === 'yes' || str === '1' || 
           str === 'y' || str === 'enabled' || str === 'active'
  }

  normalizeStatus(status) {
    if (!status) return 'unknown'
    
    const normalized = status.toLowerCase().trim()
    
    const statusMap = {
      'approved': 'confirmed',
      'confirmed': 'confirmed',
      'pending': 'pending',
      'completed': 'completed',
      'done': 'completed',
      'cancelled': 'cancelled',
      'canceled': 'cancelled',
      'no show': 'no_show',
      'no-show': 'no_show',
      'rejected': 'cancelled'
    }
    
    return statusMap[normalized] || normalized
  }
}

export default TrafftAdapter