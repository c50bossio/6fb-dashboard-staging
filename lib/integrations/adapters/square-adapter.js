/**
 * Square Adapter - Handles Square Appointments CSV format
 * Based on Square's export capabilities and limitations
 */

export class SquareAdapter {
  constructor(options = {}) {
    this.options = {
      dateFormat: 'MM/DD/YYYY',
      timeFormat: '12h', // Square uses 12-hour format
      ...options
    }
  }

  /**
   * Get platform configuration
   */
  static getConfig() {
    return {
      platform: 'square',
      displayName: 'Square Appointments',
      supportedEntities: ['customers', 'appointments'],
      limitations: [
        'Does not export future appointments',
        'Services must be manually added',
        'Limited appointment status information',
        'Customer notes may be truncated'
      ],
      exportInstructions: [
        'Log in to your Square Dashboard',
        'Navigate to Customers > Customer Directory',
        'Click "Export" to download customer CSV',
        'Navigate to Appointments > History',
        'Select date range and export appointment history',
        'Upload both CSV files here'
      ],
      expectedFileSize: '5-15MB',
      estimatedTime: '5-10 minutes'
    }
  }

  /**
   * Identify if a CSV file is from Square
   * @param {Array} headers - CSV headers
   * @param {Object} metadata - File metadata
   * @returns {boolean} True if likely from Square
   */
  static identify(headers, metadata = {}) {
    const squareCustomerFields = [
      'Customer ID', 'Given Name', 'Family Name', 'Email Address',
      'Phone Number', 'Company Name', 'Creation Source', 'Created At'
    ]
    
    const squareAppointmentFields = [
      'Appointment ID', 'Customer', 'Service', 'Staff', 
      'Date', 'Start Time', 'Duration', 'Status'
    ]
    
    const headerLower = headers.map(h => h.toLowerCase())
    
    // Check for Square customer export
    const customerMatches = squareCustomerFields.filter(field => 
      headerLower.includes(field.toLowerCase())
    ).length
    
    // Check for Square appointment export
    const appointmentMatches = squareAppointmentFields.filter(field =>
      headerLower.includes(field.toLowerCase())
    ).length
    
    return customerMatches >= 4 || appointmentMatches >= 4
  }

  /**
   * Detect entity type from Square CSV
   * @param {Array} headers - CSV headers
   * @returns {string} Entity type
   */
  detectEntityType(headers) {
    const headerLower = headers.map(h => h.toLowerCase())
    
    if (headerLower.includes('customer id') && headerLower.includes('email address')) {
      return 'customers'
    }
    
    if (headerLower.includes('appointment id') || headerLower.includes('service')) {
      return 'appointments'
    }
    
    return 'unknown'
  }

