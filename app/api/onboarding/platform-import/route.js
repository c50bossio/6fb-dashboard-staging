import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import Papa from 'papaparse'
import { platformImportConfigs, mapPlatformData } from '@/lib/platform-import-configs'
import { analyzeCSV } from '@/lib/csv-auto-detector'

// Create service role client for batch operations
const supabaseService = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
)

/**
 * Platform-Specific Import API
 * Handles both single and multiple file uploads with platform-specific parsing
 * Supports all major booking platforms: Square, Booksy, Acuity, Trafft, Schedulicity
 */
export async function POST(request) {
  try {
    // Get user session using Supabase auth
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    // During onboarding, allow import without full authentication
    // but still require barbershopId to ensure data is properly associated
    const isOnboarding = request.headers.get('x-onboarding-flow') === 'true'
    
    if (!isOnboarding && !user) {
      console.log('🔒 No authenticated user and not in onboarding flow')
      return NextResponse.json({ 
        success: false,
        error: 'Authentication required' 
      }, { status: 401 })
    }

    // Parse form data
    const formData = await request.formData()
    const platform = formData.get('platform')
    const barbershopId = formData.get('barbershopId')
    
    // Debug logging
    console.log('📥 Platform Import Request:', {
      platform,
      barbershopId,
      isOnboarding,
      formDataEntries: Array.from(formData.entries()).map(([key, value]) => 
        [key, value instanceof File ? `File: ${value.name}` : value]
      )
    })
    
    // Get all uploaded files (supports multiple files)
    const files = []
    let fileIndex = 1
    while (formData.has(`file${fileIndex}`)) {
      files.push(formData.get(`file${fileIndex}`))
      fileIndex++
    }
    
    // Also check for generic 'file' and 'files' fields
    const singleFile = formData.get('file')
    const multipleFiles = formData.getAll('files')
    
    if (singleFile) files.push(singleFile)
    files.push(...multipleFiles)

    console.log(`📁 Found ${files.length} files`)

    // Validation
    if (!platform) {
      console.error('❌ Platform ID is missing')
      return NextResponse.json({
        success: false,
        error: 'Platform ID is required'
      }, { status: 400 })
    }

    if (!barbershopId) {
      console.error('❌ Barbershop ID is missing')
      return NextResponse.json({
        success: false,
        error: 'Barbershop ID is required'
      }, { status: 400 })
    }

    if (files.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'At least one CSV file is required'
      }, { status: 400 })
    }

    // Get platform configuration
    const platformConfig = platformImportConfigs[platform]
    if (!platformConfig) {
      return NextResponse.json({
        success: false,
        error: `Unsupported platform: ${platform}`
      }, { status: 400 })
    }

    // Validate file count matches platform requirements
    const expectedFileCount = platformConfig.fileRequirements.count
    if (files.length !== expectedFileCount) {
      const fileTypes = platformConfig.fileRequirements.types.map(t => t.label).join(', ')
      return NextResponse.json({
        success: false,
        error: `${platformConfig.name} requires ${expectedFileCount} file(s): ${fileTypes}`,
        expected: expectedFileCount,
        received: files.length
      }, { status: 400 })
    }

    // Initialize import results
    const importResults = {
      success: true,
      platform: platform,
      platformName: platformConfig.name,
      imported: {
        customers: 0,
        appointments: 0,
        services: 0
      },
      skipped: {
        duplicates: 0,
        errors: 0
      },
      errors: [],
      warnings: [],
      details: {
        filesProcessed: files.length,
        totalRecords: 0,
        processingTime: Date.now()
      }
    }

    // Process files based on platform type
    if (platformConfig.importType === 'unified') {
      // Single file contains all data (Square, Booksy, Schedulicity)
      const file = files[0]
      const result = await processUnifiedFile(file, platformConfig, barbershopId)
      mergeResults(importResults, result)
    } else if (platformConfig.importType === 'multiple') {
      // Multiple files with specific data types (Acuity, Trafft)
      for (const file of files) {
        const result = await processSpecificFile(file, platformConfig, barbershopId)
        mergeResults(importResults, result)
      }
    }

    // Calculate processing time
    importResults.details.processingTime = Date.now() - importResults.details.processingTime

    // Add platform-specific warnings
    if (platformConfig.limitations) {
      platformConfig.limitations.forEach(limitation => {
        importResults.warnings.push({
          type: 'platform_limitation',
          message: limitation
        })
      })
    }

    // Final validation
    const totalImported = Object.values(importResults.imported).reduce((sum, count) => sum + count, 0)
    if (totalImported === 0 && importResults.errors.length === 0) {
      importResults.warnings.push({
        type: 'no_data',
        message: 'No data was imported. Please check your CSV file format and content.'
      })
    }

    console.log('Platform import completed:', {
      platform: platform,
      barbershopId: barbershopId,
      imported: importResults.imported,
      processingTime: importResults.details.processingTime
    })

    return NextResponse.json(importResults)

  } catch (error) {
    console.error('Platform import error:', error)
    return NextResponse.json({
      success: false,
      error: 'Import failed due to unexpected error',
      details: error.message,
      imported: { customers: 0, appointments: 0, services: 0 },
      skipped: { duplicates: 0 },
      errors: [error.message]
    }, { status: 500 })
  }
}

