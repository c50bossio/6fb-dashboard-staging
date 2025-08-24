import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import Papa from 'papaparse'
import { parsePlatformData } from '@/lib/integrations/platform-parsers'
import { DataTransformer } from '@/lib/integrations/data-transformer'
import { DuplicateDetector } from '@/lib/integrations/duplicate-detector'
import { platformImportConfigs, detectPlatform, mapPlatformData } from '@/lib/platform-import-configs'

// Create Supabase client with service role for batch operations
const supabase = createClient(
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
 * Streamlined Quick Import API
 * Handles CSV imports from multiple platforms with auto-detection and smart defaults
 */
export async function POST(request) {
  try {
    // Get user session
    const cookieStore = cookies()
    const authToken = cookieStore.get('auth-token')?.value
    
    if (!authToken) {
      return NextResponse.json({ 
        success: false,
        error: 'Authentication required' 
      }, { status: 401 })
    }

    // Parse form data
    const formData = await request.formData()
    const files = formData.getAll('files') // Support multiple files
    const platformParam = formData.get('platform')
    const barbershopId = formData.get('barbershopId')

    // Validation
    if (!files || files.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'At least one CSV file is required',
        nextSteps: ['Please select a CSV file to import']
      }, { status: 400 })
    }

    if (!barbershopId) {
      return NextResponse.json({
        success: false,
        error: 'Barbershop ID is required',
        nextSteps: ['Please ensure you are logged in and have selected a barbershop']
      }, { status: 400 })
    }

    // Initialize results
    const importResults = {
      success: true,
      summary: {
        filesProcessed: 0,
        totalRecords: 0,
        imported: { customers: 0, appointments: 0, services: 0, staff: 0 },
        skipped: { customers: 0, appointments: 0, services: 0, staff: 0 },
        errors: { customers: 0, appointments: 0, services: 0, staff: 0 }
      },
      stats: {},
      warnings: [],
      nextSteps: [],
      details: []
    }

    // Process each file
    for (const file of files) {
      try {
        const fileResult = await processFile(file, platformParam, barbershopId)
        
        // Merge results
        importResults.summary.filesProcessed++
        importResults.summary.totalRecords += fileResult.totalRecords
        
        // Aggregate stats
        Object.keys(fileResult.imported).forEach(type => {
          importResults.summary.imported[type] += fileResult.imported[type] || 0
          importResults.summary.skipped[type] += fileResult.skipped[type] || 0
          importResults.summary.errors[type] += fileResult.errors[type] || 0
        })

        importResults.details.push(fileResult)
        importResults.warnings.push(...fileResult.warnings)

      } catch (fileError) {
        console.error(`Error processing file ${file.name}:`, fileError)
        importResults.warnings.push({
          type: 'file_error',
          message: `Failed to process file '${file.name}': ${fileError.message}`,
          severity: 'error'
        })
        importResults.success = false
      }
    }

    // Generate final stats
    importResults.stats = {
      customers: {
        imported: importResults.summary.imported.customers,
        skipped: importResults.summary.skipped.customers,
        errors: importResults.summary.errors.customers
      },
      appointments: {
        imported: importResults.summary.imported.appointments,
        skipped: importResults.summary.skipped.appointments,
        errors: importResults.summary.errors.appointments
      },
      services: {
        imported: importResults.summary.imported.services,
        skipped: importResults.summary.skipped.services,
        errors: importResults.summary.errors.services
      },
      staff: {
        imported: importResults.summary.imported.staff,
        skipped: importResults.summary.skipped.staff,
        errors: importResults.summary.errors.staff
      }
    }

    // Generate next steps
    importResults.nextSteps = generateNextSteps(importResults.summary, importResults.warnings)

    // Log final results for debugging
    console.log('Quick import completed:', {
      barbershopId,
      filesProcessed: importResults.summary.filesProcessed,
      totalImported: Object.values(importResults.summary.imported).reduce((a, b) => a + b, 0),
      success: importResults.success
    })

    return NextResponse.json(importResults)

  } catch (error) {
    console.error('Quick import error:', error)
    return NextResponse.json({
      success: false,
      error: 'Import failed due to unexpected error',
      details: error.message,
      nextSteps: [
        'Please check that your CSV file is properly formatted',
        'Ensure all required columns are present',
        'Try importing a smaller file to test the process',
        'Contact support if the issue persists'
      ]
    }, { status: 500 })
  }
}

/**
 * Process a single file with platform detection and data transformation
 */
