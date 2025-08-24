/**
 * Smart CSV Auto-Detection System
 * Automatically detects what type of data is in a CSV file
 */

import { platformImportConfigs } from './platform-import-configs.js'

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
  } else if (normalizedHeaders.includes('client name') && normalizedHeaders.includes('provider') && normalizedHeaders.includes('appointment date')) {
    analysis.detectedPlatform = 'schedulicity'
  } else if (normalizedHeaders.some(h => h.includes('schedulicity'))) {
    analysis.detectedPlatform = 'schedulicity'
  } else if (normalizedHeaders.some(h => h.includes('square')) || 
      (normalizedHeaders.includes('customer name') && normalizedHeaders.includes('item name'))) {
    // Square uses "Item Name" for services
    analysis.detectedPlatform = 'square'
  } else if (normalizedHeaders.includes('customer name') && normalizedHeaders.includes('service')) {
    // Generic pattern - could be various platforms
    analysis.detectedPlatform = 'generic'
  }

  // Customer Data Detection - Enhanced with more variations
  const customerColumns = {
    name: headers.find(h => /customer name|client name|patient name|member name|name/i.test(h)),
    email: headers.find(h => /email|e-mail|customer email|client email/i.test(h)),
    phone: headers.find(h => /phone|mobile|cell|customer phone|client phone/i.test(h)),
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

  // Appointment Data Detection - Enhanced with better date parsing
  const appointmentColumns = {
    date: headers.find(h => /date|when|day|appointment date|start date/i.test(h)),
    time: headers.find(h => /time|start|begin|appointment time/i.test(h)),
    service: headers.find(h => /service|appointment type|treatment|procedure|offering/i.test(h)),
    staff: headers.find(h => /staff|barber|stylist|provider|employee/i.test(h)),
    status: headers.find(h => /status|state|completed/i.test(h))
  }

  if (appointmentColumns.date && appointmentColumns.service) {
    analysis.dataTypes.hasAppointments = true
    analysis.columnMapping.appointments = appointmentColumns
    
    // Find date range with improved date parsing
    const dates = rows
      .map(row => row[headers.indexOf(appointmentColumns.date)])
      .filter(date => date)
      .map(date => {
        // Handle different date formats
        const dateStr = date.toString().trim()
        if (dateStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
          // MM/DD/YYYY or M/D/YYYY format
          return new Date(dateStr)
        } else if (dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
          // ISO format (YYYY-MM-DD)
          return new Date(dateStr)
        } else {
          // Try generic parsing
          return new Date(dateStr)
        }
      })
      .filter(date => !isNaN(date))
    
    if (dates.length > 0) {
      analysis.statistics.dateRange = {
        earliest: new Date(Math.min(...dates)),
        latest: new Date(Math.max(...dates))
      }
    }
  }

  // Service Data Detection - Enhanced with more variations
  const serviceColumns = {
    name: headers.find(h => /service|item name|treatment|appointment type|procedure|offering|service name/i.test(h)),
    price: headers.find(h => /price|cost|fee|amount|service price/i.test(h)),
    duration: headers.find(h => /duration|length|time|minutes|service duration/i.test(h))
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

  // Calculate confidence score with platform-specific boosts
  let confidence = 0
  
  // Platform detection confidence
  if (analysis.detectedPlatform) {
    confidence += 30
    
    // Platform-specific confidence boosts
    const platformValidation = validatePlatformData(analysis.detectedPlatform, normalizedHeaders)
    if (platformValidation.valid) {
      confidence += Math.min(platformValidation.confidence * 0.3, 20) // Up to 20 extra points
    }
  }
  
  // Data type confidence with column count bonuses
  if (analysis.dataTypes.hasCustomers) {
    confidence += 25
    // Bonus for multiple customer columns
    const customerColumnCount = Object.values(customerColumns).filter(col => col).length
    if (customerColumnCount >= 3) confidence += 5
  }
  
  if (analysis.dataTypes.hasAppointments) {
    confidence += 25
    // Bonus for multiple appointment columns
    const appointmentColumnCount = Object.values(appointmentColumns).filter(col => col).length
    if (appointmentColumnCount >= 4) confidence += 5
  }
  
  if (analysis.dataTypes.hasServices) {
    confidence += 20
    // Bonus for complete service data
    const serviceColumnCount = Object.values(serviceColumns).filter(col => col).length
    if (serviceColumnCount >= 2) confidence += 5
  }
  
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
  // Handle empty or invalid input
  if (!csvString || typeof csvString !== 'string') {
    return { headers: [], rows: [], data: [] }
  }
  
  // Normalize line endings (handle Windows \r\n, Mac \r, and Unix \n)
  const normalizedString = csvString.trim().replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = normalizedString.split('\n').filter(line => line.trim() !== '')
  
  // Handle empty file
  if (lines.length === 0) {
    return { headers: [], rows: [], data: [] }
  }
  
  // Parse headers using the same logic as data rows to handle quoted headers
  const headerLine = lines[0]
  const headerRegex = /(".*?"|[^,]+)(?=\s*,|\s*$)/g
  const headers = []
  let headerMatch
  while ((headerMatch = headerRegex.exec(headerLine)) !== null) {
    headers.push(headerMatch[1].replace(/^"|"$/g, '').trim())
  }
  
  // Handle case where regex doesn't match anything (malformed CSV)
  if (headers.length === 0 && headerLine) {
    // Fallback to simple split
    headers.push(...headerLine.split(',').map(h => h.trim().replace(/^"|"$/g, '')))
  }
  
  // Parse data rows
  const rows = lines.slice(1).map(line => {
    const regex = /(".*?"|[^,]+)(?=\s*,|\s*$)/g
    const values = []
    let match
    while ((match = regex.exec(line)) !== null) {
      values.push(match[1].replace(/^"|"$/g, '').trim())
    }
    // Fallback for malformed rows
    if (values.length === 0 && line) {
      values.push(...line.split(',').map(v => v.trim().replace(/^"|"$/g, '')))
    }
    return values
  })
  
  // Return with both 'rows' and 'data' for compatibility
  return { headers, rows, data: rows }
}

/**
 * Validate that detected platform matches expected column patterns
 */
export function validatePlatformData(platform, headers) {
  const config = platformImportConfigs[platform]
  if (!config) return { valid: false, confidence: 0 }
  
  let matchCount = 0
  let totalExpected = 0
  const normalizedHeaders = headers.map(h => h.toLowerCase().trim())
  
  // Check expected columns for each data type
  Object.values(config.dataDetection).forEach(expectedColumns => {
    totalExpected += expectedColumns.length
    expectedColumns.forEach(expectedCol => {
      const normalizedExpected = expectedCol.toLowerCase()
      if (normalizedHeaders.some(h => 
        h.includes(normalizedExpected) || 
        normalizedExpected.includes(h) ||
        // Handle variations like "Customer Name" vs "Client Name"
        (normalizedExpected.includes('customer') && h.includes('client')) ||
        (normalizedExpected.includes('client') && h.includes('customer'))
      )) {
        matchCount++
      }
    })
  })
  
  const confidence = totalExpected > 0 ? (matchCount / totalExpected) * 100 : 0
  return { 
    valid: confidence > 50, 
    confidence,
    matchCount,
    totalExpected
  }
}