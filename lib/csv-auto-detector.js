/**
 * Smart CSV Auto-Detection System
 * Automatically detects what type of data is in a CSV file
 */

export function analyzeCSV(headers, rows) {
  const analysis = {
    detectedPlatform: null,
    dataTypes: {
      hasCustomers: false,
      hasAppointments: false,
      hasServices: false
    },
    statistics: {
      totalRows: rows.length,
      uniqueCustomers: 0,
      uniqueServices: 0,
      dateRange: null
    },
    columnMapping: {},
    confidence: 0
  }

  // Normalize headers for comparison
  const normalizedHeaders = headers.map(h => h.toLowerCase().trim())
  
  // Platform Detection - Check more specific patterns first
  if (normalizedHeaders.some(h => h.includes('trafft'))) {
    analysis.detectedPlatform = 'trafft'
  } else if (normalizedHeaders.includes('customer email') && 
             normalizedHeaders.includes('employee') && 
             normalizedHeaders.includes('service duration')) {
    // Trafft uses "Employee" instead of "Staff" and includes "Service Duration"
    analysis.detectedPlatform = 'trafft'
  } else if (normalizedHeaders.includes('client name') && normalizedHeaders.includes('appointment type')) {
    analysis.detectedPlatform = 'acuity'
  } else if (normalizedHeaders.includes('client name') && normalizedHeaders.includes('first visit')) {
    analysis.detectedPlatform = 'booksy'
  } else if (normalizedHeaders.some(h => h.includes('square')) || 
      (normalizedHeaders.includes('customer name') && normalizedHeaders.includes('item name'))) {
    // Square uses "Item Name" for services
    analysis.detectedPlatform = 'square'
  } else if (normalizedHeaders.includes('customer name') && normalizedHeaders.includes('service')) {
    // Generic pattern - could be various platforms
    analysis.detectedPlatform = 'generic'
  }

  // Customer Data Detection
  const customerColumns = {
    name: headers.find(h => /customer name|client name|name/i.test(h)),
    email: headers.find(h => /email|e-mail/i.test(h)),
    phone: headers.find(h => /phone|mobile|cell/i.test(h)),
    address: headers.find(h => /address|street/i.test(h))
  }

  if (customerColumns.name && (customerColumns.email || customerColumns.phone)) {
    analysis.dataTypes.hasCustomers = true
    analysis.columnMapping.customers = customerColumns
    
    // Count unique customers
    const customerNames = new Set()
    rows.forEach(row => {
      const name = row[headers.indexOf(customerColumns.name)]
      if (name) customerNames.add(name)
    })
    analysis.statistics.uniqueCustomers = customerNames.size
  }

  // Appointment Data Detection
  const appointmentColumns = {
    date: headers.find(h => /date|when|day/i.test(h)),
    time: headers.find(h => /time|start|begin/i.test(h)),
    service: headers.find(h => /service|appointment type|treatment/i.test(h)),
    staff: headers.find(h => /staff|barber|stylist|provider/i.test(h)),
    status: headers.find(h => /status|state|completed/i.test(h))
  }

  if (appointmentColumns.date && appointmentColumns.service) {
    analysis.dataTypes.hasAppointments = true
    analysis.columnMapping.appointments = appointmentColumns
    
    // Find date range
    const dates = rows
      .map(row => row[headers.indexOf(appointmentColumns.date)])
      .filter(date => date)
      .map(date => new Date(date))
      .filter(date => !isNaN(date))
    
    if (dates.length > 0) {
      analysis.statistics.dateRange = {
        earliest: new Date(Math.min(...dates)),
        latest: new Date(Math.max(...dates))
      }
    }
  }

  // Service Data Detection
  const serviceColumns = {
    name: headers.find(h => /service|item name|treatment|appointment type/i.test(h)),
    price: headers.find(h => /price|cost|fee|amount/i.test(h)),
    duration: headers.find(h => /duration|length|time|minutes/i.test(h))
  }

  if (serviceColumns.name && (serviceColumns.price || serviceColumns.duration)) {
    analysis.dataTypes.hasServices = true
    analysis.columnMapping.services = serviceColumns
    
    // Count unique services
    const serviceNames = new Set()
    rows.forEach(row => {
      const service = row[headers.indexOf(serviceColumns.name)]
      if (service) serviceNames.add(service)
    })
    analysis.statistics.uniqueServices = serviceNames.size
  }

  // Calculate confidence score
  let confidence = 0
  if (analysis.detectedPlatform) confidence += 30
  if (analysis.dataTypes.hasCustomers) confidence += 25
  if (analysis.dataTypes.hasAppointments) confidence += 25
  if (analysis.dataTypes.hasServices) confidence += 20
  analysis.confidence = Math.min(confidence, 100)

  return analysis
}

/**
 * Generate import summary for user
 */
export function generateImportSummary(analysis) {
  const summary = []
  
  if (analysis.detectedPlatform) {
    summary.push(`📊 Detected platform: ${analysis.detectedPlatform}`)
  }
  
  summary.push(`📈 Found ${analysis.statistics.totalRows} records`)
  
  if (analysis.dataTypes.hasCustomers) {
    summary.push(`👥 ${analysis.statistics.uniqueCustomers} unique customers`)
  }
  
  if (analysis.dataTypes.hasAppointments && analysis.statistics.dateRange) {
    const months = Math.round(
      (analysis.statistics.dateRange.latest - analysis.statistics.dateRange.earliest) / 
      (1000 * 60 * 60 * 24 * 30)
    )
    summary.push(`📅 ${months} months of appointment history`)
  }
  
  if (analysis.dataTypes.hasServices) {
    summary.push(`✂️ ${analysis.statistics.uniqueServices} services`)
  }
  
  return summary
}

/**
 * Parse CSV string into headers and rows
 */
export function parseCSV(csvString) {
  const lines = csvString.trim().split('\n')
  const headers = lines[0].split(',').map(h => h.trim())
  const rows = lines.slice(1).map(line => {
    // Handle quoted values with commas
    const regex = /(".*?"|[^,]+)(?=\s*,|\s*$)/g
    const values = []
    let match
    while ((match = regex.exec(line)) !== null) {
      values.push(match[1].replace(/^"|"$/g, '').trim())
    }
    return values
  })
  
  return { headers, rows }
}