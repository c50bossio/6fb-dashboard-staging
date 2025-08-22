/**
 * Acuity Scheduling Data Adapter
 * 
 * Handles data transformation from Acuity Scheduling CSV exports to universal schema.
 * Acuity (by Squarespace) is a sophisticated platform with extensive data export options.
 * 
 * Export Format Notes:
 * - Clients export: Includes custom intake form responses
 * - Appointments export: Detailed with forms, packages, add-ons
 * - Services export: Complex pricing rules and availability
 * - Supports packages, memberships, gift certificates
 * - Includes intake form responses as custom fields
 * - Has robust timezone handling
 */

export class AcuityAdapter {
  constructor() {
    this.platform = 'acuity'
    this.version = '1.0.0'
  }

  /**
   * Get platform configuration
   */
  static getConfig() {
    return {
      platform: 'acuity',
      displayName: 'Acuity Scheduling',
      supportedEntities: ['customers', 'appointments', 'services'],
      limitations: [
        'Large exports may include extensive intake form data',
        'Timezone information must be preserved',
        'Package and membership data requires special handling'
      ],
      exportInstructions: [
        'Log in to your Acuity account',
        'Go to Business Settings > Export Data',
        'Select date range for appointments',
        'Include intake forms if needed',
        'Download CSV and upload here'
      ],
      expectedFileSize: '20-40MB',
      estimatedTime: '10-15 minutes'
    }
  }

  /**
   * Identify if a CSV file is from Acuity
   */
  static identify(headers, metadata = {}) {
    const acuityFields = [
      'First Name', 'Last Name', 'Phone', 'Email',
      'Appointment ID', 'Date', 'Time', 'Calendar',
      'Appointment Type', 'Duration', 'Price', 'Paid'
    ]
    
    const headerStr = headers.join(',').toLowerCase()
    const matchCount = acuityFields.filter(field => 
      headerStr.includes(field.toLowerCase())
    ).length
    
    return matchCount >= 6 // At least 6 Acuity-specific fields
  }

  /**
   * Detect entity type from CSV headers
   */
  detectEntityType(headers) {
    const headerStr = headers.join(',').toLowerCase()
    
    // Acuity-specific column patterns
    if (headerStr.includes('first name') && headerStr.includes('last name') && headerStr.includes('phone')) {
      return 'customers'
    }
    if (headerStr.includes('appointment id') || (headerStr.includes('start time') && headerStr.includes('end time'))) {
      return 'appointments'
    }
    if (headerStr.includes('appointment type') && headerStr.includes('duration') && !headerStr.includes('client')) {
      return 'services'
    }
    
    // Check for Acuity's specific terminology
    if (headerStr.includes('client')) {
      return 'customers'
    }
    if (headerStr.includes('calendar') && headerStr.includes('date')) {
      return 'appointments'
    }
    
    return 'unknown'
  }

