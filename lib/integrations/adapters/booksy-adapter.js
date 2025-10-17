/**
 * Booksy Adapter - Handles Booksy platform CSV/Excel exports
 * Note: Booksy requires contacting support for data export
 */

export class BooksyAdapter {
  constructor(options = {}) {
    this.options = {
      dateFormat: 'MM/DD/YYYY', // Booksy typically uses US format
      timeFormat: '12h',
      ...options
    }
  }

  /**
   * Get platform configuration
   */
  static getConfig() {
    return {
      platform: 'booksy',
      displayName: 'Booksy',
      supportedEntities: ['customers', 'appointments', 'services'],
      advantages: [
        'Comprehensive client data including reviews',
        'Detailed appointment history',
        'Service and pricing information',
        'Staff assignment data'
      ],
      limitations: [
        'Requires support team assistance (24-48 hour wait)',
        'Data format may vary based on support export',
        'Reviews and ratings may not be included',
        'No direct API access available',
        'Excel files need CSV conversion'
      ],
      exportInstructions: [
        'Contact Booksy support via in-app chat or email',
        'Request complete data export for migration',
        'Specify: Clients, Appointments, Services, Staff, Reviews',
        'Wait 24-48 hours for support team response',
        'Download the provided ZIP file',
        'Extract CSV/Excel files',
        'Convert Excel to CSV if needed',
        'Upload each file type here'
      ],
      expectedFileSize: '10-25MB',
      estimatedTime: '1-2 days (waiting for support)'
    }
  }

  /**
   * Identify if a CSV file is from Booksy
   * Booksy exports can vary, so we look for common patterns
   */
  static identify(headers, metadata = {}) {
    const booksyCustomerPatterns = [
      // Common Booksy customer field combinations
      ['client name', 'client email', 'client phone'],
      ['customer name', 'mobile', 'email address'],
      ['first name', 'last name', 'mobile number', 'email'],
      ['client', 'phone', 'email', 'joined date']
    ]
    
    const booksyAppointmentPatterns = [
      ['booking date', 'service', 'client', 'staff'],
      ['appointment date', 'customer', 'treatment', 'employee'],
      ['date', 'time', 'service name', 'client name', 'staff name'],
      ['booking id', 'date', 'service', 'customer', 'price']
    ]
    
    const headerLower = headers.map(h => h.toLowerCase())
    
    // Check for Booksy-specific fields
    const booksyIndicators = [
      'booking id', 'booking date', 'booking status',
      'treatment', 'staff name', 'client name',
      'review score', 'review text', 'joined date',
      'total spent', 'last visit', 'no show count'
    ]
    
    const indicatorMatches = booksyIndicators.filter(indicator => 
      headerLower.some(h => h.includes(indicator))
    ).length
    
    // Check pattern matching
    for (const pattern of [...booksyCustomerPatterns, ...booksyAppointmentPatterns]) {
      const matches = pattern.filter(field => 
        headerLower.some(h => h.includes(field))
      ).length
      
      if (matches >= pattern.length * 0.7) { // 70% match threshold
        return true
      }
    }
    
    return indicatorMatches >= 3
  }

  /**
   * Detect entity type from Booksy CSV
   */
  detectEntityType(headers) {
    const headerLower = headers.map(h => h.toLowerCase())
    
    // Check for appointment-specific fields
    if (headerLower.some(h => h.includes('booking')) || 
        headerLower.some(h => h.includes('appointment')) ||
        (headerLower.some(h => h.includes('service')) && 
         headerLower.some(h => h.includes('date')) &&
         headerLower.some(h => h.includes('time')))) {
      return 'appointments'
    }
    
    // Check for service catalog fields
    if (headerLower.some(h => h.includes('service name')) &&
        headerLower.some(h => h.includes('duration')) &&
        headerLower.some(h => h.includes('price')) &&
        !headerLower.some(h => h.includes('client'))) {
      return 'services'
    }
    
    // Default to customers if has contact info
    if (headerLower.some(h => h.includes('email')) ||
        headerLower.some(h => h.includes('phone')) ||
        headerLower.some(h => h.includes('mobile'))) {
      return 'customers'
    }
    
    return 'unknown'
  }

