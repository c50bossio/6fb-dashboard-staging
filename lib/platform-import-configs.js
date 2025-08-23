/**
 * Platform-specific CSV import configurations
 * Based on actual export formats from each platform (2024-2025)
 * 
 * Export instructions verified through research:
 * - Square: Dashboard → Appointments → Settings → History → Export
 * - Booksy: In-app support chat required (no self-service export)
 * - Acuity: Reports → Export (appointments) & Clients → Import/export (clients)
 * - Trafft: Appointments → Export Data & Customers → Export Data (separate exports)
 * 
 * Last verified: August 2025
 */

export const platformImportConfigs = {
  square: {
    name: 'Square Appointments',
    icon: '🟦',
    description: 'Import from Square Appointments',
    importType: 'unified', // Single file contains all data
    exportInstructions: [
      'Sign in to Square Dashboard',
      'Go to Appointments (or Payments > Appointments) → Settings',
      'Navigate to History section',
      'Click Export to download appointment history as CSV',
      'For customers: Go to Customers section → Export'
    ],
    dataDetection: {
      // Auto-detect what data is in the CSV
      customers: ['Customer Name', 'Email', 'Phone'],
      appointments: ['Date', 'Time', 'Service', 'Staff'],
      services: ['Item Name', 'Price', 'Duration']
    },
    limitations: [
      'Cannot import future appointments directly',
      'Service source information not included in export',
      'Staff availability must be set up separately'
    ],
    dataMapping: {
      'Customer Name': ['first_name', 'last_name'],
      'Phone Number': 'phone',
      'Email': 'email',
      'Service': 'service_name',
      'Duration': 'duration_minutes',
      'Price': 'price',
      'Date': 'appointment_date',
      'Time': 'appointment_time',
      'Staff': 'staff_name',
      'Notes': 'notes'
    }
  },

  booksy: {
    name: 'Booksy',
    icon: '💈',
    description: 'Import from Booksy',
    importType: 'unified',
    exportInstructions: [
      'Click the "?" icon in the left menu of Booksy',
      'Click "Support" to start a live chat',
      'Request: "I need a copy of my client list and appointment history in CSV format"',
      'The support agent will send the file(s) in the chat',
      'Download and upload the CSV file(s) here'
    ],
    dataDetection: {
      customers: ['Client Name', 'Phone', 'Email'],
      appointments: ['Date', 'Service', 'Staff', 'Client'],
      services: ['Service Name', 'Duration', 'Price']
    },
    limitations: [
      'No direct CSV export - must request from support',
      'ICS import converts to "walk-in" appointments',
      'Financial data may not be included',
      'Photos and detailed notes may be lost'
    ],
    dataMapping: {
      'Client Name': ['first_name', 'last_name'],
      'Phone': 'phone',
      'Email': 'email',
      'First Visit': 'customer_since',
      'Last Visit': 'last_visit_date',
      'Total Visits': 'visit_count',
      'Total Spent': 'lifetime_value',
      'SUMMARY': 'appointment_title',
      'DTSTART': 'start_datetime',
      'DTEND': 'end_datetime',
      'DESCRIPTION': 'notes'
    }
  },

  acuity: {
    name: 'Acuity Scheduling',
    icon: '📅',
    description: 'Import from Acuity Scheduling',
    importType: 'multiple', // Appointments and clients export separately
    exportInstructions: [
      'For Appointments: Click Reports → Export → Select date range → Export appointments',
      'For Clients: Click Clients → Import/export → Export client list',
      'Select "All clients" from the dropdown when exporting clients',
      'You can include canceled appointments if needed',
      'Download both CSV files and upload them here'
    ],
    dataDetection: {
      customers: ['Client Name', 'Email', 'Phone'],
      appointments: ['Start Date and Time', 'Appointment Type', 'Client Name'],
      services: ['Appointment Type', 'Duration', 'Price']
    },
    limitations: [
      'Cannot update existing appointments (creates duplicates)',
      'No confirmation emails for imported appointments',
      'Timezone must match supported list exactly',
      'Files limited to 1000 appointments or 5000 clients'
    ],
    dataMapping: {
      'Start Date and Time': 'start_datetime',
      'End Date and Time': 'end_datetime',
      'Client Name': ['first_name', 'last_name'],
      'Client\'s name': ['first_name', 'last_name'],
      'Appointment Type': 'service_name',
      'Phone': 'phone',
      'Email': 'email',
      'Calendar': 'staff_name',
      'Notes': 'notes',
      'Price': 'price',
      'First Name': 'first_name',
      'Last Name': 'last_name',
      'Duration': 'duration_minutes'
    }
  },

  trafft: {
    name: 'Trafft',
    icon: '🗓️',
    description: 'Import from Trafft',
    importType: 'multiple', // Trafft exports customers and appointments separately
    exportInstructions: [
      'Export Appointments: Go to Appointments → Select date range → Click "Export Data"',
      'Export Customers: Go to Customers → Click "Export Data" (next to Import Data)',
      'For both exports: Choose comma delimiter when prompted',
      'Select all columns (or customize based on your needs)',
      'Download both CSV files and upload them here'
    ],
    dataDetection: {
      customers: ['Customer Name', 'Customer Email', 'Customer Phone'],
      appointments: ['Appointment Date', 'Service', 'Employee', 'Customer'],
      services: ['Service Name', 'Service Duration', 'Service Price']
    },
    limitations: [
      'Custom fields may need manual mapping',
      'Package deals need to be recreated',
      'Employee schedules must be set up separately'
    ],
    dataMapping: {
      'Customer Name': ['first_name', 'last_name'],
      'Customer Email': 'email',
      'Customer Phone': 'phone',
      'Appointment Date': 'appointment_date',
      'Service': 'service_name',
      'Employee': 'staff_name',
      'Service Duration': 'duration_minutes',
      'Service Price': 'price',
      'Status': 'appointment_status'
    }
  },

  other: {
    name: 'Other',
    icon: '📊',
    description: 'Generic CSV import',
    importType: 'unified',
    exportInstructions: [
      'Export your data as CSV from your current platform',
      'Include customer names, emails, and phone numbers',
      'Include appointment dates, times, and services',
      'Include service names, prices, and durations',
      'Upload the CSV file below'
    ],
    dataDetection: {
      customers: ['Name', 'Email', 'Phone'],
      appointments: ['Date', 'Time', 'Service'],
      services: ['Service', 'Price', 'Duration']
    },
    limitations: [
      'Column mapping may require manual adjustment',
      'Some platform-specific features may not transfer'
    ],
    dataMapping: {}
  }
}