  /**
   * Transform Square customer data to universal schema
   * @param {Array} data - Raw Square customer data
   * @returns {Object} Transformed data
   */
  transformCustomers(data) {
    const transformed = []
    const errors = []
    const warnings = []
    
    data.forEach((row, index) => {
      try {
        const customer = {
          // Combine given and family name
          name: this.combineName(row['Given Name'], row['Family Name']) || 
                row['Customer'] || 
                row['Display Name'] || 
                '',
          
          email: this.normalizeEmail(row['Email Address'] || row['Email'] || ''),
          
          phone: this.normalizePhone(row['Phone Number'] || row['Phone'] || ''),
          
          // Square specific fields
          square_customer_id: row['Customer ID'] || row['Square Customer ID'],
          
          // Optional fields
          company: row['Company Name'] || row['Company'] || null,
          
          address: this.buildAddress(row),
          
          birthdate: this.parseDate(row['Birthday'] || row['Date of Birth']),
          
          notes: row['Note'] || row['Customer Note'] || row['Notes'] || null,
          
          tags: this.parseTags(row['Groups'] || row['Customer Groups']),
          
          created_at: this.parseSquareDate(row['Created At'] || row['Creation Date']),
          
          // Square loyalty info if available
          loyalty_points: this.parseNumber(row['Loyalty Points']),
          
          total_spent: this.parseMoney(row['Total Spent']),
          
          visit_count: this.parseNumber(row['Total Visits'])
        }
        
        // Validate required fields
        if (!customer.name && !customer.email && !customer.phone) {
          errors.push({
            row: index + 2, // Add 2 for header and 1-based indexing
            message: 'Customer must have name, email, or phone'
          })
        } else {
          transformed.push(customer)
        }
        
        // Add warnings for missing recommended fields
        if (!customer.email) {
          warnings.push({
            row: index + 2,
            field: 'email',
            message: 'Customer email is recommended for communications'
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
   * Transform Square appointment data to universal schema
   * @param {Array} data - Raw Square appointment data
   * @returns {Object} Transformed data
   */
  transformAppointments(data) {
    const transformed = []
    const errors = []
    const warnings = []
    
    data.forEach((row, index) => {
      try {
        const appointment = {
          // Parse date and time
          date: this.parseSquareDate(row['Date'] || row['Appointment Date']),
          
          time: this.parseSquareTime(row['Start Time'] || row['Time']),
          
          // Service information
          service: row['Service'] || row['Service Name'] || row['Appointment Type'] || '',
          
          // Customer reference
          customer_ref: row['Customer'] || row['Customer Name'] || row['Client'] || '',
          
          // Optional fields
          barber: row['Staff'] || row['Staff Member'] || row['Employee'] || null,
          
          duration: this.parseDuration(row['Duration'] || row['Length']),
          
          end_time: this.calculateEndTime(
            row['Start Time'],
            row['Duration'] || row['End Time']
          ),
          
          price: this.parseMoney(row['Price'] || row['Service Price'] || row['Total']),
          
          status: this.normalizeStatus(row['Status'] || row['Appointment Status']),
          
          notes: row['Note'] || row['Notes'] || row['Internal Notes'] || null,
          
          // Square specific
          square_appointment_id: row['Appointment ID'],
          square_location_id: row['Location ID'],
          
          // Payment info if available
          payment_status: row['Payment Status'],
          deposit_amount: this.parseMoney(row['Deposit Amount']),
          
          // Metadata
          created_at: this.parseSquareDate(row['Created At']),
          updated_at: this.parseSquareDate(row['Updated At'])
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
        
        // Check for past appointments only (Square limitation)
        if (appointment.date && new Date(appointment.date) > new Date()) {
          warnings.push({
            row: index + 2,
            message: 'Future appointment detected - verify data accuracy'
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

  combineName(firstName, lastName) {
    const parts = [firstName, lastName].filter(p => p && p.trim())
    return parts.join(' ').trim()
  }

  normalizeEmail(email) {
    return email ? email.toLowerCase().trim() : null
  }

  normalizePhone(phone) {
    if (!phone) return null
    
    // Remove all non-digits
    const digits = phone.replace(/\D/g, '')
    
    // Format as US phone if 10 digits
    if (digits.length === 10) {
      return `+1${digits}`
    }
    
    // Return with country code if present
    if (digits.length === 11 && digits[0] === '1') {
      return `+${digits}`
    }
    
    return digits
  }

  buildAddress(row) {
    const parts = [
      row['Address Line 1'],
      row['Address Line 2'],
      row['City'],
      row['State'],
      row['Postal Code'],
      row['Country']
    ].filter(p => p && p.trim())
    
    return parts.length > 0 ? parts.join(', ') : null
  }

  parseSquareDate(dateStr) {
    if (!dateStr) return null
    
    // Square uses various date formats
    // Try ISO format first (from API exports)
    if (dateStr.includes('T')) {
      return new Date(dateStr).toISOString()
    }
    
    // Try MM/DD/YYYY format (common in CSV exports)
    const usFormat = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
    const match = dateStr.match(usFormat)
    
    if (match) {
      const [_, month, day, year] = match
      return new Date(year, month - 1, day).toISOString()
    }
    
    // Try to parse as-is
    const parsed = new Date(dateStr)
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString()
    }
    
    return null
  }

  parseSquareTime(timeStr) {
    if (!timeStr) return null
    
    // Parse 12-hour format (e.g., "2:30 PM")
    const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i)
    
    if (match) {
      let [_, hours, minutes, meridiem] = match
      hours = parseInt(hours)
      
      if (meridiem) {
        if (meridiem.toUpperCase() === 'PM' && hours < 12) hours += 12
        if (meridiem.toUpperCase() === 'AM' && hours === 12) hours = 0
      }
      
      return `${hours.toString().padStart(2, '0')}:${minutes}:00`
    }
    
    return timeStr
  }

  parseDuration(duration) {
    if (!duration) return 60 // Default to 1 hour
    
    // If already a number, assume minutes
    if (!isNaN(duration)) {
      return parseInt(duration)
    }
    
    // Parse "1 hour 30 minutes" format
    const hours = duration.match(/(\d+)\s*h/i)
    const minutes = duration.match(/(\d+)\s*m/i)
    
    let total = 0
    if (hours) total += parseInt(hours[1]) * 60
    if (minutes) total += parseInt(minutes[1])
    
    return total || 60
  }

  calculateEndTime(startTime, durationOrEndTime) {
    if (!startTime) return null
    
    // If it looks like a time, return it
    if (durationOrEndTime && durationOrEndTime.includes(':')) {
      return this.parseSquareTime(durationOrEndTime)
    }
    
    // Calculate from duration
    const start = this.parseSquareTime(startTime)
    const duration = this.parseDuration(durationOrEndTime)
    
    if (start && duration) {
      const [hours, minutes] = start.split(':').map(Number)
      const totalMinutes = hours * 60 + minutes + duration
      const endHours = Math.floor(totalMinutes / 60)
      const endMinutes = totalMinutes % 60
      
      return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}:00`
    }
    
    return null
  }

  parseMoney(amount) {
    if (!amount) return null
    
    // Remove currency symbols and parse
    const cleaned = String(amount).replace(/[^0-9.-]/g, '')
    const parsed = parseFloat(cleaned)
    
    return isNaN(parsed) ? null : Math.round(parsed * 100) / 100
  }

  parseNumber(value) {
    if (!value) return null
    const parsed = parseInt(value)
    return isNaN(parsed) ? null : parsed
  }

  parseTags(tags) {
    if (!tags) return []
    
    // Square uses comma-separated groups
    return tags.split(',').map(t => t.trim()).filter(t => t)
  }

  normalizeStatus(status) {
    if (!status) return 'unknown'
    
    const normalized = status.toLowerCase().trim()
    
    const statusMap = {
      'confirmed': 'confirmed',
      'completed': 'completed',
      'cancelled': 'cancelled',
      'canceled': 'cancelled',
      'no show': 'no_show',
      'no-show': 'no_show',
      'pending': 'pending'
    }
    
    return statusMap[normalized] || normalized
  }
}

export default SquareAdapter