  /**
   * Transform Booksy customer data to universal schema
   */
  transformCustomers(data) {
    const transformed = []
    const errors = []
    const warnings = []
    
    data.forEach((row, index) => {
      try {
        const customer = {
          // Name handling - Booksy may use various formats
          name: this.extractCustomerName(row),
          
          // Email - multiple possible field names
          email: this.normalizeEmail(
            row['Client Email'] || 
            row['Email'] || 
            row['Email Address'] || 
            row['Customer Email'] ||
            row['E-mail'] || ''
          ),
          
          // Phone - Booksy often uses "Mobile"
          phone: this.normalizePhone(
            row['Mobile'] || 
            row['Phone'] || 
            row['Client Phone'] || 
            row['Mobile Number'] ||
            row['Phone Number'] ||
            row['Contact Number'] || ''
          ),
          
          // Address fields
          address: this.buildAddress(row),
          
          // Optional fields
          birthdate: this.parseDate(
            row['Date of Birth'] || 
            row['Birthday'] ||
            row['DOB']
          ),
          
          // Booksy-specific fields
          joined_date: this.parseDate(
            row['Joined Date'] || 
            row['Registration Date'] ||
            row['Created Date'] ||
            row['First Visit']
          ),
          
          last_visit: this.parseDate(
            row['Last Visit'] || 
            row['Last Appointment'] ||
            row['Most Recent Visit']
          ),
          
          total_spent: this.parseMoney(
            row['Total Spent'] || 
            row['Lifetime Value'] ||
            row['Total Revenue']
          ),
          
          visit_count: this.parseNumber(
            row['Visit Count'] || 
            row['Total Visits'] ||
            row['Number of Visits'] ||
            row['Appointments Count']
          ),
          
          no_show_count: this.parseNumber(
            row['No Show Count'] || 
            row['No Shows'] ||
            row['Missed Appointments']
          ),
          
          // Reviews and ratings
          average_rating: this.parseNumber(
            row['Average Rating'] || 
            row['Review Score'] ||
            row['Rating']
          ),
          
          review_count: this.parseNumber(
            row['Review Count'] || 
            row['Total Reviews'] ||
            row['Number of Reviews']
          ),
          
          // Notes and preferences
          notes: row['Notes'] || 
                 row['Client Notes'] || 
                 row['Comments'] ||
                 row['Special Instructions'] || '',
          
          preferences: row['Preferences'] || 
                      row['Service Preferences'] ||
                      row['Favorite Services'] || '',
          
          // Tags/Labels
          tags: this.parseTags(
            row['Tags'] || 
            row['Labels'] ||
            row['Client Tags'] ||
            row['Categories']
          ),
          
          // Marketing preferences
          marketing_consent: this.parseBoolean(
            row['Marketing Consent'] || 
            row['Email Marketing'] ||
            row['SMS Consent'] ||
            row['Accepts Marketing']
          ),
          
          // Status
          status: this.normalizeStatus(
            row['Status'] || 
            row['Client Status'] ||
            row['Account Status']
          ),
          
          // Booksy ID
          booksy_client_id: row['Client ID'] || 
                           row['Customer ID'] ||
                           row['Booksy ID'] ||
                           row['ID']
        }
        
        // Validate required fields
        if (!customer.name && !customer.email && !customer.phone) {
          errors.push({
            row: index + 2,
            message: 'Customer must have name, email, or phone'
          })
        } else {
          transformed.push(customer)
          
          // Add warnings for VIP or high-value customers
          if (customer.total_spent > 1000 || customer.visit_count > 20) {
            warnings.push({
              row: index + 2,
              type: 'vip_customer',
              message: `High-value customer: ${customer.visit_count || 0} visits, $${customer.total_spent || 0} spent`
            })
          }
          
          // Warn about customers with many no-shows
          if (customer.no_show_count > 3) {
            warnings.push({
              row: index + 2,
              type: 'frequent_no_show',
              message: `Customer has ${customer.no_show_count} no-shows`
            })
          }
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
   * Transform Booksy appointment data to universal schema
   */
  transformAppointments(data) {
    const transformed = []
    const errors = []
    const warnings = []
    
    data.forEach((row, index) => {
      try {
        const appointment = {
          // Date and time
          date: this.parseDate(
            row['Booking Date'] || 
            row['Appointment Date'] ||
            row['Date'] ||
            row['Service Date']
          ),
          
          time: this.parseTime(
            row['Booking Time'] || 
            row['Time'] ||
            row['Start Time'] ||
            row['Appointment Time']
          ),
          
          // Service information
          service: row['Service'] || 
                  row['Treatment'] ||
                  row['Service Name'] ||
                  row['Appointment Type'] || '',
          
          // Customer reference
          customer_ref: row['Client'] || 
                       row['Client Name'] ||
                       row['Customer'] ||
                       row['Customer Name'] || '',
          
          // Staff member
          barber: row['Staff'] || 
                 row['Staff Name'] ||
                 row['Employee'] ||
                 row['Provider'] ||
                 row['Stylist'] || null,
          
          // Duration
          duration: this.parseDuration(
            row['Duration'] || 
            row['Service Duration'] ||
            row['Length'] ||
            row['Time Length']
          ),
          
          // End time
          end_time: this.parseTime(row['End Time']) ||
                   this.calculateEndTime(
                     row['Booking Time'] || row['Time'],
                     row['Duration']
                   ),
          
          // Pricing
          price: this.parseMoney(
            row['Price'] || 
            row['Service Price'] ||
            row['Total'] ||
            row['Amount'] ||
            row['Cost']
          ),
          
          tip: this.parseMoney(
            row['Tip'] || 
            row['Gratuity'] ||
            row['Tip Amount']
          ),
          
          // Status
          status: this.normalizeAppointmentStatus(
            row['Status'] || 
            row['Booking Status'] ||
            row['Appointment Status']
          ),
          
          // Payment
          payment_status: row['Payment Status'] || 
                         row['Paid'] ||
                         row['Payment'],
          
          payment_method: row['Payment Method'] || 
                         row['Payment Type'],
          
          // Notes
          notes: row['Notes'] || 
                row['Booking Notes'] ||
                row['Comments'] ||
                row['Special Requests'] || null,
          
          // Source
          booking_source: row['Booking Source'] || 
                         row['Source'] ||
                         row['Channel'] ||
                         'booksy',
          
          // Booksy specific
          booksy_booking_id: row['Booking ID'] || 
                            row['Appointment ID'] ||
                            row['ID'],
          
          // Cancellation info
          cancelled_at: this.parseDate(row['Cancelled At'] || row['Cancellation Date']),
          cancellation_reason: row['Cancellation Reason'] || row['Cancel Reason'],
          
          // Review info if included
          review_score: this.parseNumber(row['Review Score'] || row['Rating']),
          review_text: row['Review'] || row['Review Text'] || row['Feedback'],
          
          // Timestamps
          created_at: this.parseDate(
            row['Created At'] || 
            row['Booked At'] ||
            row['Booking Created']
          ),
          
          updated_at: this.parseDate(
            row['Updated At'] || 
            row['Modified At'] ||
            row['Last Modified']
          )
        }
        
        // Validate required fields
        if (!appointment.date || !appointment.service || !appointment.customer_ref) {
          errors.push({
            row: index + 2,
            message: 'Appointment must have date, service, and customer'
          })
        } else {
          transformed.push(appointment)
          
          // Add warnings for special cases
          if (appointment.status === 'no_show') {
            warnings.push({
              row: index + 2,
              type: 'no_show',
              message: 'No-show appointment will affect customer metrics'
            })
          }
          
          if (appointment.review_score && appointment.review_score < 3) {
            warnings.push({
              row: index + 2,
              type: 'low_rating',
              message: `Low review score: ${appointment.review_score}/5`
            })
          }
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
   * Transform Booksy service data to universal schema
   */
  transformServices(data) {
    const transformed = []
    const errors = []
    const warnings = []
    
    data.forEach((row, index) => {
      try {
        const service = {
          name: row['Service Name'] || 
               row['Service'] ||
               row['Treatment Name'] ||
               row['Name'] || '',
          
          duration: this.parseDuration(
            row['Duration'] || 
            row['Service Duration'] ||
            row['Length'] ||
            row['Time'] ||
            row['Minutes']
          ),
          
          price: this.parseMoney(
            row['Price'] || 
            row['Service Price'] ||
            row['Cost'] ||
            row['Rate'] ||
            row['Amount']
          ),
          
          // Optional fields
          description: row['Description'] || 
                      row['Service Description'] ||
                      row['Details'] ||
                      row['Info'] || null,
          
          category: row['Category'] || 
                   row['Service Category'] ||
                   row['Type'] ||
                   row['Service Type'] || null,
          
          // Availability
          active: this.parseBoolean(
            row['Active'] || 
            row['Available'] ||
            row['Enabled'] ||
            row['Status']
          ),
          
          // Booksy specific
          booksy_service_id: row['Service ID'] || 
                            row['ID'] ||
                            row['Booksy Service ID'],
          
          // Capacity for group services
          capacity: this.parseNumber(
            row['Capacity'] || 
            row['Max Capacity'] ||
            row['Group Size']
          ),
          
          // Commission/pricing details
          commission_rate: this.parseNumber(
            row['Commission'] || 
            row['Commission Rate'] ||
            row['Staff Commission']
          ),
          
          // Booking settings
          online_booking: this.parseBoolean(
            row['Online Booking'] || 
            row['Bookable Online'] ||
            row['Allow Online']
          ),
          
          // Popular service indicator
          booking_count: this.parseNumber(
            row['Total Bookings'] || 
            row['Booking Count'] ||
            row['Times Booked']
          )
        }
        
        // Validate required fields
        if (!service.name || service.duration === null || service.price === null) {
          errors.push({
            row: index + 2,
            message: 'Service must have name, duration, and price'
          })
        } else {
          transformed.push(service)
          
          // Add warnings for inactive or rarely booked services
          if (!service.active) {
            warnings.push({
              row: index + 2,
              type: 'inactive_service',
              message: 'Service is marked as inactive'
            })
          }
          
          if (service.booking_count && service.booking_count < 5) {
            warnings.push({
              row: index + 2,
              type: 'low_demand',
              message: `Service rarely booked: ${service.booking_count} total bookings`
            })
          }
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

  extractCustomerName(row) {
    // Try various name field combinations
    if (row['Client Name'] || row['Customer Name']) {
      return (row['Client Name'] || row['Customer Name']).trim()
    }
    
    if (row['Full Name']) {
      return row['Full Name'].trim()
    }
    
    // Combine first and last name
    const firstName = row['First Name'] || row['Given Name'] || ''
    const lastName = row['Last Name'] || row['Surname'] || row['Family Name'] || ''
    
    if (firstName || lastName) {
      return [firstName, lastName].filter(n => n).join(' ').trim()
    }
    
    // Fallback to any name-like field
    return row['Name'] || row['Client'] || row['Customer'] || ''
  }

  buildAddress(row) {
    const parts = [
      row['Address'] || row['Street Address'] || row['Address Line 1'],
      row['Address Line 2'],
      row['City'],
      row['State'] || row['Province'],
      row['Zip'] || row['Postal Code'] || row['Postcode'],
      row['Country']
    ].filter(p => p && p.trim())
    
    return parts.length > 0 ? parts.join(', ') : null
  }

  normalizeEmail(email) {
    if (!email) return null
    const cleaned = email.toLowerCase().trim()
    return cleaned.includes('@') ? cleaned : null
  }

  normalizePhone(phone) {
    if (!phone) return null
    
    // Remove all non-digits
    const digits = phone.replace(/\D/g, '')
    
    // Handle common phone formats
    if (digits.length === 10) {
      return `+1${digits}` // US/Canada
    }
    
    if (digits.length === 11 && digits[0] === '1') {
      return `+${digits}`
    }
    
    // UK mobile (07xxx)
    if (digits.length === 11 && digits.startsWith('07')) {
      return `+44${digits.substring(1)}`
    }
    
    // Return cleaned digits if can't determine format
    return digits
  }

  parseDate(dateStr) {
    if (!dateStr) return null
    
    // Handle various date formats Booksy might use
    const formats = [
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // MM/DD/YYYY
      /^(\d{4})-(\d{2})-(\d{2})$/,       // YYYY-MM-DD
      /^(\d{1,2})-(\d{1,2})-(\d{4})$/,   // MM-DD-YYYY
      /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/  // DD.MM.YYYY (European)
    ]
    
    // Try ISO format first
    if (dateStr.includes('T')) {
      const parsed = new Date(dateStr)
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString()
      }
    }
    
    // Try various formats
    for (const format of formats) {
      const match = dateStr.match(format)
      if (match) {
        let date
        if (format.source.includes('(\\d{4})-')) {
          // YYYY-MM-DD format
          date = new Date(match[1], match[2] - 1, match[3])
        } else if (format.source.includes('\\.')) {
          // DD.MM.YYYY format
          date = new Date(match[3], match[2] - 1, match[1])
        } else {
          // MM/DD/YYYY or MM-DD-YYYY format
          date = new Date(match[3], match[1] - 1, match[2])
        }
        
        if (!isNaN(date.getTime())) {
          return date.toISOString()
        }
      }
    }
    
    // Try native parsing as last resort
    const parsed = new Date(dateStr)
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString()
    }
    
    return null
  }

  parseTime(timeStr) {
    if (!timeStr) return null
    
    // Handle various time formats
    const time12 = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
    if (time12) {
      let [_, hours, minutes, meridiem] = time12
      hours = parseInt(hours)
      
      if (meridiem.toUpperCase() === 'PM' && hours < 12) hours += 12
      if (meridiem.toUpperCase() === 'AM' && hours === 12) hours = 0
      
      return `${hours.toString().padStart(2, '0')}:${minutes}:00`
    }
    
    // 24-hour format
    const time24 = timeStr.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
    if (time24) {
      const [_, hours, minutes, seconds = '00'] = time24
      return `${hours.padStart(2, '0')}:${minutes}:${seconds}`
    }
    
    return timeStr
  }

  parseDuration(duration) {
    if (!duration) return 60 // Default to 1 hour
    
    // If already a number, assume minutes
    if (!isNaN(duration)) {
      return parseInt(duration)
    }
    
    const str = String(duration).toLowerCase()
    
    // Parse "1h 30m" or "1.5 hours" formats
    const hours = str.match(/(\d+(?:\.\d+)?)\s*h/)?.[1]
    const minutes = str.match(/(\d+)\s*m/)?.[1]
    
    let total = 0
    if (hours) total += parseFloat(hours) * 60
    if (minutes) total += parseInt(minutes)
    
    return total || 60
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

  parseBoolean(value) {
    if (!value) return false
    
    const str = String(value).toLowerCase().trim()
    return str === 'true' || str === 'yes' || str === '1' || 
           str === 'y' || str === 'active' || str === 'enabled' ||
           str === 'available'
  }

  parseTags(tags) {
    if (!tags) return []
    
    if (Array.isArray(tags)) return tags
    
    // Try different delimiters
    const str = String(tags)
    if (str.includes(',')) {
      return str.split(',').map(t => t.trim()).filter(t => t)
    }
    if (str.includes(';')) {
      return str.split(';').map(t => t.trim()).filter(t => t)
    }
    if (str.includes('|')) {
      return str.split('|').map(t => t.trim()).filter(t => t)
    }
    
    return str ? [str.trim()] : []
  }

  normalizeStatus(status) {
    if (!status) return 'active'
    
    const normalized = status.toLowerCase().trim()
    
    const statusMap = {
      'active': 'active',
      'inactive': 'inactive',
      'suspended': 'inactive',
      'blocked': 'inactive',
      'vip': 'active',
      'regular': 'active',
      'new': 'active'
    }
    
    return statusMap[normalized] || 'active'
  }

  normalizeAppointmentStatus(status) {
    if (!status) return 'unknown'
    
    const normalized = status.toLowerCase().trim()
    
    const statusMap = {
      'confirmed': 'confirmed',
      'completed': 'completed',
      'done': 'completed',
      'finished': 'completed',
      'cancelled': 'cancelled',
      'canceled': 'cancelled',
      'no show': 'no_show',
      'no-show': 'no_show',
      'missed': 'no_show',
      'pending': 'pending',
      'booked': 'confirmed',
      'approved': 'confirmed',
      'rescheduled': 'confirmed'
    }
    
    return statusMap[normalized] || normalized
  }

  /**
   * Transform Booksy barbers/staff data
   * Booksy provides detailed staff profiles with photos, specialties, and performance metrics
   */
  transformBarbers(data) {
    const transformed = []
    const errors = []
    const warnings = []
    const photoDownloads = []
    
    data.forEach((row, index) => {
      try {
        const barber = {
          // Basic info
          name: row['Staff Name'] || row['Provider Name'] || row['Employee Name'] || '',
          email: this.normalizeEmail(row['Email'] || row['Staff Email'] || ''),
          phone: this.normalizePhone(row['Phone'] || row['Mobile'] || ''),
          
          // Profile photo handling
          profile_photo_url: this.processPhotoUrl(row),
          
          // Bio and description
          bio: row['Bio'] || row['Description'] || row['About'] || '',
          
          // Specialties and skills
          specialties: this.extractSpecialties(row),
          
          // Commission and financial
          commission_rate: this.parseCommission(row['Commission'] || row['Commission Rate'] || ''),
          
          // Employment info
          active: this.parseBoolean(row['Active'] || row['Status'] === 'Active'),
          hire_date: this.parseDate(row['Hire Date'] || row['Start Date'] || row['Joined']),
          license_number: row['License Number'] || row['License'] || row['Certification'] || null,
          
          // Social media
          instagram: this.parseInstagram(row['Instagram'] || row['Social Media'] || ''),
          
          // Experience
          years_experience: this.parseExperience(row),
          
          // Schedule (Booksy may export as JSON or text)
          schedule: this.parseSchedule(row),
          
          // Booksy-specific fields
          custom_fields: {
            // Performance metrics
            average_rating: parseFloat(row['Average Rating'] || row['Rating'] || '0'),
            total_reviews: parseInt(row['Review Count'] || row['Reviews'] || '0'),
            total_bookings: parseInt(row['Total Bookings'] || row['Appointments'] || '0'),
            rebooking_rate: parseFloat(row['Rebooking Rate'] || '0'),
            
            // Availability
            online_booking: this.parseBoolean(row['Online Booking'] || row['Bookable Online']),
            accepts_walkins: this.parseBoolean(row['Accepts Walk-ins'] || row['Walk-ins']),
            
            // Service capabilities
            services_offered: row['Services'] || row['Service List'] || null,
            max_clients_per_day: parseInt(row['Max Clients'] || row['Daily Limit'] || '0'),
            
            // Financial performance
            revenue_generated: parseFloat(row['Revenue'] || row['Total Revenue'] || '0'),
            average_ticket: parseFloat(row['Average Ticket'] || row['Avg Sale'] || '0'),
            product_sales: parseFloat(row['Product Sales'] || '0'),
            
            // Client relationships
            regular_clients: parseInt(row['Regular Clients'] || row['Repeat Clients'] || '0'),
            new_clients_monthly: parseInt(row['New Clients'] || '0'),
            
            // Work preferences
            preferred_services: row['Preferred Services'] || null,
            languages_spoken: row['Languages'] || row['Languages Spoken'] || null,
            
            // Booksy-specific IDs and metadata
            booksy_id: row['Staff ID'] || row['Provider ID'] || null,
            booksy_profile_url: row['Profile URL'] || row['Booksy Link'] || null,
            portfolio_images: row['Portfolio'] || row['Gallery URLs'] || null,
            
            // Certifications and training
            certifications: row['Certifications'] || row['Training'] || null,
            specializations: row['Specializations'] || row['Advanced Skills'] || null
          },
          
          // Import metadata
          import_id: row['Staff ID'] || row['ID'] || null,
          created_at: this.parseDate(row['Created'] || row['Added']) || new Date().toISOString()
        }
        
        // Validate required fields
        if (!barber.name || barber.name.trim() === '') {
          errors.push({
            row: index + 2,
            field: 'name',
            message: 'Barber name is required'
          })
          return
        }
        
        // Handle profile photo
        if (barber.profile_photo_url) {
          const photoResult = this.validatePhotoUrl(barber.profile_photo_url)
          if (photoResult.needsDownload) {
            photoDownloads.push({
              row: index + 2,
              barber: barber.name,
              url: barber.profile_photo_url,
              type: photoResult.type
            })
            warnings.push({
              row: index + 2,
              message: `Profile photo may need to be downloaded and stored locally`,
              barber: barber.name
            })
          }
          if (photoResult.warning) {
            warnings.push({
              row: index + 2,
              message: photoResult.warning,
              barber: barber.name
            })
          }
        }
        
        // Warn about high performers (VIP barbers)
        if (barber.custom_fields.average_rating >= 4.8 && barber.custom_fields.total_reviews > 50) {
          warnings.push({
            row: index + 2,
            message: `High-performing barber: ${barber.custom_fields.average_rating}★ with ${barber.custom_fields.total_reviews} reviews`,
            barber: barber.name
          })
        }
        
        // Warn about inactive staff being imported
        if (!barber.active) {
          warnings.push({
            row: index + 2,
            message: 'Importing inactive staff member',
            barber: barber.name
          })
        }
        
        transformed.push(barber)
      } catch (error) {
        errors.push({
          row: index + 2,
          message: error.message,
          data: row
        })
      }
    })
    
    // Add summary of photos needing download
    if (photoDownloads.length > 0) {
      warnings.push({
        type: 'photo_downloads_needed',
        count: photoDownloads.length,
        message: `${photoDownloads.length} profile photos may need to be downloaded and stored`,
        photos: photoDownloads
      })
    }
    
    return { transformed, errors, warnings, photoDownloads }
  }

  /**
   * Process photo URL from various Booksy fields
   */
  processPhotoUrl(row) {
    // Try various photo field names
    const photoUrl = row['Photo URL'] || row['Profile Photo'] || row['Avatar'] || 
                     row['Image URL'] || row['Staff Photo'] || row['Picture'] || ''
    
    if (!photoUrl) return null
    
    // Handle Booksy CDN URLs
    if (photoUrl.includes('booksy-cdn') || photoUrl.includes('booksy.com')) {
      // Booksy URLs are typically direct and accessible
      return photoUrl
    }
    
    // Handle relative paths (might need Booksy domain prefix)
    if (photoUrl.startsWith('/')) {
      return `https://booksy.com${photoUrl}`
    }
    
    // Handle base64 encoded images
    if (photoUrl.startsWith('data:image')) {
      return photoUrl // Will need special handling to save
    }
    
    return photoUrl
  }

  /**
   * Validate photo URL and determine if download is needed
   */
  validatePhotoUrl(url) {
    if (!url) return { isValid: false }
    
    // Base64 images need conversion
    if (url.startsWith('data:image')) {
      return {
        isValid: true,
        type: 'base64',
        needsDownload: true,
        warning: 'Base64 image will need to be converted and stored'
      }
    }
    
    // Check if URL is from Booksy CDN (usually reliable)
    if (url.includes('booksy-cdn') || url.includes('booksy.com')) {
      return {
        isValid: true,
        type: 'booksy_cdn',
        needsDownload: false // Can hotlink to Booksy CDN
      }
    }
    
    // External URLs might need to be downloaded for reliability
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return {
        isValid: true,
        type: 'external',
        needsDownload: true,
        warning: 'External image should be downloaded to avoid broken links'
      }
    }
    
    return {
      isValid: false,
      warning: `Invalid photo URL format: ${url}`
    }
  }

  /**
   * Extract specialties from various fields
   */
  extractSpecialties(row) {
    const specialties = []
    
    // Direct specialties field
    if (row['Specialties']) {
      const items = row['Specialties'].split(/[,;]/).map(s => s.trim()).filter(s => s)
      specialties.push(...items)
    }
    
    // Services offered
    if (row['Services'] && !row['Specialties']) {
      const services = row['Services'].split(/[,;]/).map(s => s.trim()).filter(s => s)
      specialties.push(...services.slice(0, 5)) // Take top 5 services as specialties
    }
    
    // Skills field
    if (row['Skills']) {
      const skills = row['Skills'].split(/[,;]/).map(s => s.trim()).filter(s => s)
      specialties.push(...skills)
    }
    
    return specialties.length > 0 ? specialties : null
  }

  /**
   * Parse commission rate
   */
  parseCommission(value) {
    if (!value) return null
    
    const str = value.toString().replace('%', '').trim()
    const parsed = parseFloat(str)
    
    if (!isNaN(parsed)) {
      // If less than 1, assume decimal (0.5 = 50%)
      return parsed > 1 ? parsed : parsed * 100
    }
    
    return null
  }

  /**
   * Parse Instagram handle
   */
  parseInstagram(value) {
    if (!value) return null
    
    let handle = value.toString().trim()
    
    // Remove @ if present
    if (handle.startsWith('@')) {
      handle = handle.substring(1)
    }
    
    // Extract handle from URL
    if (handle.includes('instagram.com/')) {
      const match = handle.match(/instagram\.com\/([^/?]+)/)
      if (match) handle = match[1]
    }
    
    return handle || null
  }

  /**
   * Parse years of experience
   */
  parseExperience(row) {
    // Direct field
    if (row['Years Experience'] || row['Experience']) {
      const value = row['Years Experience'] || row['Experience']
      const num = parseInt(value)
      if (!isNaN(num)) return num
    }
    
    // Calculate from hire date if available
    if (row['Hire Date'] || row['Start Date']) {
      const hireDate = this.parseDate(row['Hire Date'] || row['Start Date'])
      if (hireDate) {
        const years = Math.floor((new Date() - new Date(hireDate)) / (365 * 24 * 60 * 60 * 1000))
        return years > 0 ? years : 1
      }
    }
    
    return null
  }

  /**
   * Parse schedule data
   */
  parseSchedule(row) {
    // Try various schedule field formats
    const schedule = row['Schedule'] || row['Working Hours'] || row['Availability'] || ''
    
    if (!schedule) return null
    
    // Check if it's JSON
    try {
      const parsed = JSON.parse(schedule)
      return parsed
    } catch (e) {
      // Not JSON, return as string
      return schedule
    }
  }

  /**
   * Parse boolean from various formats
   */
  parseBoolean(value) {
    if (!value) return false
    const v = value.toString().toLowerCase()
    return v === 'yes' || v === 'true' || v === '1' || v === 'on' || v === 'active'
  }
}

export default BooksyAdapter