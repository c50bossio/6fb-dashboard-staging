/**
 * Platform-Specific Data Parsers
 * Parses CSV/JSON data from different barbershop platforms
 */

import Papa from 'papaparse'

/**
 * Parse platform-specific data
 * @param {string} platform - Platform identifier
 * @param {string} fileContent - Raw file content
 * @param {Object} metadata - File metadata
 * @returns {Object} Parsed data
 */
export async function parsePlatformData(platform, fileContent, metadata = {}) {
  try {
    // Determine parser based on platform
    switch (platform) {
      case 'square':
        return parseSquareData(fileContent, metadata)
      case 'booksy':
        return parseBooksyData(fileContent, metadata)
      case 'schedulicity':
        return parseSchedulicityData(fileContent, metadata)
      case 'acuity':
        return parseAcuityData(fileContent, metadata)
      case 'trafft':
        return parseTrafftData(fileContent, metadata)
      case 'csv':
      default:
        return parseGenericCSV(fileContent, metadata)
    }
  } catch (error) {
    console.error(`Error parsing ${platform} data:`, error)
    return {
      error: error.message,
      data: null
    }
  }
}

/**
 * Parse Square Appointments data
 */
function parseSquareData(fileContent, metadata) {
  const result = {
    customers: [],
    appointments: [],
    services: [],
    products: [],
    staff: []
  }

  // Parse CSV
  const parsed = Papa.parse(fileContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim()
  })

  if (parsed.errors.length > 0) {
    console.warn('CSV parsing warnings:', parsed.errors)
  }

  // Determine data type based on headers
  const headers = Object.keys(parsed.data[0] || {})
  
  if (headers.includes('Given Name') || headers.includes('Customer ID')) {
    // Customer data
    result.customers = parsed.data.filter(row => 
      row['Given Name'] || row['Family Name'] || row['Email Address']
    )
  } else if (headers.includes('Appointment ID') || headers.includes('Service')) {
    // Appointment data
    result.appointments = parsed.data.filter(row => 
      row['Customer Name'] && row['Service']
    )
  } else if (headers.includes('Item Name') || headers.includes('Item ID')) {
    // Service/Product data
    parsed.data.forEach(row => {
      if (row['Item Type'] === 'SERVICE') {
        result.services.push(row)
      } else if (row['Item Type'] === 'PRODUCT') {
        result.products.push(row)
      } else if (row['Duration']) {
        // Assume service if has duration
        result.services.push(row)
      } else {
        // Default to product
        result.products.push(row)
      }
    })
  }

  return { data: result, error: null }
}

/**
 * Parse Booksy data
 */
function parseBooksyData(fileContent, metadata) {
  const result = {
    customers: [],
    appointments: [],
    services: [],
    products: [],
    staff: []
  }

  // Booksy often exports as JSON or specialized format
  try {
    // Try JSON first
    const jsonData = JSON.parse(fileContent)
    
    if (jsonData.clients) {
      result.customers = jsonData.clients
    }
    if (jsonData.appointments || jsonData.bookings) {
      result.appointments = jsonData.appointments || jsonData.bookings
    }
    if (jsonData.services) {
      result.services = jsonData.services
    }
    if (jsonData.staff || jsonData.employees) {
      result.staff = jsonData.staff || jsonData.employees
    }
    
    return { data: result, error: null }
  } catch (e) {
    // Fall back to CSV parsing
    const parsed = Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true
    })

    const headers = Object.keys(parsed.data[0] || {})
    
    if (headers.includes('Client Name') || headers.includes('Client Email')) {
      result.customers = parsed.data
    } else if (headers.includes('Booking ID') || headers.includes('Service')) {
      result.appointments = parsed.data
    } else if (headers.includes('Service Name')) {
      result.services = parsed.data
    }

    return { data: result, error: null }
  }
}

/**
 * Parse Schedulicity data
 */
function parseSchedulicityData(fileContent, metadata) {
  const result = {
    customers: [],
    appointments: [],
    services: [],
    products: [],
    staff: []
  }

  const parsed = Papa.parse(fileContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim()
  })

  const headers = Object.keys(parsed.data[0] || {})
  
  // Schedulicity uses specific header patterns
  if (headers.includes('First Name') && headers.includes('Last Name') && headers.includes('Email')) {
    // Client report
    result.customers = parsed.data.filter(row => row['Email'] || row['Mobile Phone'])
  } else if (headers.includes('Client Name') && headers.includes('Service Name')) {
    // Appointment report
    result.appointments = parsed.data.filter(row => row['Client Name'] && row['Service Name'])
  } else if (headers.includes('Service') && headers.includes('Price')) {
    // Service report
    result.services = parsed.data.filter(row => row['Service'])
  } else if (headers.includes('Provider Name') || headers.includes('Staff Name')) {
    // Staff report
    result.staff = parsed.data.filter(row => row['Provider Name'] || row['Staff Name'])
  }

  return { data: result, error: null }
}

/**
 * Parse Acuity Scheduling data
 */