/**
 * Process a unified file that contains all data types
 * Used by: Square, Booksy, Schedulicity
 */
async function processUnifiedFile(file, platformConfig, barbershopId) {
  const fileContent = await file.text()
  const result = {
    imported: { customers: 0, appointments: 0, services: 0 },
    skipped: { duplicates: 0, errors: 0 },
    errors: [],
    warnings: [],
    totalRecords: 0
  }

  try {
    // Parse CSV
    const parsed = Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim()
    })

    if (parsed.errors.length > 0) {
      parsed.errors.forEach(error => {
        result.errors.push(`CSV parsing error: ${error.message}`)
      })
    }

    const rawData = parsed.data
    result.totalRecords = rawData.length

    if (rawData.length === 0) {
      result.warnings.push({
        type: 'empty_file',
        message: 'CSV file is empty or contains no data rows'
      })
      return result
    }

    // Validate headers
    const headers = Object.keys(rawData[0])
    const headerValidation = validateHeaders(headers, platformConfig)
    if (!headerValidation.valid) {
      result.errors.push(`Missing required headers: ${headerValidation.missing.join(', ')}`)
      return result
    }

    // Auto-detect data types in the unified file
    const analysis = analyzeCSV(headers, rawData)
    
    // Separate data by type using smart detection
    const separatedData = separateUnifiedData(rawData, analysis, platformConfig)

    // Process each data type
    for (const [dataType, records] of Object.entries(separatedData)) {
      if (records.length === 0) continue

      try {
        const typeResult = await importDataType(dataType, records, platformConfig, barbershopId)
        result.imported[dataType] = typeResult.imported
        result.skipped.duplicates += typeResult.skipped
        result.skipped.errors += typeResult.errors
        result.errors.push(...typeResult.errors)
        result.warnings.push(...typeResult.warnings)
      } catch (typeError) {
        result.errors.push(`Failed to import ${dataType}: ${typeError.message}`)
      }
    }

  } catch (parseError) {
    result.errors.push(`Failed to parse CSV file: ${parseError.message}`)
  }

  return result
}

/**
 * Process a specific file type for multi-file platforms
 * Used by: Acuity, Trafft
 */
async function processSpecificFile(file, platformConfig, barbershopId) {
  const fileContent = await file.text()
  const fileName = file.name.toLowerCase()
  
  const result = {
    imported: { customers: 0, appointments: 0, services: 0 },
    skipped: { duplicates: 0, errors: 0 },
    errors: [],
    warnings: [],
    totalRecords: 0
  }

  try {
    // Parse CSV
    const parsed = Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim()
    })

    if (parsed.errors.length > 0) {
      parsed.errors.forEach(error => {
        result.errors.push(`CSV parsing error in ${file.name}: ${error.message}`)
      })
    }

    const rawData = parsed.data
    result.totalRecords = rawData.length

    if (rawData.length === 0) {
      result.warnings.push({
        type: 'empty_file',
        message: `File ${file.name} is empty or contains no data rows`
      })
      return result
    }

    // Determine file type based on filename and headers
    const headers = Object.keys(rawData[0])
    const fileType = detectFileType(fileName, headers, platformConfig)
    
    if (!fileType) {
      result.errors.push(`Could not determine data type for file: ${file.name}`)
      return result
    }

    // Import the data
    const typeResult = await importDataType(fileType, rawData, platformConfig, barbershopId)
    result.imported[fileType] = typeResult.imported
    result.skipped.duplicates += typeResult.skipped
    result.skipped.errors += typeResult.errors
    result.errors.push(...typeResult.errors)
    result.warnings.push(...typeResult.warnings)

  } catch (parseError) {
    result.errors.push(`Failed to parse file ${file.name}: ${parseError.message}`)
  }

  return result
}

/**
 * Import data for a specific type (customers, appointments, services)
 */
