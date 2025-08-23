import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { parsePlatformData, detectPlatform } from '@/lib/integrations/platform-parsers'

export const runtime = 'edge'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Field mapping for different platforms to our database schema
const fieldMappings = {
  square: {
    name: ['Given Name', 'Family Name', 'Customer Name', 'Name'],
    phone: ['Phone Number', 'Mobile Phone', 'Phone', 'Cell'],
    email: ['Email Address', 'Email', 'E-mail'],
    notes: ['Notes', 'Customer Notes', 'Comments'],
    address: ['Address', 'Street Address', 'Location'],
    birthdate: ['Birthday', 'Date of Birth', 'DOB'],
    created_at: ['Created At', 'Join Date', 'First Visit']
  },
  booksy: {
    name: ['Client Name', 'Full Name', 'Name'],
    phone: ['Phone', 'Mobile', 'Cell Phone'],
    email: ['Email', 'Email Address'],
    notes: ['Notes', 'Comments', 'Additional Info'],
    last_visit: ['Last Visit', 'Last Appointment'],
    total_visits: ['Total Visits', 'Visit Count'],
    total_spent: ['Total Spent', 'Revenue']
  },
  schedulicity: {
    name: ['First Name', 'Last Name', 'Client Name', 'Name'],
    phone: ['Mobile Phone', 'Phone', 'Cell'],
    email: ['Email', 'Email Address'],
    notes: ['Notes', 'Client Notes'],
    preferences: ['Preferences', 'Service Preferences'],
    referral: ['Referral Source', 'How Heard']
  },
  acuity: {
    name: ['First Name', 'Last Name', 'Client', 'Name'],
    phone: ['Phone', 'Mobile', 'Cell Phone'],
    email: ['Email', 'Email Address'],
    notes: ['Notes', 'Client Notes', 'Additional Info'],
    birthdate: ['Birthday', 'Date of Birth'],
    address: ['Address', 'Location']
  },
  trafft: {
    name: ['Customer Name', 'Full Name', 'Name'],
    phone: ['Phone', 'Mobile', 'Phone Number'],
    email: ['Email', 'Email Address'],
    notes: ['Note', 'Notes', 'Description'],
    status: ['Status', 'Customer Status']
  },
  csv: {
    // Generic CSV mapping - try to detect common patterns
    name: ['name', 'customer_name', 'client_name', 'full_name', 'first_name'],
    phone: ['phone', 'mobile', 'cell', 'phone_number', 'tel'],
    email: ['email', 'email_address', 'e-mail'],
    notes: ['notes', 'comments', 'description', 'memo'],
    address: ['address', 'location', 'street', 'addr'],
    birthdate: ['birthday', 'dob', 'date_of_birth', 'birthdate']
  }
}

// Extract value from row based on possible field names
function extractField(row, fieldNames) {
  for (const fieldName of fieldNames) {
    // Try exact match first
    if (row[fieldName] !== undefined && row[fieldName] !== null && row[fieldName] !== '') {
      return row[fieldName]
    }
    
    // Try case-insensitive match
    const lowerFieldName = fieldName.toLowerCase()
    for (const key in row) {
      if (key.toLowerCase() === lowerFieldName && row[key] !== undefined && row[key] !== null && row[key] !== '') {
        return row[key]
      }
    }
  }
  
  // For name field, try to combine first and last name
  if (fieldNames.includes('Name') || fieldNames.includes('name')) {
    const firstName = row['First Name'] || row['first_name'] || row['Given Name'] || ''
    const lastName = row['Last Name'] || row['last_name'] || row['Family Name'] || ''
    const fullName = `${firstName} ${lastName}`.trim()
    if (fullName) return fullName
  }
  
  return null
}

// Clean and format phone number
function cleanPhoneNumber(phone) {
  if (!phone) return null
  
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '')
  
  // Handle US phone numbers
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  } else if (digits.length === 11 && digits[0] === '1') {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  }
  
  // Return original if not standard US format
  return phone
}

