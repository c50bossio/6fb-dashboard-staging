/**
 * Import Process API Endpoint
 * Processes validated import data and inserts into database
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { readFile } from 'fs/promises'
import { CSVProcessor } from '@/lib/integrations/csv-processor'
import { DataTransformer } from '@/lib/integrations/data-transformer'
import { DuplicateDetector } from '@/lib/integrations/duplicate-detector'
import { SquareAdapter } from '@/lib/integrations/adapters/square-adapter'
import { TrafftAdapter } from '@/lib/integrations/adapters/trafft-adapter'
import { BooksyAdapter } from '@/lib/integrations/adapters/booksy-adapter'
import { SchedulicityAdapter } from '@/lib/integrations/adapters/schedulicity-adapter'
import { AcuityAdapter } from '@/lib/integrations/adapters/acuity-adapter'

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Platform adapters
const ADAPTERS = {
  square: SquareAdapter,
  trafft: TrafftAdapter,
  booksy: BooksyAdapter,
  schedulicity: SchedulicityAdapter,
  acuity: AcuityAdapter
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { 
      importId, 
      skipDuplicates = true, 
      mergeStrategy = 'preserve_existing',
      validateOnly = false 
    } = body

    if (!importId) {
      return NextResponse.json(
        { error: 'Import ID is required' },
        { status: 400 }
      )
    }

    // Fetch import record
    const { data: importRecord, error: fetchError } = await supabase
      .from('data_imports')
      .select('*')
      .eq('id', importId)
      .single()

    if (fetchError || !importRecord) {
      return NextResponse.json(
        { error: 'Import record not found' },
        { status: 404 }
      )
    }

    // Check status
    if (importRecord.status !== 'validating' && importRecord.status !== 'pending') {
      return NextResponse.json(
        { 
          error: 'Import already processed or failed',
          status: importRecord.status 
        },
        { status: 400 }
      )
    }

    // Update status to processing
    await supabase
      .from('data_imports')
      .update({ 
        status: 'processing',
        started_at: new Date().toISOString()
      })
      .eq('id', importId)

    // Log start
    await supabase
      .from('import_audit_log')
      .insert({
        import_id: importId,
        action: 'Processing started',
        action_type: 'info',
        details: {
          skipDuplicates,
          mergeStrategy,
          validateOnly
        }
      })

    try {
      // Read and parse file
      const fileContent = await readFile(importRecord.file_path, 'utf-8')
      const csvProcessor = new CSVProcessor()
      const parseResult = await csvProcessor.parseCSV(fileContent, {
        delimiter: importRecord.delimiter,
        hasHeaders: true
      })

      if (parseResult.errors && parseResult.errors.length > 0) {
        throw new Error('CSV parsing failed: ' + parseResult.errors[0].message)
      }

      // Get platform adapter
      const AdapterClass = ADAPTERS[importRecord.source_platform]
      let transformedData = parseResult.data
      let transformErrors = []
      let transformWarnings = []

      if (AdapterClass) {
        const adapter = new AdapterClass()
        const entityType = importRecord.import_type
        
        // Transform data using platform adapter
        const transformMethod = `transform${entityType.charAt(0).toUpperCase() + entityType.slice(1)}`
        if (adapter[transformMethod]) {
          const result = adapter[transformMethod](parseResult.data)
          transformedData = result.transformed
          transformErrors = result.errors || []
          transformWarnings = result.warnings || []
        }
      } else {
        // Use generic transformation
        const transformer = new DataTransformer()
        const result = await transformer.transformData(
          parseResult.data,
          importRecord.import_type,
          importRecord.field_mapping
        )
        transformedData = result.data.map(d => d.transformed)
        transformErrors = result.errors
        transformWarnings = result.warnings
      }

      // Check for transformation errors
      if (transformErrors.length > 0 && !validateOnly) {
        await updateImportStatus(importId, 'failed', {
          validation_errors: transformErrors,
          error_summary: `${transformErrors.length} transformation errors`
        })
        
        return NextResponse.json({
          success: false,
          error: 'Data transformation failed',
          errors: transformErrors
        }, { status: 400 })
      }

      // Duplicate detection
      const duplicateDetector = new DuplicateDetector(supabase)
      const duplicateResults = await duplicateDetector.checkDuplicates(
        transformedData,
        importRecord.import_type,
        importRecord.barbershop_id
      )

      // Save to staging table
      const stagingRecords = []
      for (let i = 0; i < transformedData.length; i++) {
        const record = transformedData[i]
        const duplicateCheck = duplicateResults.records[i]
        
        stagingRecords.push({
          import_id: importId,
          row_number: i + 2, // +2 for header and 1-based indexing
          entity_type: importRecord.import_type.slice(0, -1), // Remove 's' from plural
          raw_data: parseResult.data[i],
          mapped_data: record,
          normalized_data: record,
          validation_status: duplicateCheck.isDuplicate ? 'warning' : 'valid',
          is_duplicate: duplicateCheck.isDuplicate,
          duplicate_of_id: duplicateCheck.duplicateOf?.id || null,
          similarity_score: duplicateCheck.matchDetails?.name?.score || null,
          validation_warnings: duplicateCheck.potentialDuplicates.length > 0 
            ? [`${duplicateCheck.potentialDuplicates.length} potential duplicates found`]
            : null
        })
      }

      // Insert to staging
      const { error: stagingError } = await supabase
        .from('import_staging')
        .insert(stagingRecords)

      if (stagingError) {
        throw new Error(`Failed to save to staging: ${stagingError.message}`)
      }

      // If validate only, stop here
      if (validateOnly) {
        await updateImportStatus(importId, 'validating', {
          total_records: transformedData.length,
          successful_records: duplicateResults.stats.unique,
          skipped_duplicates: duplicateResults.stats.duplicates,
          validation_errors: transformErrors
        })

        return NextResponse.json({
          success: true,
          status: 'validation_complete',
          stats: {
            total: transformedData.length,
            valid: duplicateResults.stats.unique,
            duplicates: duplicateResults.stats.duplicates,
            errors: transformErrors.length,
            warnings: transformWarnings.length
          }
        })
      }

      // Process actual import
      const importStats = {
        imported: 0,
        skipped: 0,
        failed: 0,
        errors: []
      }

      // Import in batches
      const batchSize = 100
      for (let i = 0; i < stagingRecords.length; i += batchSize) {
        const batch = stagingRecords.slice(i, i + batchSize)
        
        for (const record of batch) {
          // Skip duplicates if requested
          if (record.is_duplicate && skipDuplicates) {
            importStats.skipped++
            continue
          }

          // Handle duplicates based on merge strategy
          if (record.is_duplicate && !skipDuplicates) {
            if (mergeStrategy === 'overwrite') {
              await updateExistingRecord(
                importRecord.import_type,
                record.duplicate_of_id,
                record.normalized_data
              )
              importStats.imported++
            } else if (mergeStrategy === 'preserve_existing') {
              importStats.skipped++
            } else if (mergeStrategy === 'merge') {
              await mergeRecords(
                importRecord.import_type,
                record.duplicate_of_id,
                record.normalized_data
              )
              importStats.imported++
            }
          } else {
            // Insert new record
            const insertResult = await insertNewRecord(
              importRecord.import_type,
              importRecord.barbershop_id,
              record.normalized_data
            )
            
            if (insertResult.success) {
              importStats.imported++
              
              // Update staging with target record ID
              await supabase
                .from('import_staging')
                .update({
                  processed: true,
                  processed_at: new Date().toISOString(),
                  target_record_id: insertResult.id
                })
                .eq('id', record.id)
            } else {
              importStats.failed++
              importStats.errors.push({
                row: record.row_number,
                error: insertResult.error
              })
            }
          }
        }

        // Update progress
        const progress = Math.round(((i + batch.length) / stagingRecords.length) * 100)
        await supabase
          .from('data_imports')
          .update({
            processed_records: i + batch.length,
            successful_records: importStats.imported,
            failed_records: importStats.failed,
            skipped_duplicates: importStats.skipped
          })
          .eq('id', importId)
      }

      // Final update
      await updateImportStatus(importId, 'completed', {
        processed_records: stagingRecords.length,
        successful_records: importStats.imported,
        failed_records: importStats.failed,
        skipped_duplicates: importStats.skipped,
        completed_at: new Date().toISOString(),
        processing_time_ms: Date.now() - new Date(importRecord.started_at).getTime()
      })

      // Log completion
      await supabase
        .from('import_audit_log')
        .insert({
          import_id: importId,
          action: 'Import completed',
          action_type: 'success',
          details: importStats
        })

      return NextResponse.json({
        success: true,
        status: 'completed',
        imported: importStats.imported,
        skipped: importStats.skipped,
        failed: importStats.failed,
        errors: importStats.errors,
        warnings: transformWarnings
      })

    } catch (processError) {
      console.error('Processing error:', processError)
      
      // Update status to failed
      await updateImportStatus(importId, 'failed', {
        error_summary: processError.message,
        completed_at: new Date().toISOString()
      })

      // Log error
      await supabase
        .from('import_audit_log')
        .insert({
          import_id: importId,
          action: 'Import failed',
          action_type: 'error',
          details: { error: processError.message }
        })

      return NextResponse.json({
        success: false,
        error: 'Import processing failed',
        message: processError.message
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Process error:', error)
    
    return NextResponse.json(
      { 
        error: 'Processing failed',
        message: error.message 
      },
      { status: 500 }
    )
  }
}

// Helper function to update import status
async function updateImportStatus(importId, status, updates = {}) {
  return supabase
    .from('data_imports')
    .update({
      status,
      ...updates
    })
    .eq('id', importId)
}

// Helper function to insert new record
async function insertNewRecord(entityType, barbershopId, data) {
  try {
    let table, recordData
    
    switch (entityType) {
      case 'customers':
        table = 'customers'
        recordData = {
          barbershop_id: barbershopId,
          name: data.name,
          email: data.email,
          phone: data.phone,
          address: data.address,
          birthdate: data.birthdate,
          notes: data.notes,
          tags: data.tags,
          preferences: data.custom_fields || {},
          created_at: data.created_at || new Date().toISOString()
        }
        break
      
      case 'appointments':
        table = 'appointments'
        recordData = {
          barbershop_id: barbershopId,
          customer_id: data.customer_id, // This needs to be resolved
          service_id: data.service_id, // This needs to be resolved
          barber_id: data.barber_id, // This needs to be resolved
          appointment_date: data.date,
          appointment_time: data.time,
          duration: data.duration,
          price: data.price,
          status: data.status || 'confirmed',
          notes: data.notes,
          created_at: data.created_at || new Date().toISOString()
        }
        break
      
      case 'services':
        table = 'services'
        recordData = {
          barbershop_id: barbershopId,
          name: data.name,
          description: data.description,
          duration: data.duration,
          price: data.price,
          category: data.category,
          active: data.active !== false,
          created_at: new Date().toISOString()
        }
        break
      
      case 'barbers':
        table = 'barbershop_staff'
        recordData = {
          barbershop_id: barbershopId,
          full_name: data.name,
          email: data.email,
          phone: data.phone,
          profile_photo_url: data.profile_photo_url,
          bio: data.bio,
          specialties: data.specialties,
          commission_rate: data.commission_rate,
          role: 'barber',
          is_active: data.active !== false,
          hire_date: data.hire_date,
          license_number: data.license_number,
          instagram_handle: data.instagram,
          years_experience: data.years_experience,
          schedule: data.schedule,
          created_at: data.created_at || new Date().toISOString()
        }
        break
      
      default:
        throw new Error(`Unknown entity type: ${entityType}`)
    }
    
    const { data: inserted, error } = await supabase
      .from(table)
      .insert(recordData)
      .select()
      .single()
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    return { success: true, id: inserted.id }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

// Helper function to update existing record
async function updateExistingRecord(entityType, recordId, data) {
  const table = entityType === 'customers' ? 'customers' : 
                entityType === 'appointments' ? 'appointments' : 
                entityType === 'services' ? 'services' : null
  
  if (!table) {
    throw new Error(`Unknown entity type: ${entityType}`)
  }
  
  const { error } = await supabase
    .from(table)
    .update({
      ...data,
      updated_at: new Date().toISOString()
    })
    .eq('id', recordId)
  
  if (error) {
    throw error
  }
}

// Helper function to merge records
async function mergeRecords(entityType, existingId, incomingData) {
  // Fetch existing record
  const table = entityType === 'customers' ? 'customers' : 
                entityType === 'appointments' ? 'appointments' : 
                entityType === 'services' ? 'services' : null
  
  const { data: existing, error: fetchError } = await supabase
    .from(table)
    .select('*')
    .eq('id', existingId)
    .single()
  
  if (fetchError) {
    throw fetchError
  }
  
  // Merge data (preserve existing non-null values)
  const merged = { ...existing }
  for (const [key, value] of Object.entries(incomingData)) {
    if (value !== null && value !== undefined && value !== '') {
      if (!merged[key] || merged[key] === '') {
        merged[key] = value
      }
    }
  }
  
  // Update with merged data
  const { error: updateError } = await supabase
    .from(table)
    .update({
      ...merged,
      updated_at: new Date().toISOString()
    })
    .eq('id', existingId)
  
  if (updateError) {
    throw updateError
  }
}