function parseAcuityData(fileContent, metadata) {
  const result = {
    customers: [],
    appointments: [],
    services: [],
    products: [],
    staff: []
  }

  const parsed = Papa.parse(fileContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim()
  })

  const headers = Object.keys(parsed.data[0] || {})
  
  // Acuity specific headers
  if (headers.includes('First Name') && headers.includes('Last Name') && !headers.includes('Type')) {
    // Client export
    result.customers = parsed.data.filter(row => row['Email'])
  } else if (headers.includes('Client') && headers.includes('Type') && headers.includes('Calendar')) {
    // Appointment export
    result.appointments = parsed.data.filter(row => row['Client'] && row['Type'])
  } else if (headers.includes('Name') && headers.includes('Duration') && headers.includes('Price')) {
    // Service types export
    result.services = parsed.data.filter(row => row['Name'])
  }

  // Acuity often includes intake form data - filter it out
  result.appointments = result.appointments.map(apt => {
    const cleaned = {}
    Object.keys(apt).forEach(key => {
      // Skip intake form fields (usually start with "Form:" or are very long)
      if (!key.startsWith('Form:') && key.length < 50) {
        cleaned[key] = apt[key]
      }
    })
    return cleaned
  })

  return { data: result, error: null }
}

/**
 * Parse Trafft data
 */
function parseTrafftData(fileContent, metadata) {
  const result = {
    customers: [],
    appointments: [],
    services: [],
    products: [],
    staff: []
  }

  // Trafft can export as JSON or CSV
  try {
    // Try JSON first
    const jsonData = JSON.parse(fileContent)
    
    if (jsonData.customers) {
      result.customers = jsonData.customers
    }
    if (jsonData.appointments) {
      result.appointments = jsonData.appointments
    }
    if (jsonData.services) {
      result.services = jsonData.services
    }
    if (jsonData.employees) {
      result.staff = jsonData.employees
    }
    
    return { data: result, error: null }
  } catch (e) {
    // Fall back to CSV
    const parsed = Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true
    })

    const headers = Object.keys(parsed.data[0] || {})
    
    if (headers.some(h => h.includes('Customer')) && headers.some(h => h.includes('Email'))) {
      result.customers = parsed.data
    } else if (headers.includes('Appointment Date') || headers.includes('Service')) {
      result.appointments = parsed.data
    } else if (headers.some(h => h.includes('Service')) && headers.some(h => h.includes('Price'))) {
      result.services = parsed.data
    } else if (headers.includes('Employee') || headers.includes('Staff')) {
      result.staff = parsed.data
    }

    return { data: result, error: null }
  }
}

/**
 * Parse generic CSV data
 */
function parseGenericCSV(fileContent, metadata) {
  const result = {
    customers: [],
    appointments: [],
    services: [],
    products: [],
    staff: []
  }

  const parsed = Papa.parse(fileContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim().toLowerCase()
  })

  if (parsed.errors.length > 0 && parsed.errors.some(e => e.type === 'Delimiter')) {
    // Try with different delimiter
    const altParsed = Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
      delimiter: '\t' // Try tab delimiter
    })
    
    if (altParsed.errors.length < parsed.errors.length) {
      parsed.data = altParsed.data
    }
  }

  // Try to auto-detect data type based on headers
  const headers = Object.keys(parsed.data[0] || {})
  const headerString = headers.join(' ').toLowerCase()

  if (headerString.includes('customer') || headerString.includes('client') || 
      (headerString.includes('email') && headerString.includes('name'))) {
    // Likely customer data
    result.customers = parsed.data
  } else if (headerString.includes('appointment') || headerString.includes('booking') ||
             (headerString.includes('date') && headerString.includes('time'))) {
    // Likely appointment data
    result.appointments = parsed.data
  } else if (headerString.includes('service') || 
             (headerString.includes('price') && headerString.includes('duration'))) {
    // Likely service data
    result.services = parsed.data
  } else if (headerString.includes('product') || headerString.includes('item')) {
    // Likely product data
    result.products = parsed.data
  } else if (headerString.includes('staff') || headerString.includes('employee') ||
             headerString.includes('barber')) {
    // Likely staff data
    result.staff = parsed.data
  } else {
    // Unknown - return as is for manual mapping
    result.unknown = parsed.data
  }

  return { data: result, error: null }
}

/**
 * Detect platform from file content
 */
export function detectPlatform(fileContent, fileName = '') {
  const lowerFileName = fileName.toLowerCase()
  const contentSample = fileContent.substring(0, 1000).toLowerCase()

  // Check filename hints
  if (lowerFileName.includes('square')) return 'square'
  if (lowerFileName.includes('booksy')) return 'booksy'
  if (lowerFileName.includes('schedulicity')) return 'schedulicity'
  if (lowerFileName.includes('acuity')) return 'acuity'
  if (lowerFileName.includes('trafft')) return 'trafft'

  // Check content patterns
  if (contentSample.includes('square') || contentSample.includes('appointment id')) {
    return 'square'
  }
  if (contentSample.includes('booksy') || contentSample.includes('booking id')) {
    return 'booksy'
  }
  if (contentSample.includes('schedulicity') || contentSample.includes('provider name')) {
    return 'schedulicity'
  }
  if (contentSample.includes('acuity') || contentSample.includes('calendar')) {
    return 'acuity'
  }
  if (contentSample.includes('trafft')) {
    return 'trafft'
  }

  return 'csv' // Default to generic CSV
}

export default {
  parsePlatformData,
  detectPlatform
}