// Validate email format
function isValidEmail(email) {
  if (!email) return false
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export async function POST(request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    const platform = formData.get('platform')
    const barbershopId = formData.get('barbershop_id')
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }
    
    if (!barbershopId) {
      return NextResponse.json(
        { error: 'barbershop_id is required' },
        { status: 400 }
      )
    }
    
    // Read file content
    const fileContent = await file.text()
    
    // Detect platform if not specified
    const detectedPlatform = platform || detectPlatform(fileContent, file.name)
    
    // Parse the data based on platform
    const parseResult = await parsePlatformData(detectedPlatform, fileContent, {
      fileName: file.name,
      fileSize: file.size
    })
    
    if (parseResult.error) {
      return NextResponse.json(
        { error: `Failed to parse file: ${parseResult.error}` },
        { status: 400 }
      )
    }
    
    const { data } = parseResult
    
    // Extract customer data based on what's available
    const customersToImport = []
    const mapping = fieldMappings[detectedPlatform] || fieldMappings.csv
    
    // Process customers data
    if (data.customers && data.customers.length > 0) {
      for (const row of data.customers) {
        const customer = processCustomerRow(row, mapping, barbershopId)
        if (customer.name && (customer.phone || customer.email)) {
          customersToImport.push(customer)
        }
      }
    }
    
    // If no customers found, try appointments data for customer info
    if (customersToImport.length === 0 && data.appointments && data.appointments.length > 0) {
      const uniqueCustomers = new Map()
      
      for (const appt of data.appointments) {
        const customer = processCustomerRow(appt, mapping, barbershopId)
        if (customer.name && (customer.phone || customer.email)) {
          // Use phone or email as unique key
          const key = customer.phone || customer.email
          if (!uniqueCustomers.has(key)) {
            uniqueCustomers.set(key, customer)
          }
        }
      }
      
      customersToImport.push(...uniqueCustomers.values())
    }
    
    // If still no customers, try to process any unknown data
    if (customersToImport.length === 0 && data.unknown && data.unknown.length > 0) {
      for (const row of data.unknown) {
        const customer = processCustomerRow(row, mapping, barbershopId)
        if (customer.name && (customer.phone || customer.email)) {
          customersToImport.push(customer)
        }
      }
    }
    
    if (customersToImport.length === 0) {
      return NextResponse.json(
        { 
          error: 'No valid customer data found in file',
          details: 'Ensure the file contains name and either phone or email for each customer'
        },
        { status: 400 }
      )
    }
    
    // Import customers in batches to avoid duplicates
    const imported = []
    const skipped = []
    const errors = []
    
    for (const customer of customersToImport) {
      try {
        // Check for existing customer
        let existingQuery = supabase
          .from('customers')
          .select('id, name')
          .or(`shop_id.eq.${barbershopId},barbershop_id.eq.${barbershopId}`)
        
        if (customer.phone && customer.email) {
          existingQuery = existingQuery.or(`phone.eq.${customer.phone},email.eq.${customer.email}`)
        } else if (customer.phone) {
          existingQuery = existingQuery.eq('phone', customer.phone)
        } else if (customer.email) {
          existingQuery = existingQuery.eq('email', customer.email)
        }
        
        const { data: existing } = await existingQuery.single()
        
        if (existing) {
          skipped.push({
            name: customer.name,
            reason: 'Already exists',
            existing_id: existing.id
          })
        } else {
          // Insert new customer
          const { data: newCustomer, error } = await supabase
            .from('customers')
            .insert([customer])
            .select()
            .single()
          
          if (error) {
            errors.push({
              name: customer.name,
              error: error.message
            })
          } else {
            imported.push(newCustomer)
          }
        }
      } catch (err) {
        errors.push({
          name: customer.name,
          error: err.message
        })
      }
    }
    
    // Process services data if available
    let servicesImported = 0
    if (data.services && data.services.length > 0) {
      for (const service of data.services) {
        try {
          const serviceName = extractField(service, ['Service Name', 'Service', 'Item Name', 'Name'])
          const price = extractField(service, ['Price', 'Cost', 'Amount'])
          const duration = extractField(service, ['Duration', 'Time', 'Minutes'])
          
          if (serviceName) {
            // Check if service exists
            const { data: existing } = await supabase
              .from('services')
              .select('id')
              .eq('barbershop_id', barbershopId)
              .eq('name', serviceName)
              .single()
            
            if (!existing) {
              const { error } = await supabase
                .from('services')
                .insert([{
                  barbershop_id: barbershopId,
                  name: serviceName,
                  price: parseFloat(price) || 0,
                  duration: parseInt(duration) || 30,
                  is_active: true
                }])
              
              if (!error) {
                servicesImported++
              }
            }
          }
        } catch (err) {
          // Silently skip service import errors
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      summary: {
        total_processed: customersToImport.length,
        imported: imported.length,
        skipped: skipped.length,
        errors: errors.length,
        services_imported: servicesImported
      },
      imported: imported.slice(0, 10), // Return first 10 for preview
      skipped: skipped.slice(0, 10),
      errors: errors.slice(0, 10),
      platform: detectedPlatform
    })
    
  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json(
      { error: 'Failed to import customers', details: error.message },
      { status: 500 }
    )
  }
}

// Process a single customer row
function processCustomerRow(row, mapping, barbershopId) {
  const name = extractField(row, mapping.name)
  const phone = cleanPhoneNumber(extractField(row, mapping.phone || []))
  const email = extractField(row, mapping.email || [])
  const notes = extractField(row, mapping.notes || [])
  const address = extractField(row, mapping.address || [])
  const birthdate = extractField(row, mapping.birthdate || [])
  
  // Build customer object
  const customer = {
    shop_id: barbershopId,
    barbershop_id: barbershopId,
    name: name,
    phone: phone,
    email: isValidEmail(email) ? email : null,
    notes: notes || '',
    preferences: {},
    notification_preferences: {
      sms: true,
      email: true,
      reminders: true,
      confirmations: true
    },
    total_visits: 0,
    total_spent: 0,
    is_active: true,
    vip_status: false
  }
  
  // Add optional fields if available
  if (address) {
    customer.preferences.address = address
  }
  
  if (birthdate) {
    customer.preferences.birthdate = birthdate
  }
  
  // Extract visit count if available
  const visitCount = extractField(row, ['Total Visits', 'Visit Count', 'Visits'])
  if (visitCount && !isNaN(parseInt(visitCount))) {
    customer.total_visits = parseInt(visitCount)
  }
  
  // Extract total spent if available
  const totalSpent = extractField(row, ['Total Spent', 'Revenue', 'Total Revenue', 'Lifetime Value'])
  if (totalSpent) {
    const amount = parseFloat(totalSpent.replace(/[^0-9.-]+/g, ''))
    if (!isNaN(amount)) {
      customer.total_spent = amount
    }
  }
  
  // Mark as VIP if high value customer
  if (customer.total_spent > 1000 || customer.total_visits > 20) {
    customer.vip_status = true
  }
  
  return customer
}