/**
 * Helper function to detect platform from CSV headers
 */
export function detectPlatform(headers) {
  const headerStr = headers.join(',').toLowerCase()
  
  // Square detection
  if (headerStr.includes('square') || 
      (headerStr.includes('customer name') && headerStr.includes('service'))) {
    return 'square'
  }
  
  // Acuity detection
  if (headerStr.includes('acuity') || 
      (headerStr.includes('start date and time') && headerStr.includes('appointment type'))) {
    return 'acuity'
  }
  
  // Booksy detection (less reliable since they don't have standard export)
  if (headerStr.includes('booksy') || 
      (headerStr.includes('client name') && headerStr.includes('first visit'))) {
    return 'booksy'
  }
  
  return 'generic'
}

/**
 * Get import instructions for a specific platform
 */
export function getImportInstructions(platform, fileType) {
  const config = platformImportConfigs[platform]
  if (!config) return null
  
  const file = config.supportedFiles.find(f => f.type === fileType)
  return file?.instructions || []
}

/**
 * Map platform-specific columns to our schema
 */
export function mapPlatformData(platform, data) {
  const config = platformImportConfigs[platform]
  if (!config || !config.dataMapping) return data
  
  return data.map(row => {
    const mappedRow = {}
    
    Object.entries(row).forEach(([key, value]) => {
      const mapping = config.dataMapping[key]
      
      if (mapping) {
        if (Array.isArray(mapping)) {
          // Split combined fields (like "Customer Name" -> first_name, last_name)
          const parts = value.split(' ')
          mapping.forEach((field, index) => {
            mappedRow[field] = parts[index] || ''
          })
        } else {
          mappedRow[mapping] = value
        }
      } else {
        // Keep unmapped fields as-is
        mappedRow[key] = value
      }
    })
    
    return mappedRow
  })
}