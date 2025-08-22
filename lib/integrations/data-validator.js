/**
 * Data Validation for Import System
 * Validates imported data against schema requirements
 */

/**
 * Validate imported data
 * @param {Object} data - Data to validate
 * @returns {Object} Validation results
 */
export async function validateImportData(data) {
  const validationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    summary: {}
  }

  // Validate customers
  if (data.customers) {
    const customerValidation = validateCustomers(data.customers)
    validationResult.summary.customers = customerValidation.summary
    validationResult.errors.push(...customerValidation.errors)
    validationResult.warnings.push(...customerValidation.warnings)
    if (!customerValidation.isValid) {
      validationResult.isValid = false
    }
  }

  // Validate appointments
  if (data.appointments) {
    const appointmentValidation = validateAppointments(data.appointments)
    validationResult.summary.appointments = appointmentValidation.summary
    validationResult.errors.push(...appointmentValidation.errors)
    validationResult.warnings.push(...appointmentValidation.warnings)
    if (!appointmentValidation.isValid) {
      validationResult.isValid = false
    }
  }

  // Validate services
  if (data.services) {
    const serviceValidation = validateServices(data.services)
    validationResult.summary.services = serviceValidation.summary
    validationResult.errors.push(...serviceValidation.errors)
    validationResult.warnings.push(...serviceValidation.warnings)
    if (!serviceValidation.isValid) {
      validationResult.isValid = false
    }
  }

  // Validate products
  if (data.products) {
    const productValidation = validateProducts(data.products)
    validationResult.summary.products = productValidation.summary
    validationResult.errors.push(...productValidation.errors)
    validationResult.warnings.push(...productValidation.warnings)
    if (!productValidation.isValid) {
      validationResult.isValid = false
    }
  }

  // Validate staff
  if (data.staff) {
    const staffValidation = validateStaff(data.staff)
    validationResult.summary.staff = staffValidation.summary
    validationResult.errors.push(...staffValidation.errors)
    validationResult.warnings.push(...staffValidation.warnings)
    if (!staffValidation.isValid) {
      validationResult.isValid = false
    }
  }

  return validationResult
}

/**
 * Validate customer records
 */
function validateCustomers(customers) {
  const result = {
    isValid: true,
    errors: [],
    warnings: [],
    summary: {
      total: customers.length,
      valid: 0,
      invalid: 0,
      warnings: 0
    }
  }

  customers.forEach((customer, index) => {
    const recordErrors = []
    const recordWarnings = []

    // Required fields
    if (!customer.first_name || customer.first_name.trim() === '') {
      recordErrors.push(`Record ${index + 1}: Missing first name`)
    }
    if (!customer.last_name || customer.last_name.trim() === '') {
      recordErrors.push(`Record ${index + 1}: Missing last name`)
    }

    // At least one contact method required
    if (!customer.email && !customer.phone) {
      recordErrors.push(`Record ${index + 1}: Must have either email or phone`)
    }

    // Validate email format
    if (customer.email && !isValidEmail(customer.email)) {
      recordErrors.push(`Record ${index + 1}: Invalid email format: ${customer.email}`)
    }

    // Validate phone format
    if (customer.phone && !isValidPhone(customer.phone)) {
      recordWarnings.push(`Record ${index + 1}: Phone number may be invalid: ${customer.phone}`)
    }

    // Validate date of birth
    if (customer.date_of_birth && !isValidDate(customer.date_of_birth)) {
      recordWarnings.push(`Record ${index + 1}: Invalid date of birth format`)
    }

    // Check for data quality
    if (customer.first_name && customer.first_name.length === 1) {
      recordWarnings.push(`Record ${index + 1}: First name might be an initial`)
    }

    // Update counts
    if (recordErrors.length > 0) {
      result.errors.push(...recordErrors)
      result.summary.invalid++
      result.isValid = false
    } else if (recordWarnings.length > 0) {
      result.warnings.push(...recordWarnings)
      result.summary.warnings++
      result.summary.valid++
    } else {
      result.summary.valid++
    }
  })

  return result
}

/**
 * Validate appointment records
 */