async function processFile(file, platformParam, barbershopId) {
  const fileContent = await file.text()
  const fileName = file.name
  
  // Auto-detect platform if not specified
  let detectedPlatform = platformParam
  if (!detectedPlatform || detectedPlatform === 'auto') {
    detectedPlatform = detectPlatformFromContent(fileContent, fileName)
  }

  // Get platform configuration
  const platformConfig = platformImportConfigs[detectedPlatform] || platformImportConfigs.other
  
  const result = {
    fileName,
    platform: detectedPlatform,
    totalRecords: 0,
    imported: { customers: 0, appointments: 0, services: 0, staff: 0 },
    skipped: { customers: 0, appointments: 0, services: 0, staff: 0 },
    errors: { customers: 0, appointments: 0, services: 0, staff: 0 },
    warnings: [],
    dataTypes: []
  }

  try {
    // Parse platform-specific data
    const parsedResult = await parsePlatformData(detectedPlatform, fileContent, {
      fileName,
      fileType: file.type
    })

    if (parsedResult.error) {
      throw new Error(`Parse error: ${parsedResult.error}`)
    }

    const parsedData = parsedResult.data

    // Apply platform-specific field mappings
    const mappedData = applyPlatformMappings(parsedData, platformConfig)

    // Transform data using universal schema
    const transformer = new DataTransformer({
      strictValidation: false, // More lenient for quick import
      defaultCountry: 'US'
    })

    // Process each data type with smart error handling
    for (const [dataType, records] of Object.entries(mappedData)) {
      if (!records || records.length === 0) continue

      result.dataTypes.push(dataType)
      result.totalRecords += records.length

      try {
        const typeResult = await processDataType(
          dataType, 
          records, 
          barbershopId, 
          transformer,
          platformConfig
        )

        result.imported[dataType] = typeResult.imported
        result.skipped[dataType] = typeResult.skipped
        result.errors[dataType] = typeResult.errors
        result.warnings.push(...typeResult.warnings)

      } catch (typeError) {
        console.error(`Error processing ${dataType}:`, typeError)
        result.errors[dataType] = records.length
        result.warnings.push({
          type: 'data_type_error',
          message: `Failed to process ${dataType}: ${typeError.message}`,
          severity: 'error'
        })
      }
    }

    // Add platform-specific warnings if any
    if (platformConfig.limitations) {
      platformConfig.limitations.forEach(limitation => {
        result.warnings.push({
          type: 'platform_limitation',
          message: limitation,
          severity: 'info'
        })
      })
    }

  } catch (error) {
    console.error('File processing error:', error)
    throw new Error(`Failed to process file: ${error.message}`)
  }

  return result
}

/**
 * Enhanced platform detection with CSV header analysis
 */
function detectPlatformFromContent(fileContent, fileName) {
  // First try the existing detection
  const basicDetection = detectPlatform(fileContent, fileName)
  if (basicDetection !== 'csv') {
    return basicDetection
  }

  // Enhanced detection using CSV headers
  try {
    const parsed = Papa.parse(fileContent, {
      header: true,
      preview: 1, // Only parse first row for headers
      skipEmptyLines: true
    })

    if (parsed.data.length === 0) return 'other'

    const headers = Object.keys(parsed.data[0]).map(h => h.toLowerCase())
    const headerString = headers.join(' ')

    // Platform-specific header patterns (from platform-import-configs.js)
    if (headerString.includes('customer name') && headerString.includes('service')) {
      return 'square'
    }
    if (headerString.includes('start date and time') && headerString.includes('appointment type')) {
      return 'acuity'
    }
    if (headerString.includes('client name') && headerString.includes('first visit')) {
      return 'booksy'
    }
    if (headerString.includes('customer name') && headerString.includes('employee')) {
      return 'trafft'
    }
    if (headerString.includes('provider') && headerString.includes('appointment date')) {
      return 'schedulicity'
    }

    return 'other'
    
  } catch (e) {
    console.warn('Could not parse headers for platform detection:', e)
    return 'other'
  }
}

/**
 * Apply platform-specific field mappings
 */
function applyPlatformMappings(data, platformConfig) {
  const mappedData = {}

  Object.entries(data).forEach(([dataType, records]) => {
    if (!records || records.length === 0) return

    mappedData[dataType] = records.map(record => {
      if (!platformConfig.dataMapping) return record

      const mappedRecord = {}
      
      Object.entries(record).forEach(([key, value]) => {
        const mapping = platformConfig.dataMapping[key]
        
        if (mapping) {
          if (Array.isArray(mapping)) {
            // Handle combined fields like "Customer Name" → [first_name, last_name]
            const parts = value ? String(value).split(' ') : []
            mapping.forEach((field, index) => {
              mappedRecord[field] = parts[index] || ''
            })
          } else {
            mappedRecord[mapping] = value
          }
        } else {
          // Keep unmapped fields with original key
          mappedRecord[key] = value
        }
      })

      return mappedRecord
    })
  })

  return mappedData
}

/**
 * Process a specific data type with enhanced error handling
 */