  /**
   * Transform Acuity customers data
   */
  transformCustomers(data) {
    const transformed = []
    const errors = []
    const warnings = []
    
    data.forEach((row, index) => {
      try {
        // Combine first and last name
        const firstName = row['First Name'] || row['First'] || ''
        const lastName = row['Last Name'] || row['Last'] || ''
        const fullName = `${firstName} ${lastName}`.trim()
        
        const customer = {
          // Name (Acuity separates first/last)
          name: fullName || row['Name'] || row['Client Name'] || '',
          
          // Contact info
          email: this.normalizeEmail(row['Email'] || row['E-mail'] || ''),
          phone: this.normalizePhone(row['Phone'] || row['Phone Number'] || ''),
          
          // Address fields (Acuity has structured address)
          address: this.buildAddress(row),
          
          // Birthday
          birthdate: this.parseDate(row['Birthday'] || row['Date of Birth'] || row['DOB']),
          
          // Notes (may include intake form responses)
          notes: this.buildNotes(row),
          
          // Tags
          tags: this.extractTags(row),
          
          // Acuity-specific fields and intake form data
          custom_fields: {
            // Basic info
            first_name: firstName,
            last_name: lastName,
            timezone: row['Timezone'] || row['Time Zone'] || null,
            preferred_language: row['Language'] || null,
            
            // Intake form responses (Acuity stores these in various columns)
            intake_form_responses: this.extractIntakeFormData(row),
            
            // Consent and preferences
            accepts_sms: this.parseBoolean(row['Accepts SMS'] || row['Text Reminders']),
            accepts_emails: this.parseBoolean(row['Accepts Marketing Emails'] || row['Email Reminders']),
            consent_to_treat: this.parseBoolean(row['Consent to Treat']),
            photo_consent: this.parseBoolean(row['Photo Release']),
            
            // Client history
            first_appointment: this.parseDate(row['First Appointment Date']),
            last_appointment: this.parseDate(row['Last Appointment Date']),
            total_appointments: parseInt(row['Total Appointments'] || row['Appointment Count'] || '0'),
            no_show_count: parseInt(row['No Shows'] || '0'),
            cancellation_count: parseInt(row['Cancellations'] || '0'),
            
            // Financial
            total_spent: parseFloat(row['Total Spent'] || row['Lifetime Value'] || '0'),
            outstanding_balance: parseFloat(row['Balance'] || row['Amount Owed'] || '0'),
            
            // Packages and certificates
            packages: row['Packages'] || row['Package Balance'] || null,
            gift_certificates: row['Gift Certificates'] || row['Certificate Balance'] || null,
            membership_id: row['Membership'] || row['Subscription'] || null,
            
            // Emergency and medical
            emergency_contact_name: row['Emergency Contact'] || row['Emergency Name'] || null,
            emergency_contact_phone: row['Emergency Phone'] || null,
            medical_conditions: row['Medical Conditions'] || row['Health Concerns'] || null,
            allergies: row['Allergies'] || row['Sensitivities'] || null,
            medications: row['Medications'] || row['Current Medications'] || null,
            
            // Referral and marketing
            referral_source: row['How did you hear about us?'] || row['Referral Source'] || null,
            referred_by: row['Referred By'] || row['Referrer Name'] || null,
            
            // Additional Acuity fields
            pronouns: row['Pronouns'] || null,
            occupation: row['Occupation'] || null,
            insurance_info: row['Insurance'] || null
          },
          
          // Import metadata
          import_id: row['Client ID'] || row['ID'] || null,
          created_at: this.parseDate(row['Created Date'] || row['Added Date']) || new Date().toISOString()
        }
        
        // Validate required fields
        if (!customer.name || customer.name.trim() === '') {
          errors.push({
            row: index + 2,
            field: 'name',
            message: 'Customer name is required',
            value: `${firstName} ${lastName}`
          })
          return
        }
        
        // Warnings for important missing data
        if (!customer.email && !customer.phone) {
          warnings.push({
            row: index + 2,
            message: 'No contact information (email or phone)',
            customer: customer.name
          })
        }
        
        // Flag VIP customers
        if (customer.custom_fields.total_spent > 2000) {
          warnings.push({
            row: index + 2,
            message: `VIP customer: $${customer.custom_fields.total_spent} lifetime value`,
            customer: customer.name
          })
        }
        
        // Flag customers with high no-show rate
        if (customer.custom_fields.no_show_count > 3) {
          warnings.push({
            row: index + 2,
            message: `High no-show rate: ${customer.custom_fields.no_show_count} no-shows`,
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
   * Transform Acuity appointments data
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
        // Parse dates and times (Acuity uses full datetime)
        const startDatetime = this.parseDatetime(row['Start Time'] || row['Start'])
        const endDatetime = this.parseDatetime(row['End Time'] || row['End'])
        
        if (!startDatetime) {
          errors.push({
            row: index + 2,
            field: 'datetime',
            message: 'Invalid or missing appointment start time'
          })
          return
        }
        
        // Calculate duration from start/end
        const duration = endDatetime && startDatetime ? 
          Math.round((new Date(endDatetime) - new Date(startDatetime)) / 60000) : 
          parseInt(row['Duration'] || '60')
        
        const appointment = {
          // Date and time
          date: startDatetime.split('T')[0],
          time: startDatetime.split('T')[1]?.substring(0, 5) || '00:00',
          datetime: startDatetime,
          end_datetime: endDatetime,
          duration: duration,
          
          // Timezone (Acuity handles multiple timezones)
          timezone: row['Timezone'] || row['Time Zone'] || 'America/New_York',
          
          // Service info
          service_name: row['Appointment Type'] || row['Service'] || row['Type'] || '',
          service_id: null, // Will need resolution
          
          // Customer info
          customer_name: this.buildCustomerName(row),
          customer_email: this.normalizeEmail(row['Email'] || row['Client Email'] || ''),
          customer_phone: this.normalizePhone(row['Phone'] || row['Client Phone'] || ''),
          customer_id: null, // Will need resolution
          
          // Staff/Calendar (Acuity uses calendars)
          staff_name: row['Calendar'] || row['Practitioner'] || row['Staff'] || '',
          staff_id: null, // Will need resolution
          
          // Location (Acuity supports multiple locations)
          location: row['Location'] || row['Office'] || null,
          
          // Status
          status: this.mapStatus(row['Status'] || row['Appointment Status'] || 'confirmed'),
          
          // Financial
          price: parseFloat(row['Price'] || row['Amount'] || row['Total'] || '0'),
          paid: this.parsePaidAmount(row),
          payment_method: row['Payment Method'] || null,
          tip: parseFloat(row['Tip'] || row['Gratuity'] || '0'),
          
          // Add-ons and packages
          addons: row['Add-ons'] || row['Extras'] || null,
          package_name: row['Package'] || row['Series'] || null,
          certificate_code: row['Certificate'] || row['Gift Certificate'] || null,
          
          // Notes and labels
          notes: row['Notes'] || row['Appointment Notes'] || '',
          labels: row['Labels'] || row['Tags'] || null,
          
          // Intake forms (Acuity feature)
          intake_forms_completed: this.parseBoolean(row['Forms Completed']),
          intake_form_responses: this.extractIntakeFormData(row),
          
          // Acuity-specific fields
          custom_fields: {
            confirmation_page_viewed: this.parseBoolean(row['Confirmed']),
            rescheduled_from: row['Rescheduled From'] || null,
            cancellation_reason: row['Cancellation Reason'] || null,
            no_show_reason: row['No Show Reason'] || null,
            
            // Scheduling metadata
            scheduled_online: this.parseBoolean(row['Scheduled Online'] !== 'false'),
            scheduling_url: row['Scheduling Link'] || null,
            confirmation_code: row['Confirmation Code'] || row['Confirmation #'] || null,
            
            // Reminders
            reminder_sent: this.parseBoolean(row['Reminder Sent']),
            reminder_time: row['Reminder Time'] || null,
            followup_sent: this.parseBoolean(row['Follow-up Sent']),
            
            // Class/group appointments
            class_size: parseInt(row['Class Size'] || row['Spots'] || '1'),
            attendees: row['Attendees'] || null,
            waitlist: row['Waitlist'] || null,
            
            // Resources
            room: row['Room'] || row['Resource'] || null,
            equipment: row['Equipment'] || null,
            
            // Color coding (visual organization)
            color: row['Color'] || row['Label Color'] || null,
            
            // API/Integration data
            external_id: row['External ID'] || null,
            source: row['Source'] || row['Booking Source'] || 'acuity',
            
            // Invoice/Receipt
            invoice_number: row['Invoice #'] || row['Receipt #'] || null,
            invoice_sent: this.parseBoolean(row['Invoice Sent'])
          },
          
          // Import metadata
          import_id: row['Appointment ID'] || row['ID'] || null,
          created_at: this.parseDate(row['Scheduled On'] || row['Created']) || new Date().toISOString()
        }
        
        // Track entities needing resolution
        if (appointment.customer_name && !appointment.customer_id) {
          needsResolution.customers.add(appointment.customer_name)
        }
        if (appointment.service_name && !appointment.service_id) {
          needsResolution.services.add(appointment.service_name)
        }
        if (appointment.staff_name && !appointment.staff_id) {
          needsResolution.staff.add(appointment.staff_name)
        }
        
        // Warnings
        if (!appointment.customer_name) {
          warnings.push({
            row: index + 2,
            message: 'Appointment has no customer'
          })
        }
        
        if (appointment.status === 'no_show') {
          warnings.push({
            row: index + 2,
            message: `No-show: ${appointment.customer_name} on ${appointment.date}`,
            amount_lost: appointment.price
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
    
    // Add resolution warnings
    if (needsResolution.customers.size > 0) {
      warnings.push({
        type: 'resolution_needed',
        entity: 'customers',
        count: needsResolution.customers.size,
        message: `${needsResolution.customers.size} customers need matching`
      })
    }
    
    return { transformed, errors, warnings, needsResolution }
  }

  /**
   * Transform Acuity services data
   */
  transformServices(data) {
    const transformed = []
    const errors = []
    const warnings = []
    
    data.forEach((row, index) => {
      try {
        const service = {
          // Basic info
          name: row['Name'] || row['Appointment Type'] || row['Service Name'] || '',
          description: row['Description'] || row['Details'] || '',
          
          // Duration and scheduling
          duration: this.parseDuration(row['Duration'] || row['Default Duration'] || '60'),
          
          // Pricing (Acuity has complex pricing)
          price: this.parsePrice(row),
          
          // Category/Type
          category: row['Category'] || row['Type'] || row['Service Category'] || 'General',
          
          // Availability
          active: this.parseBoolean(row['Active'] !== 'false' && row['Available'] !== 'false'),
          
          // Acuity-specific fields
          custom_fields: {
            // Scheduling rules
            buffer_before: parseInt(row['Buffer Before'] || row['Padding Before'] || '0'),
            buffer_after: parseInt(row['Buffer After'] || row['Padding After'] || '0'),
            minimum_notice: parseInt(row['Minimum Scheduling Notice'] || '0'),
            maximum_advance: parseInt(row['Maximum Advance Scheduling'] || '0'),
            
            // Availability windows
            availability_start: row['Available From'] || null,
            availability_end: row['Available Until'] || null,
            days_available: row['Available Days'] || null,
            times_available: row['Available Times'] || null,
            
            // Capacity (for classes/groups)
            max_attendees: parseInt(row['Max Attendees'] || row['Class Size'] || '1'),
            min_attendees: parseInt(row['Min Attendees'] || '1'),
            
            // Online/Zoom integration
            online_meeting: this.parseBoolean(row['Online'] || row['Virtual']),
            meeting_url: row['Meeting URL'] || row['Zoom Link'] || null,
            
            // Forms and requirements
            intake_forms: row['Intake Forms'] || row['Required Forms'] || null,
            requires_deposit: this.parseBoolean(row['Deposit Required']),
            deposit_amount: parseFloat(row['Deposit Amount'] || '0'),
            
            // Cancellation policy
            cancellation_policy: row['Cancellation Policy'] || null,
            cancellation_window: parseInt(row['Cancellation Window'] || '24'),
            
            // Staff assignment
            assigned_staff: row['Assigned To'] || row['Practitioners'] || null,
            any_staff: this.parseBoolean(row['Any Staff'] || row['Any Practitioner']),
            
            // Color and display
            color: row['Color'] || row['Display Color'] || null,
            image_url: row['Image'] || row['Photo URL'] || null,
            
            // Pricing variations
            price_type: row['Price Type'] || 'fixed', // fixed, variable, free
            variable_pricing: row['Variable Pricing'] || null,
            member_price: parseFloat(row['Member Price'] || '0'),
            
            // Package/Series options
            package_pricing: row['Package Pricing'] || null,
            series_pricing: row['Series Pricing'] || null,
            
            // Add-ons
            available_addons: row['Add-ons'] || row['Extras'] || null,
            
            // Tax and payment
            taxable: this.parseBoolean(row['Taxable'] !== 'false'),
            payment_required: this.parseBoolean(row['Payment Required']),
            accept_tips: this.parseBoolean(row['Accept Tips'] !== 'false'),
            
            // Resources required
            resources_needed: row['Resources'] || row['Equipment'] || null,
            room_required: row['Room'] || row['Location'] || null,
            
            // SEO and marketing
            seo_description: row['SEO Description'] || null,
            keywords: row['Keywords'] || row['Tags'] || null,
            
            // Sorting and display
            sort_order: parseInt(row['Sort Order'] || row['Display Order'] || '0'),
            hidden: this.parseBoolean(row['Hidden'] || row['Private']),
            
            // API data
            external_id: row['External ID'] || null,
            api_accessible: this.parseBoolean(row['API Accessible'] !== 'false')
          },
          
          // Import metadata
          import_id: row['Service ID'] || row['Type ID'] || row['ID'] || null,
          created_at: this.parseDate(row['Created']) || new Date().toISOString()
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
        
        // Warnings
        if (service.duration > 480) {
          warnings.push({
            row: index + 2,
            message: `Very long service: ${service.duration} minutes`,
            service: service.name
          })
        }
        
        if (service.price === 0 && service.custom_fields.price_type === 'fixed') {
          warnings.push({
            row: index + 2,
            message: 'Service has no price set',
            service: service.name
          })
        }
        
        if (service.custom_fields.requires_deposit && !service.custom_fields.deposit_amount) {
          warnings.push({
            row: index + 2,
            message: 'Deposit required but no amount specified',
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
   * Build customer name from Acuity fields
   */
  buildCustomerName(row) {
    const firstName = row['First Name'] || row['Client First Name'] || ''
    const lastName = row['Last Name'] || row['Client Last Name'] || ''
    const fullName = `${firstName} ${lastName}`.trim()
    
    return fullName || row['Client'] || row['Client Name'] || row['Name'] || ''
  }

  /**
   * Build address from Acuity structured fields
   */
  buildAddress(row) {
    const parts = []
    
    // Street address
    if (row['Address']) {
      parts.push(row['Address'])
    } else {
      if (row['Street Address']) parts.push(row['Street Address'])
      if (row['Address Line 2']) parts.push(row['Address Line 2'])
    }
    
    // City, State, Zip
    const cityStateZip = []
    if (row['City']) cityStateZip.push(row['City'])
    if (row['State'] || row['Province']) cityStateZip.push(row['State'] || row['Province'])
    if (row['Zip'] || row['Postal Code']) cityStateZip.push(row['Zip'] || row['Postal Code'])
    
    if (cityStateZip.length > 0) {
      parts.push(cityStateZip.join(', '))
    }
    
    // Country
    if (row['Country'] && row['Country'] !== 'United States' && row['Country'] !== 'US') {
      parts.push(row['Country'])
    }
    
    return parts.join(', ') || null
  }

  /**
   * Build notes from various Acuity fields
   */
  buildNotes(row) {
    const notes = []
    
    if (row['Notes']) notes.push(row['Notes'])
    if (row['Admin Notes']) notes.push(`Admin: ${row['Admin Notes']}`)
    if (row['Special Instructions']) notes.push(`Instructions: ${row['Special Instructions']}`)
    
    return notes.join('\n') || null
  }

  /**
   * Extract intake form data from row
   */
  extractIntakeFormData(row) {
    const intakeData = {}
    
    // Acuity exports intake form responses as individual columns
    // Look for columns that appear to be form responses
    Object.keys(row).forEach(key => {
      // Skip known non-form fields
      const skipFields = ['ID', 'First Name', 'Last Name', 'Email', 'Phone', 'Created', 'Modified']
      if (!skipFields.includes(key) && row[key]) {
        // Check if this looks like a form question (usually longer keys)
        if (key.includes('?') || key.length > 20 || key.includes(':')) {
          intakeData[key] = row[key]
        }
      }
    })
    
    return Object.keys(intakeData).length > 0 ? intakeData : null
  }

  /**
   * Extract tags from various fields
   */
  extractTags(row) {
    const tags = []
    
    // Labels/Tags
    if (row['Labels'] || row['Tags']) {
      const labelStr = row['Labels'] || row['Tags']
      const labels = labelStr.split(/[,;]/).map(t => t.trim()).filter(t => t)
      tags.push(...labels)
    }
    
    // Client type
    if (row['Client Type']) {
      tags.push(`type:${row['Client Type'].toLowerCase()}`)
    }
    
    // VIP status
    if (row['VIP'] === 'Yes' || row['VIP'] === 'true') {
      tags.push('vip')
    }
    
    // Membership
    if (row['Membership'] && row['Membership'] !== 'None') {
      tags.push(`member:${row['Membership'].toLowerCase()}`)
    }
    
    // Source
    if (row['Source'] || row['Referral Source']) {
      const source = row['Source'] || row['Referral Source']
      if (source !== 'Unknown') {
        tags.push(`source:${source.toLowerCase()}`)
      }
    }
    
    return tags.length > 0 ? tags : null
  }

  /**
   * Parse price from various Acuity price fields
   */
  parsePrice(row) {
    // Try various price field names
    const price = row['Price'] || row['Default Price'] || row['Amount'] || row['Cost'] || '0'
    
    // Handle price ranges (e.g., "$50-$100")
    if (typeof price === 'string' && price.includes('-')) {
      const parts = price.replace(/[^0-9.-]/g, '').split('-')
      return parseFloat(parts[0]) || 0
    }
    
    return parseFloat(price.toString().replace(/[^0-9.-]/g, '')) || 0
  }

  /**
   * Parse paid amount from payment fields
   */
  parsePaidAmount(row) {
    const paid = row['Paid'] || row['Amount Paid'] || row['Payment'] || '0'
    
    if (typeof paid === 'string') {
      // Check for "Paid" or "Yes" values
      if (paid.toLowerCase() === 'paid' || paid.toLowerCase() === 'yes') {
        return parseFloat(row['Price'] || row['Amount'] || '0')
      }
    }
    
    return parseFloat(paid.toString().replace(/[^0-9.-]/g, '')) || 0
  }

  /**
   * Parse datetime from Acuity format
   */
  parseDatetime(datetimeStr) {
    if (!datetimeStr) return null
    
    // Acuity uses ISO format or "YYYY-MM-DD HH:MM:SS" format
    const date = new Date(datetimeStr)
    if (!isNaN(date.getTime())) {
      return date.toISOString()
    }
    
    // Try parsing "MM/DD/YYYY HH:MM AM/PM" format
    const match = datetimeStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})\s*(AM|PM)?/i)
    if (match) {
      let hours = parseInt(match[4])
      const minutes = parseInt(match[5])
      const period = match[6]
      
      if (period) {
        if (period.toUpperCase() === 'PM' && hours !== 12) {
          hours += 12
        } else if (period.toUpperCase() === 'AM' && hours === 12) {
          hours = 0
        }
      }
      
      const isoDate = `${match[3]}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`
      const isoTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`
      return `${isoDate}T${isoTime}`
    }
    
    return null
  }

  /**
   * Map Acuity status to universal status
   */
  mapStatus(acuityStatus) {
    const status = acuityStatus.toLowerCase()
    
    const statusMap = {
      'scheduled': 'confirmed',
      'confirmed': 'confirmed',
      'completed': 'completed',
      'canceled': 'cancelled',
      'cancelled': 'cancelled',
      'no-show': 'no_show',
      'no show': 'no_show',
      'rescheduled': 'rescheduled',
      'pending': 'pending',
      'waitlist': 'waitlisted'
    }
    
    return statusMap[status] || 'pending'
  }

  /**
   * Parse duration from various formats
   */
  parseDuration(duration) {
    if (!duration) return 60
    
    // If already a number, assume minutes
    const num = parseInt(duration)
    if (!isNaN(num)) return num
    
    // Parse "1 hour 30 minutes" format
    let totalMinutes = 0
    const hours = duration.match(/(\d+)\s*h(our)?/i)
    const minutes = duration.match(/(\d+)\s*m(in(ute)?)?/i)
    
    if (hours) totalMinutes += parseInt(hours[1]) * 60
    if (minutes) totalMinutes += parseInt(minutes[1])
    
    return totalMinutes || 60
  }

  /**
   * Parse date from various formats
   */
  parseDate(dateStr) {
    if (!dateStr) return null
    
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
   * Parse boolean from various formats
   */
  parseBoolean(value) {
    if (!value) return false
    const v = value.toString().toLowerCase()
    return v === 'yes' || v === 'true' || v === '1' || v === 'on' || v === 'checked'
  }
}

export default AcuityAdapter