async function importDataType(dataType, rawData, platformConfig, barbershopId) {
  const result = {
    imported: 0,
    skipped: 0,
    errors: 0,
    errorMessages: [],
    warnings: []
  }

  try {
    // Apply platform-specific mappings
    const mappedData = mapPlatformData(platformConfig.name.toLowerCase(), rawData)
    
    // Transform and validate data
    const transformedData = await transformDataForType(dataType, mappedData, barbershopId)
    
    // Check for duplicates
    const existingData = await getExistingData(dataType, barbershopId)
    const { toImport, duplicates } = filterDuplicates(transformedData, existingData, dataType)
    
    result.skipped = duplicates.length

    if (toImport.length === 0) {
      result.warnings.push({
        type: 'all_duplicates',
        message: `All ${dataType} records already exist in the database`
      })
      return result
    }

    // Import in batches
    const batchSize = 50
    let imported = 0
    let errors = 0

    for (let i = 0; i < toImport.length; i += batchSize) {
      const batch = toImport.slice(i, i + batchSize)
      
      try {
        const { data, error } = await supabaseService
          .from(getTableName(dataType))
          .insert(batch)
          .select('id')

        if (error) {
          console.error(`Batch insert error for ${dataType}:`, error)
          errors += batch.length
          result.errorMessages.push(`Database error: ${error.message}`)
        } else {
          imported += data?.length || 0
        }
      } catch (batchError) {
        console.error(`Batch processing error for ${dataType}:`, batchError)
        errors += batch.length
        result.errorMessages.push(`Batch error: ${batchError.message}`)
      }
    }

    result.imported = imported
    result.errors = errors

  } catch (transformError) {
    console.error(`Transform error for ${dataType}:`, transformError)
    result.errors = rawData.length
    result.errorMessages.push(`Transform error: ${transformError.message}`)
  }

  return result
}

/**
 * Transform raw data for specific data type
 */
async function transformDataForType(dataType, data, barbershopId) {
  const baseFields = {
    barbershop_id: barbershopId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  return data.map(record => {
    const transformed = { ...baseFields }

    switch (dataType) {
      case 'customers':
        return {
          ...transformed,
          first_name: record.first_name || extractFirstName(record.name || record.customer_name || record.client_name) || 'Unknown',
          last_name: record.last_name || extractLastName(record.name || record.customer_name || record.client_name) || '',
          email: record.email || record.customer_email || record.client_email || null,
          phone: cleanPhoneNumber(record.phone || record.customer_phone || record.client_phone) || null,
          first_visit: record.customer_since || record.first_visit || new Date().toISOString(),
          is_active: true
        }

      case 'services':
        return {
          ...transformed,
          name: record.service_name || record.service || record.appointment_type || record.item_name || 'Service',
          description: record.description || record.notes || '',
          category: categorizeService(record.service_name || record.service || record.appointment_type),
          price: parseFloat(record.price || record.service_price || '0') || 0,
          duration_minutes: parseInt(record.duration_minutes || record.duration || '30') || 30,
          is_active: true,
          online_booking_enabled: true
        }

      case 'appointments':
        return {
          ...transformed,
          customer_id: null, // Will be resolved later
          service_id: null,  // Will be resolved later
          appointment_date: parseAppointmentDate(record.appointment_date || record.date || record.start_datetime),
          start_time: parseAppointmentTime(record.appointment_time || record.time || record.start_datetime),
          end_time: calculateEndTime(record.start_datetime || record.end_datetime, record.duration_minutes),
          duration_minutes: parseInt(record.duration_minutes || record.duration || '30') || 30,
          status: normalizeAppointmentStatus(record.status),
          notes: record.notes || '',
          price: parseFloat(record.price || '0') || 0
        }

      default:
        return { ...transformed, ...record }
    }
  }).filter(record => {
    // Basic validation - skip records missing critical data
    switch (dataType) {
      case 'customers':
        return record.first_name && record.first_name !== 'Unknown'
      case 'services':
        return record.name && record.name !== 'Service'
      case 'appointments':
        return record.appointment_date
      default:
        return true
    }
  })
}

/**
 * Helper functions for data transformation
 */
function extractFirstName(fullName) {
  if (!fullName) return null
  return fullName.split(' ')[0]
}

function extractLastName(fullName) {
  if (!fullName) return null
  const parts = fullName.split(' ')
  return parts.length > 1 ? parts.slice(1).join(' ') : ''
}

function cleanPhoneNumber(phone) {
  if (!phone) return null
  return phone.replace(/[^\d+]/g, '').slice(0, 20)
}

function categorizeService(serviceName) {
  if (!serviceName) return 'other'
  const name = serviceName.toLowerCase()
  
  if (name.includes('haircut') || name.includes('cut') || name.includes('trim')) return 'haircut'
  if (name.includes('beard') || name.includes('mustache') || name.includes('facial')) return 'beard'
  if (name.includes('style') || name.includes('wash') || name.includes('shampoo')) return 'styling'
  if (name.includes('color') || name.includes('highlight') || name.includes('dye')) return 'treatment'
  if (name.includes('combo') || name.includes('package')) return 'combo'
  
  return 'other'
}

function parseAppointmentDate(dateStr) {
  if (!dateStr) return new Date().toISOString().split('T')[0]
  
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) {
      return new Date().toISOString().split('T')[0]
    }
    return date.toISOString().split('T')[0]
  } catch {
    return new Date().toISOString().split('T')[0]
  }
}