function validateAppointments(appointments) {
  const result = {
    isValid: true,
    errors: [],
    warnings: [],
    summary: {
      total: appointments.length,
      valid: 0,
      invalid: 0,
      warnings: 0,
      futureAppointments: 0,
      pastAppointments: 0
    }
  }

  const now = new Date()

  appointments.forEach((appointment, index) => {
    const recordErrors = []
    const recordWarnings = []

    // Required fields
    if (!appointment.customer_email) {
      recordErrors.push(`Record ${index + 1}: Missing customer email`)
    }
    if (!appointment.service_name) {
      recordErrors.push(`Record ${index + 1}: Missing service name`)
    }
    if (!appointment.start_time) {
      recordErrors.push(`Record ${index + 1}: Missing start time`)
    }
    if (!appointment.end_time) {
      recordErrors.push(`Record ${index + 1}: Missing end time`)
    }
    if (!appointment.status) {
      recordErrors.push(`Record ${index + 1}: Missing status`)
    }

    // Validate times
    if (appointment.start_time && appointment.end_time) {
      const start = new Date(appointment.start_time)
      const end = new Date(appointment.end_time)
      
      if (isNaN(start.getTime())) {
        recordErrors.push(`Record ${index + 1}: Invalid start time format`)
      }
      if (isNaN(end.getTime())) {
        recordErrors.push(`Record ${index + 1}: Invalid end time format`)
      }
      if (start >= end) {
        recordErrors.push(`Record ${index + 1}: Start time must be before end time`)
      }
      
      // Track future vs past
      if (start > now) {
        result.summary.futureAppointments++
      } else {
        result.summary.pastAppointments++
      }
    }

    // Validate duration
    if (appointment.duration_minutes) {
      if (appointment.duration_minutes < 5 || appointment.duration_minutes > 480) {
        recordWarnings.push(`Record ${index + 1}: Unusual duration: ${appointment.duration_minutes} minutes`)
      }
    }

    // Validate price
    if (appointment.price !== undefined && appointment.price < 0) {
      recordErrors.push(`Record ${index + 1}: Invalid price: ${appointment.price}`)
    }

    // Update counts
    if (recordErrors.length > 0) {
      result.errors.push(...recordErrors)
      result.summary.invalid++
      result.isValid = false
    } else if (recordWarnings.length > 0) {
      result.warnings.push(...recordWarnings)
      result.summary.warnings++
      result.summary.valid++
    } else {
      result.summary.valid++
    }
  })

  return result
}

/**
 * Validate service records
 */
function validateServices(services) {
  const result = {
    isValid: true,
    errors: [],
    warnings: [],
    summary: {
      total: services.length,
      valid: 0,
      invalid: 0,
      warnings: 0
    }
  }

  const serviceNames = new Set()

  services.forEach((service, index) => {
    const recordErrors = []
    const recordWarnings = []

    // Required fields
    if (!service.name || service.name.trim() === '') {
      recordErrors.push(`Record ${index + 1}: Missing service name`)
    }
    if (service.price === undefined || service.price === null) {
      recordErrors.push(`Record ${index + 1}: Missing price`)
    }
    if (!service.duration_minutes) {
      recordErrors.push(`Record ${index + 1}: Missing duration`)
    }

    // Check for duplicates
    if (service.name) {
      const normalizedName = service.name.toLowerCase().trim()
      if (serviceNames.has(normalizedName)) {
        recordWarnings.push(`Record ${index + 1}: Duplicate service name: ${service.name}`)
      }
      serviceNames.add(normalizedName)
    }

    // Validate price
    if (service.price !== undefined) {
      if (service.price < 0) {
        recordErrors.push(`Record ${index + 1}: Invalid price: ${service.price}`)
      } else if (service.price === 0) {
        recordWarnings.push(`Record ${index + 1}: Free service (price = 0)`)
      } else if (service.price > 1000) {
        recordWarnings.push(`Record ${index + 1}: Unusually high price: $${service.price}`)
      }
    }

    // Validate duration
    if (service.duration_minutes) {
      if (service.duration_minutes < 5) {
        recordErrors.push(`Record ${index + 1}: Duration too short: ${service.duration_minutes} minutes`)
      } else if (service.duration_minutes > 480) {
        recordWarnings.push(`Record ${index + 1}: Unusually long duration: ${service.duration_minutes} minutes`)
      }
    }

    // Update counts
    if (recordErrors.length > 0) {
      result.errors.push(...recordErrors)
      result.summary.invalid++
      result.isValid = false
    } else if (recordWarnings.length > 0) {
      result.warnings.push(...recordWarnings)
      result.summary.warnings++
      result.summary.valid++
    } else {
      result.summary.valid++
    }
  })

  return result
}

/**
 * Validate product records
 */