async function processDataType(dataType, records, barbershopId, transformer, platformConfig) {
  const result = {
    imported: 0,
    skipped: 0,
    errors: 0,
    warnings: []
  }

  // Skip unknown data types
  if (!['customers', 'appointments', 'services', 'staff'].includes(dataType)) {
    result.warnings.push({
      type: 'unknown_data_type',
      message: `Unknown data type '${dataType}' - skipping ${records.length} records`,
      severity: 'warning'
    })
    result.skipped = records.length
    return result
  }

  // Transform records
  let transformedRecords
  try {
    transformedRecords = await transformer.transformData(records, dataType)
  } catch (transformError) {
    result.warnings.push({
      type: 'transform_error',
      message: `Failed to transform ${dataType}: ${transformError.message}`,
      severity: 'error'
    })
    result.errors = records.length
    return result
  }

  // Detect duplicates
  const duplicateDetector = new DuplicateDetector(supabase)
  let duplicateAnalysis
  try {
    duplicateAnalysis = await duplicateDetector.checkDuplicates(
      transformedRecords,
      dataType,
      barbershopId
    )
  } catch (dupError) {
    console.warn('Duplicate detection failed, proceeding without:', dupError)
    duplicateAnalysis = { duplicates: {}, duplicateCount: 0 }
  }

  // Import with smart defaults
  const importOptions = {
    duplicateStrategy: 'skip', // Safe default for quick import
    createMissingReferences: true,
    validateData: false // Skip strict validation for speed
  }

  try {
    const importResult = await importDataType(
      dataType,
      transformedRecords,
      barbershopId,
      duplicateAnalysis,
      importOptions
    )

    result.imported = importResult.imported
    result.skipped = importResult.skipped + duplicateAnalysis.duplicateCount
    result.errors = importResult.errors

    // Add duplicate warnings if found
    if (duplicateAnalysis.duplicateCount > 0) {
      result.warnings.push({
        type: 'duplicates_skipped',
        message: `${duplicateAnalysis.duplicateCount} duplicate ${dataType} were skipped`,
        severity: 'info'
      })
    }

  } catch (importError) {
    result.errors = records.length
    result.warnings.push({
      type: 'import_error',
      message: `Failed to import ${dataType}: ${importError.message}`,
      severity: 'error'
    })
  }

  return result
}

/**
 * Import specific data type with batch processing
 */
async function importDataType(dataType, records, barbershopId, duplicateAnalysis, options) {
  const result = { imported: 0, skipped: 0, errors: 0 }
  const batchSize = 100

  // Filter out duplicates
  const toImport = records.filter(record => 
    !duplicateAnalysis.duplicates[record.tempId || record.id]
  )

  if (toImport.length === 0) {
    result.skipped = records.length
    return result
  }

  // Process in batches
  for (let i = 0; i < toImport.length; i += batchSize) {
    const batch = toImport.slice(i, i + batchSize)
    
    try {
      const batchResult = await importBatch(dataType, batch, barbershopId)
      result.imported += batchResult.imported
      result.errors += batchResult.errors
    } catch (batchError) {
      console.error(`Batch import error for ${dataType}:`, batchError)
      result.errors += batch.length
    }
  }

  return result
}

/**
 * Import a batch of records for a specific data type
 */
async function importBatch(dataType, records, barbershopId) {
  const tableName = getTableName(dataType)
  const preparedRecords = records.map(record => ({
    ...record,
    barbershop_id: barbershopId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    id: undefined // Let database generate ID
  }))

  try {
    const { data, error } = await supabase
      .from(tableName)
      .insert(preparedRecords)
      .select('id')

    if (error) {
      console.error(`Batch insert error for ${tableName}:`, error)
      return { imported: 0, errors: records.length }
    }

    return { imported: data?.length || 0, errors: 0 }
  } catch (insertError) {
    console.error(`Database insert error for ${tableName}:`, insertError)
    return { imported: 0, errors: records.length }
  }
}

/**
 * Get database table name for data type
 */
function getTableName(dataType) {
  const tableMap = {
    customers: 'customers',
    appointments: 'appointments', 
    services: 'services',
    staff: 'barbershop_staff'
  }
  return tableMap[dataType] || dataType
}

/**
 * Generate helpful next steps based on import results
 */
function generateNextSteps(summary, warnings) {
  const steps = []
  const totalImported = Object.values(summary.imported).reduce((a, b) => a + b, 0)
  const totalErrors = Object.values(summary.errors).reduce((a, b) => a + b, 0)

  if (totalImported > 0) {
    steps.push(`Successfully imported ${totalImported} records`)
    
    if (summary.imported.customers > 0) {
      steps.push('Review your customer list and update any missing information')
    }
    
    if (summary.imported.services > 0) {
      steps.push('Check your services and adjust pricing or descriptions as needed')
    }
    
    if (summary.imported.appointments > 0) {
      steps.push('Verify appointment dates and times are correct for your timezone')
    }
  }

  if (totalErrors > 0) {
    steps.push(`${totalErrors} records had errors - review the warnings above`)
    steps.push('Consider cleaning up your CSV file and re-importing failed records')
  }

  if (warnings.some(w => w.type === 'duplicates_skipped')) {
    steps.push('Duplicate records were automatically skipped to avoid data conflicts')
  }

  // Add general next steps
  if (totalImported > 0) {
    steps.push('Set up your staff schedules and availability')
    steps.push('Configure your online booking settings')
    steps.push('Test the booking flow to ensure everything works correctly')
  }

  return steps.length > 0 ? steps : ['Import completed - no further action needed']
}