function parseAppointmentTime(timeStr) {
  if (!timeStr) return new Date().toISOString()
  
  try {
    const date = new Date(timeStr)
    if (isNaN(date.getTime())) {
      return new Date().toISOString()
    }
    return date.toISOString()
  } catch {
    return new Date().toISOString()
  }
}

function calculateEndTime(startTime, durationMinutes) {
  try {
    const start = new Date(startTime || new Date())
    const duration = parseInt(durationMinutes) || 30
    const end = new Date(start.getTime() + duration * 60000)
    return end.toISOString()
  } catch {
    return new Date().toISOString()
  }
}

function normalizeAppointmentStatus(status) {
  if (!status) return 'confirmed'
  const statusLower = status.toLowerCase()
  
  if (statusLower.includes('complete') || statusLower.includes('finish')) return 'completed'
  if (statusLower.includes('cancel')) return 'cancelled'
  if (statusLower.includes('confirm')) return 'confirmed'
  if (statusLower.includes('pending')) return 'pending'
  
  return 'confirmed'
}

/**
 * Get existing data to check for duplicates
 */
async function getExistingData(dataType, barbershopId) {
  const tableName = getTableName(dataType)
  const { data, error } = await supabaseService
    .from(tableName)
    .select('*')
    .eq('barbershop_id', barbershopId)

  if (error) {
    console.warn(`Failed to fetch existing ${dataType}:`, error)
    return []
  }

  return data || []
}

/**
 * Filter out duplicate records
 */
function filterDuplicates(newData, existingData, dataType) {
  const toImport = []
  const duplicates = []

  for (const newRecord of newData) {
    const isDuplicate = existingData.some(existing => {
      switch (dataType) {
        case 'customers':
          return existing.email === newRecord.email && 
                 existing.first_name === newRecord.first_name &&
                 existing.last_name === newRecord.last_name
        
        case 'services':
          return existing.name === newRecord.name
        
        case 'appointments':
          return existing.appointment_date === newRecord.appointment_date &&
                 existing.start_time === newRecord.start_time
        
        default:
          return false
      }
    })

    if (isDuplicate) {
      duplicates.push(newRecord)
    } else {
      toImport.push(newRecord)
    }
  }

  return { toImport, duplicates }
}

/**
 * Helper functions
 */
function getTableName(dataType) {
  const tableMap = {
    customers: 'customers',
    appointments: 'appointments',
    services: 'services'
  }
  return tableMap[dataType] || dataType
}

function validateHeaders(headers, platformConfig) {
  if (!platformConfig.validation?.requiredHeaders) {
    return { valid: true, missing: [] }
  }

  const missing = platformConfig.validation.requiredHeaders.filter(required => 
    !headers.some(header => header.toLowerCase().includes(required.toLowerCase()))
  )

  return {
    valid: missing.length === 0,
    missing
  }
}

function detectFileType(fileName, headers, platformConfig) {
  const headerStr = headers.join(' ').toLowerCase()
  
  // Check for customer file patterns
  if (fileName.includes('customer') || fileName.includes('client') || 
      headerStr.includes('customer name') || headerStr.includes('client name')) {
    return 'customers'
  }
  
  // Check for appointment file patterns
  if (fileName.includes('appointment') || fileName.includes('booking') ||
      headerStr.includes('appointment date') || headerStr.includes('start date')) {
    return 'appointments'
  }
  
  // Check for service file patterns
  if (fileName.includes('service') || fileName.includes('treatment') ||
      headerStr.includes('service name') || headerStr.includes('appointment type')) {
    return 'services'
  }

  return null
}

function separateUnifiedData(rawData, analysis, platformConfig) {
  const separated = {
    customers: [],
    appointments: [],
    services: []
  }

  // Use analysis to determine which data types are present
  for (const record of rawData) {
    if (analysis.dataTypes.hasCustomers) {
      separated.customers.push(record)
    }
    
    if (analysis.dataTypes.hasAppointments) {
      separated.appointments.push(record)
    }
    
    if (analysis.dataTypes.hasServices) {
      separated.services.push(record)
    }
  }

  return separated
}

function mergeResults(target, source) {
  // Merge imported counts
  Object.keys(source.imported).forEach(key => {
    target.imported[key] = (target.imported[key] || 0) + source.imported[key]
  })

  // Merge skipped counts
  Object.keys(source.skipped).forEach(key => {
    target.skipped[key] = (target.skipped[key] || 0) + source.skipped[key]
  })

  // Merge errors and warnings
  target.errors.push(...(source.errors || []))
  target.warnings.push(...(source.warnings || []))

  // Update total records
  target.details.totalRecords += source.totalRecords || 0
}