function validateProducts(products) {
  const result = {
    isValid: true,
    errors: [],
    warnings: [],
    summary: {
      total: products.length,
      valid: 0,
      invalid: 0,
      warnings: 0
    }
  }

  const productNames = new Set()
  const skus = new Set()

  products.forEach((product, index) => {
    const recordErrors = []
    const recordWarnings = []

    // Required fields
    if (!product.name || product.name.trim() === '') {
      recordErrors.push(`Record ${index + 1}: Missing product name`)
    }
    if (product.price === undefined || product.price === null) {
      recordErrors.push(`Record ${index + 1}: Missing price`)
    }

    // Check for duplicate names
    if (product.name) {
      const normalizedName = product.name.toLowerCase().trim()
      if (productNames.has(normalizedName)) {
        recordWarnings.push(`Record ${index + 1}: Duplicate product name: ${product.name}`)
      }
      productNames.add(normalizedName)
    }

    // Check for duplicate SKUs
    if (product.sku) {
      const normalizedSku = product.sku.toLowerCase().trim()
      if (skus.has(normalizedSku)) {
        recordErrors.push(`Record ${index + 1}: Duplicate SKU: ${product.sku}`)
      }
      skus.add(normalizedSku)
    }

    // Validate price
    if (product.price !== undefined) {
      if (product.price < 0) {
        recordErrors.push(`Record ${index + 1}: Invalid price: ${product.price}`)
      }
    }

    // Validate stock
    if (product.stock_quantity !== undefined) {
      if (product.stock_quantity < 0) {
        recordErrors.push(`Record ${index + 1}: Invalid stock quantity: ${product.stock_quantity}`)
      }
    }

    // Update counts
    if (recordErrors.length > 0) {
      result.errors.push(...recordErrors)
      result.summary.invalid++
      result.isValid = false
    } else if (recordWarnings.length > 0) {
      result.warnings.push(...recordWarnings)
      result.summary.warnings++
      result.summary.valid++
    } else {
      result.summary.valid++
    }
  })

  return result
}

/**
 * Validate staff records
 */
function validateStaff(staff) {
  const result = {
    isValid: true,
    errors: [],
    warnings: [],
    summary: {
      total: staff.length,
      valid: 0,
      invalid: 0,
      warnings: 0
    }
  }

  const emails = new Set()

  staff.forEach((member, index) => {
    const recordErrors = []
    const recordWarnings = []

    // Required fields
    if (!member.first_name || member.first_name.trim() === '') {
      recordErrors.push(`Record ${index + 1}: Missing first name`)
    }
    if (!member.last_name || member.last_name.trim() === '') {
      recordErrors.push(`Record ${index + 1}: Missing last name`)
    }
    if (!member.email) {
      recordErrors.push(`Record ${index + 1}: Missing email`)
    }

    // Check for duplicate emails
    if (member.email) {
      const normalizedEmail = member.email.toLowerCase().trim()
      if (emails.has(normalizedEmail)) {
        recordErrors.push(`Record ${index + 1}: Duplicate email: ${member.email}`)
      }
      emails.add(normalizedEmail)
      
      // Validate email format
      if (!isValidEmail(member.email)) {
        recordErrors.push(`Record ${index + 1}: Invalid email format: ${member.email}`)
      }
    }

    // Validate phone
    if (member.phone && !isValidPhone(member.phone)) {
      recordWarnings.push(`Record ${index + 1}: Phone number may be invalid: ${member.phone}`)
    }

    // Validate commission
    if (member.commission_percentage !== undefined) {
      if (member.commission_percentage < 0 || member.commission_percentage > 100) {
        recordErrors.push(`Record ${index + 1}: Invalid commission percentage: ${member.commission_percentage}`)
      }
    }

    // Update counts
    if (recordErrors.length > 0) {
      result.errors.push(...recordErrors)
      result.summary.invalid++
      result.isValid = false
    } else if (recordWarnings.length > 0) {
      result.warnings.push(...recordWarnings)
      result.summary.warnings++
      result.summary.valid++
    } else {
      result.summary.valid++
    }
  })

  return result
}

// Utility functions
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

function isValidPhone(phone) {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '')
  // Check if it's a valid US phone number (10 digits) or international (7-15 digits)
  return digits.length >= 7 && digits.length <= 15
}

function isValidDate(dateStr) {
  const date = new Date(dateStr)
  return !isNaN(date.getTime())
}

export default {
  validateImportData
}